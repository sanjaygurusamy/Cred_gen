import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine, text
from app.core.config import settings

@pytest.mark.integration
def test_postgresql_live_persistence_and_restart():
    """
    Authentic end-to-end persistence test against the live PostgreSQL container:
    1. Connects to PostgreSQL.
    2. Creates a dedicated verification table.
    3. Inserts a test record.
    4. Disposes the engine and closes all pool connections (simulating service restart).
    5. Reconnects via a fresh engine and retrieves the record.
    6. Confirms values match exactly.
    """
    test_id = str(uuid.uuid4())
    test_timestamp = datetime.now(timezone.utc).isoformat()
    test_payload = "CampusCarbon AI Phase 1 Verification Record"

    # Step 1: Initial connection & table creation
    engine1 = create_engine(settings.database_url)
    try:
        with engine1.begin() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS _phase1_persistence_check (
                    id VARCHAR(64) PRIMARY KEY,
                    payload TEXT NOT NULL,
                    created_at VARCHAR(64) NOT NULL
                )
            """))
            conn.execute(
                text("INSERT INTO _phase1_persistence_check (id, payload, created_at) VALUES (:id, :payload, :created_at)"),
                {"id": test_id, "payload": test_payload, "created_at": test_timestamp}
            )
    finally:
        # Step 2: Dispose engine 1 completely (all sockets and pool closed)
        engine1.dispose()

    # Step 3: Reconnect via brand-new engine (simulating service restart)
    engine2 = create_engine(settings.database_url)
    try:
        with engine2.connect() as conn:
            result = conn.execute(
                text("SELECT id, payload, created_at FROM _phase1_persistence_check WHERE id = :id"),
                {"id": test_id}
            ).fetchone()

            assert result is not None, "Record was not persisted across engine restart!"
            assert result[0] == test_id
            assert result[1] == test_payload
            assert result[2] == test_timestamp

            # Clean up verification table
            conn.execute(text("DROP TABLE IF EXISTS _phase1_persistence_check"))
            conn.commit()
    finally:
        engine2.dispose()
