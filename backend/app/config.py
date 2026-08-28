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
    AWS_REGION: str = "ap-south-1"
    BEDROCK_MODEL_ID: str = "meta.llama3-70b-instruct-v1:0"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

supabase_client: Client = create_client(
    settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY
)

groq_client = Groq(api_key=settings.GROQ_API_KEY)
