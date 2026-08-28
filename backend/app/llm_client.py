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
    Returns the assistant's reply text, stripped. Raises on failure - callers
    already handle exceptions from the old direct groq_client calls the same way.
    """
    if settings.LLM_PROVIDER == "bedrock":
        return _bedrock_chat(messages, max_tokens, temperature)
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

# Meta Llama 3 70B Instruct on Bedrock hard-caps output at 2048 tokens - found
# live (a real ValidationException) when path_service's 6000-token request
# for milestone-sequencing hit this. Clamping here means every caller keeps
# working, but the tradeoff is real: prompts written assuming Groq's higher
# ceiling (path generation especially) can come back truncated on this model.
# Lighter prompts (coach practice/project, assistant replies) fit comfortably.
BEDROCK_MAX_OUTPUT_TOKENS = 2048


def _get_bedrock_runtime():
    global _bedrock_runtime
    if _bedrock_runtime is None:
        import boto3
        _bedrock_runtime = boto3.client("bedrock-runtime", region_name=settings.AWS_REGION)
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
