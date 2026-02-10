"""Apartments.com listing scraper."""

from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Any

from bs4 import BeautifulSoup, Tag

from scraper.base import BaseScraper

logger = logging.getLogger(__name__)


class ApartmentsScraper(BaseScraper):
    """Scrapes Apartments.com listings for Bay Area zip codes."""

    source_name = "apartments"

    BASE_URL = "https://www.apartments.com"

    def build_search_url(self, zip_code: str, offset: int = 0) -> str:
        page = (offset // 25) + 1 if offset else 1
        if page > 1:
            return f"{self.BASE_URL}/apartments/{zip_code}/{page}/"
        return f"{self.BASE_URL}/apartments/{zip_code}/"

    def has_next_page(self, soup: BeautifulSoup) -> bool:
        next_link = soup.select_one("a.next, a[data-page='next']")
        return next_link is not None

    def parse_listing_page(self, soup: BeautifulSoup, zip_code: str) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []

        cards = soup.select("article.placard") or soup.select("li.mortar-wrapper")
        for card in cards:
            try:
                parsed = self._parse_card(card, zip_code)
                if parsed:
                    results.append(parsed)
            except Exception:
                logger.debug("Failed to parse an Apartments.com card", exc_info=True)
        return results

    # ── Private helpers ───────────────────────────────────────────────────

    def _parse_card(self, card: Tag, zip_code: str) -> dict[str, Any] | None:
        # URL
        link = card.select_one("a.property-link, a[data-url]")
        if link is None:
            return None
        url = link.get("href") or link.get("data-url", "")
        if not url:
            return None
        if not url.startswith("http"):
            url = f"{self.BASE_URL}{url}"

        # Title
        title_el = card.select_one(".property-title, .js-placardTitle")
        title = title_el.get_text(strip=True) if title_el else ""

        # Price — may show range like "$2,100 - $3,200", take lower bound
        price_el = card.select_one(".property-pricing, .price-range")
        price = self._parse_price(price_el.get_text(strip=True)) if price_el else None

        # Beds
        beds_el = card.select_one(".property-beds, .bed-range")
        bedrooms = self._parse_beds(beds_el.get_text(strip=True)) if beds_el else None

        # Baths
        baths_el = card.select_one(".property-baths, .bath-range")
        bathrooms = self._parse_baths(baths_el.get_text(strip=True)) if baths_el else None

        # Sqft
        sqft_el = card.select_one(".property-sqft, .sqft-range")
        sqft = self._parse_sqft(sqft_el.get_text(strip=True)) if sqft_el else None

        return {
            "url": url,
            "source": self.source_name,
            "zip_code": zip_code,
            "price": price,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "sqft": sqft,
            "description": title,
            "scraped_at": datetime.utcnow(),
            "listing_date": None,
        }

    @staticmethod
    def _parse_price(text: str) -> float | None:
        # Take the first (lowest) dollar amount
        m = re.search(r"[\$]?([\d,]+)", text)
        if m:
            return float(m.group(1).replace(",", ""))
        return None

    @staticmethod
    def _parse_beds(text: str) -> int | None:
        if "studio" in text.lower():
            return 0
        m = re.search(r"(\d+)", text)
        return int(m.group(1)) if m else None

    @staticmethod
    def _parse_baths(text: str) -> float | None:
        m = re.search(r"([\d.]+)", text)
        return float(m.group(1)) if m else None

    @staticmethod
    def _parse_sqft(text: str) -> int | None:
        m = re.search(r"([\d,]+)", text)
        return int(m.group(1).replace(",", "")) if m else None
