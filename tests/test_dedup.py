"""Tests for deduplication / upsert logic."""

from __future__ import annotations

from datetime import datetime
from unittest.mock import MagicMock, patch, call

import pytest

from db.crud import upsert_listing, bulk_upsert_listings
from db.models import Listing


# ── Unit tests (mock-based, no real DB) ───────────────────────────────────────

SAMPLE_DATA = {
    "url": "https://example.com/listing/123",
    "source": "craigslist",
    "zip_code": "94110",
    "price": 2500.0,
    "bedrooms": 2,
    "bathrooms": 1.0,
    "sqft": 800,
    "description": "Nice apt",
    "scraped_at": datetime(2025, 1, 15, 12, 0, 0),
    "listing_date": None,
}


class TestUpsertListing:
    """Verify upsert_listing builds the correct ON CONFLICT statement."""

    @patch("db.crud.inspect")
    @patch("db.crud.pg_insert")
    def test_calls_on_conflict_do_update(self, mock_pg_insert, mock_inspect):
        """upsert_listing should issue a PostgreSQL INSERT … ON CONFLICT DO UPDATE."""
        # Set up the mock chain: pg_insert(Listing).values(**data) -> stmt
        mock_stmt = MagicMock()
        mock_pg_insert.return_value.values.return_value = mock_stmt
        mock_stmt.on_conflict_do_update.return_value = mock_stmt

        # Mock inspect to return columns
        mock_col_id = MagicMock(key="id")
        mock_col_url = MagicMock(key="url")
        mock_col_price = MagicMock(key="price")
        mock_col_source = MagicMock(key="source")
        mock_inspect.return_value.columns = [mock_col_id, mock_col_url, mock_col_price, mock_col_source]

        session = MagicMock()
        session.query.return_value.filter_by.return_value.one.return_value = MagicMock()

        upsert_listing(session, SAMPLE_DATA)

        mock_pg_insert.assert_called_once_with(Listing)
        mock_stmt.on_conflict_do_update.assert_called_once()
        session.execute.assert_called_once()
        session.commit.assert_called_once()

    @patch("db.crud.inspect")
    @patch("db.crud.pg_insert")
    def test_upsert_excludes_id_and_url_from_update(self, mock_pg_insert, mock_inspect):
        """On conflict, the update set should NOT include id or url."""
        mock_stmt = MagicMock()
        mock_pg_insert.return_value.values.return_value = mock_stmt
        mock_stmt.on_conflict_do_update.return_value = mock_stmt

        # Mock inspect columns
        mock_col_id = MagicMock(key="id")
        mock_col_url = MagicMock(key="url")
        mock_col_price = MagicMock(key="price")
        mock_col_source = MagicMock(key="source")
        mock_col_zip = MagicMock(key="zip_code")
        mock_inspect.return_value.columns = [
            mock_col_id, mock_col_url, mock_col_price, mock_col_source, mock_col_zip,
        ]

        session = MagicMock()
        session.query.return_value.filter_by.return_value.one.return_value = MagicMock()

        upsert_listing(session, SAMPLE_DATA)

        # Grab the set_ kwarg passed to on_conflict_do_update
        call_kwargs = mock_stmt.on_conflict_do_update.call_args
        set_dict = call_kwargs.kwargs.get("set_") or call_kwargs[1].get("set_")

        assert "id" not in set_dict
        assert "url" not in set_dict
        assert "price" in set_dict
        assert "source" in set_dict
        assert "zip_code" in set_dict

    @patch("db.crud.inspect")
    @patch("db.crud.pg_insert")
    def test_upsert_queries_back_by_url(self, mock_pg_insert, mock_inspect):
        """After upserting, the function should query the listing by URL."""
        mock_stmt = MagicMock()
        mock_pg_insert.return_value.values.return_value = mock_stmt
        mock_stmt.on_conflict_do_update.return_value = mock_stmt
        mock_inspect.return_value.columns = []

        expected_listing = MagicMock()
        session = MagicMock()
        session.query.return_value.filter_by.return_value.one.return_value = expected_listing

        result = upsert_listing(session, SAMPLE_DATA)

        session.query.return_value.filter_by.assert_called_once_with(url=SAMPLE_DATA["url"])
        assert result is expected_listing


class TestBulkUpsert:
    """Test bulk_upsert_listings."""

    @patch("db.crud.pg_insert")
    def test_empty_list_returns_zero(self, mock_pg_insert):
        session = MagicMock()
        result = bulk_upsert_listings(session, [])
        assert result == 0
        mock_pg_insert.assert_not_called()

    @patch("db.crud.inspect")
    @patch("db.crud.pg_insert")
    def test_bulk_upsert_calls_execute(self, mock_pg_insert, mock_inspect):
        mock_stmt = MagicMock()
        mock_pg_insert.return_value.values.return_value = mock_stmt
        mock_stmt.on_conflict_do_update.return_value = mock_stmt
        mock_inspect.return_value.columns = []

        session = MagicMock()
        session.execute.return_value.rowcount = 3

        rows = [
            {
                "url": f"https://example.com/{i}",
                "source": "craigslist",
                "zip_code": "94110",
                "price": 2000.0 + i * 100,
                "bedrooms": 1,
                "bathrooms": 1.0,
                "sqft": 600,
                "description": f"Listing {i}",
                "scraped_at": datetime.utcnow(),
                "listing_date": None,
            }
            for i in range(3)
        ]

        result = bulk_upsert_listings(session, rows)
        assert result == 3
        session.execute.assert_called_once()
        session.commit.assert_called_once()

    @patch("db.crud.inspect")
    @patch("db.crud.pg_insert")
    def test_bulk_upsert_passes_all_rows(self, mock_pg_insert, mock_inspect):
        """Verify all rows are passed to the INSERT statement."""
        mock_stmt = MagicMock()
        mock_pg_insert.return_value.values.return_value = mock_stmt
        mock_stmt.on_conflict_do_update.return_value = mock_stmt
        mock_inspect.return_value.columns = []

        session = MagicMock()
        session.execute.return_value.rowcount = 2

        rows = [
            {"url": "https://a.com/1", "source": "craigslist", "zip_code": "94110",
             "price": 2000, "bedrooms": 1, "bathrooms": 1, "sqft": 500,
             "description": "A", "scraped_at": datetime.utcnow(), "listing_date": None},
            {"url": "https://a.com/2", "source": "craigslist", "zip_code": "94110",
             "price": 2200, "bedrooms": 1, "bathrooms": 1, "sqft": 550,
             "description": "B", "scraped_at": datetime.utcnow(), "listing_date": None},
        ]

        result = bulk_upsert_listings(session, rows)
        assert result == 2
        mock_pg_insert.return_value.values.assert_called_once_with(rows)
