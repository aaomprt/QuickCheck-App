from typing import Any
from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    APP_NAME: str = "QuickCheck Backend"
    API_V1_PREFIX: str = "/api/v1"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "https://quickcheck-project.vercel.app"]
    DATABASE_URL: str
    LINE_ID_HMAC_SECRET: str
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_BUCKET: str

    # Supabase
    @field_validator("DATABASE_URL", mode="before")
    def assemble_db_connection(cls, v: str | None) -> Any:
        if isinstance(v, str) and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()