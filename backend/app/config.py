from pydantic_settings import BaseSettings, SettingsConfigDict

import os

class Settings(BaseSettings):
    SUPABASE_DB_URL: str = ""
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    # Resolve .env relative to this file's location to be robust regardless of cwd
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"), 
        env_file_encoding='utf-8', 
        extra='ignore'
    )

settings = Settings()
