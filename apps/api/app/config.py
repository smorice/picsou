from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Picsou IA API"
    environment: str = "development"
    postgres_dsn: str = "postgresql+psycopg://picsou:picsou@postgres:5432/picsou"
    redis_url: str = "redis://redis:6379/0"
    kill_switch_default: bool = False


settings = Settings()
