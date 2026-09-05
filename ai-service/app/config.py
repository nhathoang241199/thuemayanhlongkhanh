from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://app:app@localhost:5432/app"
    minimax_api_key: str = ""
    minimax_model: str = "MiniMax-M2.5"
    minimax_base_url: str = "https://api.minimax.io/v1"
    minimax_group_id: str = ""
    frontend_url: str = "http://localhost:3001"
    ai_service_token: str = "dev-secret"
    cors_origins: str = "http://localhost:3001"
    history_limit: int = 20
    use_llm_agent: bool = False

    @property
    def agent_enabled(self) -> bool:
        return bool(self.minimax_api_key)

    @property
    def llm_routing_enabled(self) -> bool:
        return self.use_llm_agent and self.agent_enabled

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
