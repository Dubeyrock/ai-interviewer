from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Interviewer"
    api_prefix: str = "/api"

    # Auth
    jwt_secret: str = "change-me-in-env"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8
    refresh_token_expire_days: int = 30

    # AI
    groq_api_key: str | None = None
    groq_model: str = "llama-3.1-70b-versatile"
    groq_whisper_model: str = "whisper-large-v3-turbo"
    elevenlabs_api_key: str | None = None
    elevenlabs_model_id: str = "eleven_multilingual_v2"

    # Default fallback voice
    elevenlabs_voice_id: str = "21m00Tcm4TlvDq8ikWAM"

    # HR Priya (female)
    elevenlabs_voice_female_english: str = "21m00Tcm4TlvDq8ikWAM"
    elevenlabs_voice_female_hindi: str = "21m00Tcm4TlvDq8ikWAM"

    # HR Amit (male)
    elevenlabs_voice_male_english: str = "EXAVITQu4vr4xnSDxMaL"
    elevenlabs_voice_male_hindi: str = "pNInz6obpgDQG8FmgVkZ"

    # Google Calendar OAuth
    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_refresh_token: str | None = None
    calendar_id: str = "primary"

    # Security
    recaptcha_secret_key: str | None = None

    # Email
    smtp_host: str = "localhost"
    smtp_port: int = 25
    smtp_user: str | None = None
    smtp_pass: str | None = None
    smtp_starttls: bool = False
    smtp_use_ssl: bool = False
    sendgrid_api_key: str | None = None
    resend_api_key: str | None = None
    smtp_from: str = "PratibhaAI <onboarding@resend.dev>"
    max_login_attempts: int = 5
    session_timeout_minutes: int = 30

    mongo_url: str | None = None
    redis_url: str | None = None
    aws_bucket: str | None = None
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_region: str = "ap-south-1"
    chroma_db_path: str = "./storage/chroma_db"

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
    ]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    def get_voice_id(self, gender: str, language: str) -> str:
        gender = (gender or "female").strip().lower()
        language = (language or "english").strip().lower()

        if gender == "male":
            if language == "hindi":
                return self.elevenlabs_voice_male_hindi or self.elevenlabs_voice_male_english or self.elevenlabs_voice_id
            return self.elevenlabs_voice_male_english or self.elevenlabs_voice_id

        if language == "hindi":
            return self.elevenlabs_voice_female_hindi or self.elevenlabs_voice_female_english or self.elevenlabs_voice_id
        return self.elevenlabs_voice_female_english or self.elevenlabs_voice_id


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()