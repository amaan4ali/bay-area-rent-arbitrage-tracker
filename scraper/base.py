"""Base scraper with rotating User-Agent, retry logic, and rate limiting."""

from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from typing import Any, Generator

import requests
from bs4 import BeautifulSoup
from fake_useragent import UserAgent
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from db.config import SCRAPE_MAX_RETRIES, SCRAPE_RATE_LIMIT_SECONDS, SCRAPE_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)

ua = UserAgent(fallback="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")


class BaseScraper(ABC):
    """Abstract base class for rental listing scrapers."""

    source_name: str = "unknown"

    def __init__(self) -> None:
        self._session = requests.Session()
        self._last_request_time: float = 0.0

    # ── HTTP helpers ──────────────────────────────────────────────────────

    def _rate_limit(self) -> None:
        elapsed = time.time() - self._last_request_time
        if elapsed < SCRAPE_RATE_LIMIT_SECONDS:
            time.sleep(SCRAPE_RATE_LIMIT_SECONDS - elapsed)

    @retry(
        stop=stop_after_attempt(SCRAPE_MAX_RETRIES),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type((requests.ConnectionError, requests.Timeout)),
        reraise=True,
    )
    def fetch(self, url: str) -> BeautifulSoup:
        """Fetch a URL with rate limiting, rotating UA, and retries."""
        self._rate_limit()
        headers = {"User-Agent": ua.random}
        logger.debug("GET %s", url)
        resp = self._session.get(url, headers=headers, timeout=SCRAPE_TIMEOUT_SECONDS)
        self._last_request_time = time.time()
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "lxml")

    # ── Interface ─────────────────────────────────────────────────────────

    @abstractmethod
    def build_search_url(self, zip_code: str, offset: int = 0) -> str:
        """Return the search-results URL for a given zip and page offset."""

    @abstractmethod
    def parse_listing_page(self, soup: BeautifulSoup, zip_code: str) -> list[dict[str, Any]]:
        """Parse a search-results page into a list of standardized listing dicts."""

    @abstractmethod
    def has_next_page(self, soup: BeautifulSoup) -> bool:
        """Return True if there is a next page of results."""

    def scrape_zip(self, zip_code: str, max_pages: int = 10) -> Generator[dict[str, Any], None, None]:
        """Scrape all pages for a single zip code, yielding listing dicts."""
        offset = 0
        for page_num in range(max_pages):
            url = self.build_search_url(zip_code, offset=offset)
            try:
                soup = self.fetch(url)
            except requests.HTTPError as exc:
                logger.warning("HTTP error for %s (page %d): %s", zip_code, page_num, exc)
                break
            except Exception as exc:
                logger.error("Failed to fetch %s (page %d): %s", zip_code, page_num, exc)
                break

            listings = self.parse_listing_page(soup, zip_code)
            if not listings:
                logger.info("No listings on page %d for zip %s — stopping.", page_num, zip_code)
                break

            for listing in listings:
                yield listing

            if not self.has_next_page(soup):
                break

            offset += len(listings)
            logger.info(
                "Scraped page %d for zip %s (%d listings)", page_num + 1, zip_code, len(listings)
            )
