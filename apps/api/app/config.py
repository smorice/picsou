from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Robin IA API"
    environment: str = "development"
    postgres_dsn: str = "postgresql+psycopg://picsou:picsou@postgres:5432/picsou"
    redis_url: str = "redis://redis:6379/0"
    kill_switch_default: bool = False
    jwt_secret_key: str = "development-only-change-me"
    data_encryption_key: str = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 7
    password_reset_ttl_minutes: int = 20
    max_login_attempts: int = 5
    login_lockout_minutes: int = 15
    public_base_url: str = "http://localhost"
    bootstrap_admin_email: str | None = None
    bootstrap_admin_password: str | None = None
    smtp_host: str | None = "ssl0.ovh.net"
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_from_name: str = "Robin IA"
    smtp_starttls: bool = True
    smtp_use_ssl: bool = False
    smtp_timeout_seconds: int = 10
    mfa_email_code_ttl_minutes: int = 10

    # OAuth providers
    google_client_id: str | None = None
    google_client_secret: str | None = None
    franceconnect_client_id: str | None = None
    franceconnect_client_secret: str | None = None
    oauth_state_ttl_seconds: int = 300


settings = Settings()
