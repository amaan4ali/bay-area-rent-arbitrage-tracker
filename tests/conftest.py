"""Shared pytest fixtures."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from db.models import Base


@pytest.fixture()
def in_memory_session():
    """Create an in-memory SQLite session for fast tests.

    Note: PostgreSQL-specific features (e.g. ``ON CONFLICT``) are not available
    in SQLite, so tests that exercise upsert logic use monkeypatched helpers
    instead.
    """
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    _Session = sessionmaker(bind=engine)
    session = _Session()
    yield session
    session.close()
