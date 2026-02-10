"""Craigslist apartment-listing scraper."""

from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Any
from urllib.parse import urlencode

from bs4 import BeautifulSoup, Tag

from scraper.base import BaseScraper

logger = logging.getLogger(__name__)


class CraigslistScraper(BaseScraper):
    """Scrapes Craigslist SF Bay Area apartment listings."""

    source_name = "craigslist"

    BASE_URL = "https://sfbay.craigslist.org/search/apa"

    def build_search_url(self, zip_code: str, offset: int = 0) -> str:
        params: dict[str, Any] = {
            "postal": zip_code,
            "search_distance": 2,
            "availabilityMode": 0,
        }
        if offset > 0:
            params["s"] = offset
        return f"{self.BASE_URL}?{urlencode(params)}"

    def has_next_page(self, soup: BeautifulSoup) -> bool:
        next_btn = soup.select_one("a.button.next")
        if next_btn and next_btn.get("href"):
            return True
        # Newer CL layout
        next_range = soup.select_one(".cl-next-page")
        return next_range is not None and "disabled" not in next_range.get("class", [])

    def parse_listing_page(self, soup: BeautifulSoup, zip_code: str) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []

        # Modern Craigslist layout uses <li class="cl-static-search-result"> or
        # <li class="result-row"> in older layouts.
        rows = soup.select("li.cl-static-search-result") or soup.select("li.result-row")

        for row in rows:
            try:
                parsed = self._parse_row(row, zip_code)
                if parsed:
                    results.append(parsed)
            except Exception:
                logger.debug("Failed to parse a CL row", exc_info=True)
        return results

    # ── Private helpers ───────────────────────────────────────────────────

    def _parse_row(self, row: Tag, zip_code: str) -> dict[str, Any] | None:
        # URL
        link = row.select_one("a[href]")
        if link is None:
            return None
        url = link.get("href", "")
        if not url or not url.startswith("http"):
            url = f"https://sfbay.craigslist.org{url}"

        # Title (for description)
        title_el = row.select_one(".title, .result-title, .titlestring")
        title = title_el.get_text(strip=True) if title_el else ""

        # Price
        price_el = row.select_one(".priceinfo, .result-price")
        price = self._parse_price(price_el.get_text(strip=True)) if price_el else None

        # Housing info: e.g. "2br - 850ft²"
        housing_el = row.select_one(".housing, .meta")
        bedrooms, sqft = self._parse_housing(
            housing_el.get_text(strip=True) if housing_el else ""
        )

        # Date
        time_el = row.select_one("time[datetime]")
        listing_date = None
        if time_el:
            try:
                listing_date = datetime.fromisoformat(time_el["datetime"])
            except (ValueError, KeyError):
                pass

        return {
            "url": url,
            "source": self.source_name,
            "zip_code": zip_code,
            "price": price,
            "bedrooms": bedrooms,
            "bathrooms": None,  # CL search results don't expose bathrooms
            "sqft": sqft,
            "description": title,
            "scraped_at": datetime.utcnow(),
            "listing_date": listing_date,
        }

    @staticmethod
    def _parse_price(text: str) -> float | None:
        m = re.search(r"[\$]?([\d,]+)", text)
        if m:
            return float(m.group(1).replace(",", ""))
        return None

    @staticmethod
    def _parse_housing(text: str) -> tuple[int | None, int | None]:
        bedrooms = None
        sqft = None
        br_match = re.search(r"(\d+)\s*br", text, re.IGNORECASE)
        if br_match:
            bedrooms = int(br_match.group(1))
        sqft_match = re.search(r"([\d,]+)\s*ft", text, re.IGNORECASE)
        if sqft_match:
            sqft = int(sqft_match.group(1).replace(",", ""))
        return bedrooms, sqft
