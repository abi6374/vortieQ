from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict
from supabase import create_client, Client
from groq import Groq


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_JWT_SECRET: str
    GROQ_API_KEY: str

    # Chat model used for profile extraction, path sequencing, explanations and
    # the assistant. Override via GROQ_MODEL in .env if Groq retires this one
    # (check available models with `groq_client.models.list()`).
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    # Which LLM backend app.llm_client routes every chat completion through.
    # "groq" (default) needs nothing extra. "bedrock" uses AWS Bedrock's
    # Converse API via the EC2 instance's IAM role - no AWS access keys are
    # read from .env on purpose; boto3's default credential chain picks up
    # the instance role automatically, so there's nothing secret to leak.
    LLM_PROVIDER: str = "groq"  # "groq" | "bedrock"
    # us-east-1 (not ap-south-1, where the EC2 box actually runs) - Bedrock
    # model availability varies a lot by region and ap-south-1's is limited.
    # A boto3 client can call any AWS region regardless of where the calling
    # instance lives, so this is independent of EC2's own region.
    AWS_REGION: str = "us-east-1"
    # amazon.nova-pro-v1:0, not meta.llama3-70b-instruct-v1:0: switched after a
    # real incident (see PROGRESS_TRACKER.md Round 11/13) where Llama 3 70B's
    # on-demand throughput quota on this account throttled 100% of real
    # path-generation attempts. Live-tested both head to head on this exact
    # account: Nova Pro survived 9/9 rapid sequential calls with zero
    # throttling (Llama 3 70B fails under that exact load), supports at least
    # 8192 output tokens (Llama 3 70B hard-caps at 2048), responds faster
    # (~0.6-1.3s vs ~2.2s), and returns clean JSON with no markdown fences.
    BEDROCK_MODEL_ID: str = "amazon.nova-pro-v1:0"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

supabase_client: Client = create_client(
    settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY
)

groq_client = Groq(api_key=settings.GROQ_API_KEY)
