from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_secret_key: str = "change_me"
    access_token_expire_minutes: int = 120
    database_url: str = "postgresql+psycopg://nayonne_user:password@db:5432/nayonne"
    redis_url: str = "redis://redis:6379/0"
    minio_bucket: str = "media"
    nayonne_base_path: str = "/nayonne"
    frontend_origin: str = "http://localhost:3002"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
