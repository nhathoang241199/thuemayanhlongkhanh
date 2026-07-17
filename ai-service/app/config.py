from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://app:app@localhost:5432/app"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-haiku-4-5"
    openai_api_key: str = ""
    openai_embedding_model: str = "text-embedding-3-small"
    policy_rag_enabled: bool = True
    policy_rag_top_k: int = 3
    frontend_url: str = "http://localhost:3001"
    ai_service_token: str = "dev-secret"
    cors_origins: str = "http://localhost:3001"
    history_limit: int = 20

    @property
    def rag_enabled(self) -> bool:
        return self.policy_rag_enabled and bool(self.openai_api_key)

    @property
    def agent_enabled(self) -> bool:
        return bool(self.anthropic_api_key)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
