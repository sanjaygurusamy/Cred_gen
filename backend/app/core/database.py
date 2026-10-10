import logging
from typing import Generator, Tuple
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger("campuscarbon.database")

Base = declarative_base()

# Lazy engine initialization helper to prevent crashes if DB service or driver is offline
_engine = None
_session_factory = None

def get_engine():
    global _engine
    if _engine is None:
        try:
            # Use connect_args with short timeout for health checks if supported
            connect_args = {}
            if "postgresql" in settings.database_url:
                connect_args = {"connect_timeout": 3}
            elif "sqlite" in settings.database_url:
                connect_args = {"timeout": 3}

            _engine = create_engine(
                settings.database_url,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10,
                echo=False,
                connect_args=connect_args
            )
        except Exception as exc:
            logger.error(f"Failed to initialize SQLAlchemy engine: {type(exc).__name__}")
            raise
    return _engine

def get_session_factory():
    global _session_factory
    if _session_factory is None:
        eng = get_engine()
        _session_factory = sessionmaker(autocommit=False, autoflush=False, bind=eng)
    return _session_factory

def get_db() -> Generator[Session, None, None]:
    """Dependency that yields a database session and ensures cleanup."""
    factory = get_session_factory()
    db = factory()
    try:
        yield db
    finally:
        db.close()

def check_database_health() -> Tuple[bool, str, str]:
    """
    Performs an authentic ping to the configured database.
    
    Returns:
        (is_connected: bool, engine_type: str, message: str)
    
    Security:
        Never exposes database connection strings, credentials, or internal stack traces.
    """
    engine_type = "unknown"
    try:
        raw_prefix = settings.database_url.split("://")[0]
        engine_type = raw_prefix.split("+")[0]
    except Exception:
        engine_type = "postgresql"

    try:
        eng = get_engine()
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, engine_type, "Database connection operational."
    except Exception as exc:
        err_type = type(exc).__name__
        logger.warning(f"Database health check failed: {err_type}")
        
        # User-friendly diagnostic without secrets
        if "ModuleNotFoundError" in err_type or "NoSuchModuleError" in err_type:
            msg = f"Database driver for {engine_type} is not installed."
        elif "OperationalError" in err_type:
            msg = f"Database service at {settings.database_url.split('@')[-1] if '@' in settings.database_url else 'target host'} is unreachable."
        else:
            msg = f"Database connectivity check failed ({err_type})."
            
        return False, engine_type, msg
