"""
Unified LLM entry point — every service calls chat_completion() here instead
of talking to Groq or Bedrock directly, so switching providers is a single
config flag (settings.LLM_PROVIDER) rather than a per-file rewrite.

Bedrock auth deliberately uses the EC2 instance's IAM role (boto3's default
credential chain), not static keys in .env - nothing to leak, nothing new to
add to the .env file. This only works when actually running on an EC2
instance with a role attached that has bedrock:InvokeModel permission; see
docs/deployment_guide.md for the one-time AWS console setup.
"""

from app.config import groq_client, settings


def chat_completion(messages: list, max_tokens: int = 1500, temperature: float = 0.2) -> str:
    """
    messages: standard [{"role": "system"|"user"|"assistant", "content": str}, ...]
    Returns the assistant's reply text, stripped. Raises only if every
    available provider fails - callers already handle exceptions from the
    old direct groq_client calls the same way.
    """
    if settings.LLM_PROVIDER == "bedrock":
        try:
            return _bedrock_chat(messages, max_tokens, temperature)
        except Exception as e:
            # Real incident: this account's Bedrock on-demand throughput quota
            # throttles even with 8-attempt adaptive retry (see the comment on
            # _get_bedrock_runtime below and PROGRESS_TRACKER.md Round 11),
            # which was surfacing as hard 500s on path generation in
            # production. GROQ_API_KEY is a REQUIRED setting (see config.py)
            # regardless of LLM_PROVIDER, so Groq is always fully configured
            # here - falling back to it turns an infra-side quota problem into
            # a real, successful completion from a different real provider,
            # rather than an error the learner can't do anything about. This
            # is not a fabricated result: Groq actually generates the
            # response for real, same as it does when LLM_PROVIDER="groq".
            # Only Bedrock failures fall back - if Groq also fails, that
            # exception propagates normally (both real providers failed; no
            # data to fabricate in its place).
            print(
                f"[llm_client] Bedrock call failed ({type(e).__name__}: {e}); "
                "falling back to Groq for this request",
                flush=True,
            )
            return _groq_chat(messages, max_tokens, temperature)
    return _groq_chat(messages, max_tokens, temperature)


def _groq_chat(messages: list, max_tokens: int, temperature: float) -> str:
    # reasoning_effort is a Groq-specific knob (their gpt-oss reasoning models
    # bill chain-of-thought against max_tokens before any answer - see the
    # tracker note on this). Kept low and only ever passed to Groq.
    response = groq_client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
        reasoning_effort="low",
    )
    return (response.choices[0].message.content or "").strip()


_bedrock_runtime = None

# Now amazon.nova-pro-v1:0 (see config.py), not meta.llama3-70b-instruct-v1:0
# - Llama 3 70B hard-capped output at 2048 tokens (a real ValidationException
# hit when path_service's 6000-token milestone-sequencing request exceeded
# it). Live-tested Nova Pro up to 8192 with no error, so the clamp is raised
# to match; re-verify this if BEDROCK_MODEL_ID is ever changed again - the cap
# is genuinely model-specific, not a Bedrock-wide constant.
BEDROCK_MAX_OUTPUT_TOKENS = 8192


def _get_bedrock_runtime():
    global _bedrock_runtime
    if _bedrock_runtime is None:
        import boto3
        from botocore.config import Config

        # 'adaptive' mode is AWS's own recommended fix for ThrottlingException:
        # it client-side rate-limits based on observed throttling instead of
        # just blindly retrying, and backs off further under sustained load.
        # Bumped max_attempts well above boto3's default (3) - a real incident
        # (see PROGRESS_TRACKER.md Round 11) showed the default gives up too
        # fast for this account's on-demand throughput quota, failing 100% of
        # real path-generation requests. Even at 8 attempts this account's
        # quota has still been observed to exhaust the budget under load -
        # chat_completion() above falls back to Groq when that happens, so
        # this retry config is the first line of defense (avoids an
        # unnecessary provider switch for a transient blip), not the only one.
        # An AWS Service Quotas increase request is the fix for Bedrock's
        # throughput itself, if Bedrock-specific latency/quality is wanted
        # back as the primary path.
        _bedrock_runtime = boto3.client(
            "bedrock-runtime",
            region_name=settings.AWS_REGION,
            config=Config(retries={"max_attempts": 8, "mode": "adaptive"}),
        )
    return _bedrock_runtime


def _bedrock_chat(messages: list, max_tokens: int, temperature: float) -> str:
    """
    Uses Bedrock's Converse API - one request/response shape that works the
    same way across model families (Anthropic, Meta, Amazon, ...), so
    switching BEDROCK_MODEL_ID doesn't require touching this function.
    """
    client = _get_bedrock_runtime()
    system = [{"text": m["content"]} for m in messages if m["role"] == "system"]
    convo = [
        {"role": m["role"], "content": [{"text": m["content"]}]}
        for m in messages if m["role"] != "system"
    ]
    response = client.converse(
        modelId=settings.BEDROCK_MODEL_ID,
        system=system,
        messages=convo,
        inferenceConfig={
            "maxTokens": min(max_tokens, BEDROCK_MAX_OUTPUT_TOKENS),
            "temperature": temperature,
        },
    )
    return response["output"]["message"]["content"][0]["text"].strip()
