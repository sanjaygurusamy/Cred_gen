import os
from functools import lru_cache

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    HAS_PYDANTIC_SETTINGS = True
except ImportError:
    from pydantic import BaseModel
    HAS_PYDANTIC_SETTINGS = False

if HAS_PYDANTIC_SETTINGS:
    class Settings(BaseSettings):
        model_config = SettingsConfigDict(
            env_file=(".env", "../.env"),
            env_file_encoding="utf-8",
            extra="ignore"
        )

        app_name: str = "CampusCarbon AI"
        app_version: str = "2.0.0"
        environment: str = "development"
        debug: bool = True

        # Server settings
        backend_host: str = "127.0.0.1"
        backend_port: int = 8000
        secret_key: str = "change-in-production-campus-carbon-secure-key-32chars"

        # Database settings
        database_url: str = os.getenv("DATABASE_URL", "postgresql+psycopg://campuscarbon:campuscarbon_dev_password@127.0.0.1:5432/campuscarbon_db")

        # AI / LLM Configuration
        llm_provider: str = "openai"
        llm_model: str = "gpt-4o-mini"
        llm_api_key: str = ""
        llm_base_url: str = "https://api.openai.com/v1"
        llm_timeout_seconds: int = 15
        llm_enable_cache: bool = True

        # Institutional Defaults
        default_campus_id: str = "green-tech-univ-01"
        default_campus_code: str = "GTU-MAIN"
else:
    from pydantic import BaseModel, Field

    class Settings(BaseModel):
        app_name: str = "CampusCarbon AI"
        app_version: str = "2.0.0"
        environment: str = os.getenv("ENVIRONMENT", "development")
        debug: bool = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")

        # Server settings
        backend_host: str = os.getenv("BACKEND_HOST", "127.0.0.1")
        backend_port: int = int(os.getenv("BACKEND_PORT", "8000"))
        secret_key: str = os.getenv("SECRET_KEY", "change-in-production-campus-carbon-secure-key-32chars")

        # Database settings
        database_url: str = os.getenv("DATABASE_URL", "postgresql+psycopg://campuscarbon:campuscarbon_dev_password@127.0.0.1:5432/campuscarbon_db")

        # AI / LLM Configuration
        llm_provider: str = os.getenv("LLM_PROVIDER", "openai")
        llm_model: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
        llm_api_key: str = os.getenv("LLM_API_KEY", "")
        llm_base_url: str = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
        llm_timeout_seconds: int = int(os.getenv("LLM_TIMEOUT_SECONDS", "15"))
        llm_enable_cache: bool = os.getenv("LLM_ENABLE_CACHE", "true").lower() in ("true", "1", "yes")

        # Institutional Defaults
        default_campus_id: str = os.getenv("DEFAULT_CAMPUS_ID", "green-tech-univ-01")
        default_campus_code: str = os.getenv("DEFAULT_CAMPUS_CODE", "GTU-MAIN")

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
