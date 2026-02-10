"""Tests for scraper HTML parsing logic."""

from __future__ import annotations

import pytest
from bs4 import BeautifulSoup

from scraper.craigslist import CraigslistScraper
from scraper.apartments import ApartmentsScraper


# ── Craigslist tests ──────────────────────────────────────────────────────────

class TestCraigslistScraper:
    """Test Craigslist scraper parsing methods."""

    def setup_method(self):
        self.scraper = CraigslistScraper()

    def test_parse_price_dollar_sign(self):
        assert self.scraper._parse_price("$2,500") == 2500.0

    def test_parse_price_no_dollar(self):
        assert self.scraper._parse_price("2500") == 2500.0

    def test_parse_price_with_text(self):
        assert self.scraper._parse_price("$1,800/mo") == 1800.0

    def test_parse_price_empty(self):
        assert self.scraper._parse_price("") is None

    def test_parse_price_no_number(self):
        assert self.scraper._parse_price("call for price") is None

    def test_parse_housing_full(self):
        br, sqft = self.scraper._parse_housing("2br - 850ft²")
        assert br == 2
        assert sqft == 850

    def test_parse_housing_br_only(self):
        br, sqft = self.scraper._parse_housing("3br")
        assert br == 3
        assert sqft is None

    def test_parse_housing_sqft_only(self):
        br, sqft = self.scraper._parse_housing("1200ft²")
        assert br is None
        assert sqft == 1200

    def test_parse_housing_empty(self):
        br, sqft = self.scraper._parse_housing("")
        assert br is None
        assert sqft is None

    def test_parse_housing_large_sqft(self):
        br, sqft = self.scraper._parse_housing("4br - 2,400ft²")
        assert br == 4
        assert sqft == 2400

    def test_parse_listing_page_modern_layout(self):
        """Parse a simulated modern CL search result."""
        html = """
        <ul>
          <li class="cl-static-search-result">
            <a href="https://sfbay.craigslist.org/sfc/apa/d/test/1234.html">
              <div class="title">Sunny 2BR in Mission</div>
              <div class="priceinfo">$2,800</div>
              <div class="housing">2br - 900ft²</div>
            </a>
          </li>
          <li class="cl-static-search-result">
            <a href="https://sfbay.craigslist.org/sfc/apa/d/test/5678.html">
              <div class="title">Studio near BART</div>
              <div class="priceinfo">$1,500</div>
              <div class="housing">1br - 400ft²</div>
            </a>
          </li>
        </ul>
        """
        soup = BeautifulSoup(html, "lxml")
        results = self.scraper.parse_listing_page(soup, "94110")

        assert len(results) == 2
        assert results[0]["price"] == 2800.0
        assert results[0]["bedrooms"] == 2
        assert results[0]["sqft"] == 900
        assert results[0]["zip_code"] == "94110"
        assert results[0]["source"] == "craigslist"
        assert "1234" in results[0]["url"]

        assert results[1]["price"] == 1500.0
        assert results[1]["bedrooms"] == 1

    def test_parse_listing_page_empty(self):
        soup = BeautifulSoup("<html><body></body></html>", "lxml")
        results = self.scraper.parse_listing_page(soup, "94110")
        assert results == []

    def test_build_search_url_contains_zip(self):
        url = self.scraper.build_search_url("94110")
        assert "94110" in url
        assert "sfbay.craigslist.org" in url

    def test_build_search_url_with_offset(self):
        url = self.scraper.build_search_url("94110", offset=120)
        assert "s=120" in url

    def test_has_next_page_true(self):
        html = '<a class="button next" href="/search/apa?s=120">next</a>'
        soup = BeautifulSoup(html, "lxml")
        assert self.scraper.has_next_page(soup) is True

    def test_has_next_page_false(self):
        html = "<div>no pagination</div>"
        soup = BeautifulSoup(html, "lxml")
        assert self.scraper.has_next_page(soup) is False


# ── Apartments.com tests ─────────────────────────────────────────────────────

class TestApartmentsScraper:
    """Test Apartments.com scraper parsing methods."""

    def setup_method(self):
        self.scraper = ApartmentsScraper()

    def test_parse_price_range(self):
        """Should take the lower bound of a price range."""
        assert self.scraper._parse_price("$2,100 - $3,200") == 2100.0

    def test_parse_price_single(self):
        assert self.scraper._parse_price("$1,850") == 1850.0

    def test_parse_beds_studio(self):
        assert self.scraper._parse_beds("Studio") == 0

    def test_parse_beds_number(self):
        assert self.scraper._parse_beds("2 Beds") == 2

    def test_parse_beds_empty(self):
        assert self.scraper._parse_beds("") is None

    def test_parse_baths(self):
        assert self.scraper._parse_baths("1.5 Baths") == 1.5

    def test_parse_baths_whole(self):
        assert self.scraper._parse_baths("2 Baths") == 2.0

    def test_parse_sqft(self):
        assert self.scraper._parse_sqft("850 Sq Ft") == 850

    def test_parse_sqft_comma(self):
        assert self.scraper._parse_sqft("1,200 Sq Ft") == 1200

    def test_parse_card(self):
        """Parse a simulated Apartments.com card."""
        html = """
        <article class="placard">
          <a class="property-link" href="https://www.apartments.com/test/123/">
            <div class="property-title">Bay View Apartments</div>
          </a>
          <div class="property-pricing">$2,500</div>
          <div class="property-beds">2 Beds</div>
          <div class="property-baths">1 Bath</div>
          <div class="property-sqft">950 Sq Ft</div>
        </article>
        """
        soup = BeautifulSoup(html, "lxml")
        results = self.scraper.parse_listing_page(soup, "94301")

        assert len(results) == 1
        r = results[0]
        assert r["price"] == 2500.0
        assert r["bedrooms"] == 2
        assert r["bathrooms"] == 1.0
        assert r["sqft"] == 950
        assert r["source"] == "apartments"
        assert r["zip_code"] == "94301"

    def test_build_search_url_basic(self):
        url = self.scraper.build_search_url("94040")
        assert "94040" in url
        assert "apartments.com" in url

    def test_build_search_url_page_2(self):
        url = self.scraper.build_search_url("94040", offset=25)
        assert "/2/" in url
