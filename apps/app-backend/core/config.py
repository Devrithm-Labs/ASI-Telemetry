import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from the backend folder
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")


class Settings:
    # Server settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8080"))

    # PostgreSQL database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "asi_telemetry")
    POSTGRES_SSL: bool = os.getenv("POSTGRES_SSL", "false").lower() in ("true", "1")

    @property
    def database_url_resolved(self) -> str:
        """Returns normalized SQLAlchemy PostgreSQL connection string using pg8000 driver."""
        raw_url = (self.DATABASE_URL or "").strip()
        if raw_url:
            if raw_url.startswith("postgres://"):
                raw_url = "postgresql+pg8000://" + raw_url[len("postgres://"):]
            elif raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+"):
                raw_url = "postgresql+pg8000://" + raw_url[len("postgresql://"):]
            elif raw_url.startswith("postgresql+psycopg2://"):
                raw_url = "postgresql+pg8000://" + raw_url[len("postgresql+psycopg2://"):]
            return raw_url
        ssl_suffix = "?sslmode=require" if self.POSTGRES_SSL else ""
        return (
            f"postgresql+pg8000://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}{ssl_suffix}"
        )

    # Authentication settings
    AUTH_SECRET_KEY: str = os.getenv(
        "AUTH_SECRET_KEY",
        "development-only-change-this-secret-before-deploying",
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
    TOKEN_ISSUER: str = os.getenv("TOKEN_ISSUER", "asi-telemetry")
    TOKEN_AUDIENCE: str = os.getenv("TOKEN_AUDIENCE", "asi-telemetry-api")

    # Google OAuth settings
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv(
        "GOOGLE_REDIRECT_URI",
        "https://asi-telemetry-backend.vercel.app/api/auth/oauth/callback",
    )
    ALLOWED_REDIRECT_URIS: list[str] = list(
        set(
            [
                uri.strip().rstrip("/")
                for uri in os.getenv(
                    "ALLOWED_REDIRECT_URIS",
                    "https://asi-telemetry-backend.vercel.app/api/auth/oauth/callback,http://localhost:8080/api/auth/oauth/callback,http://127.0.0.1:8080/api/auth/oauth/callback",
                ).split(",")
                if uri.strip()
            ]
            + [
                os.getenv(
                    "GOOGLE_REDIRECT_URI",
                    "https://asi-telemetry-backend.vercel.app/api/auth/oauth/callback",
                ).strip().rstrip("/")
            ]
        )
    )
    FRONTEND_BASE_URL: str = os.getenv("FRONTEND_BASE_URL", "https://asi-telemetry.vercel.app")


settings = Settings()
