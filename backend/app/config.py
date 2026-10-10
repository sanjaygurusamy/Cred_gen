import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseModel):
    app_name: str = "CampusCarbon AI"
    version: str = "1.0.0"
    
    # LLM Settings
    llm_provider: str = os.getenv("LLM_PROVIDER", "openai").lower()
    llm_model: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    llm_api_key: str = os.getenv("LLM_API_KEY", "").strip()
    llm_base_url: str = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
    llm_timeout_seconds: int = int(os.getenv("LLM_TIMEOUT_SECONDS", "15"))
    llm_enable_cache: bool = os.getenv("LLM_ENABLE_CACHE", "true").lower() in ("true", "1", "yes")
    
    # Database Settings
    database_url: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/campus_carbon.db")
    
    # Campus defaults
    default_campus_id: str = os.getenv("DEFAULT_CAMPUS_ID", "green-tech-univ-01")
    debug: bool = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")

settings = Settings()
