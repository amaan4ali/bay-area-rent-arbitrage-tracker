"""Bay Area zip codes and application configuration."""

from __future__ import annotations

import os
from dotenv import load_dotenv

load_dotenv()

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL: str = os.getenv(
    "DATABASE_URL", "postgresql://user:password@localhost:5432/rent_tracker"
)

# ── 50 Bay Area zip codes ─────────────────────────────────────────────────────
# Spanning SF, Oakland, Berkeley, San Jose, Palo Alto, Mountain View,
# Sunnyvale, Fremont, Walnut Creek, San Mateo, and surrounding areas.
BAY_AREA_ZIP_CODES: list[str] = [
    # San Francisco
    "94102", "94103", "94107", "94109", "94110", "94112", "94114", "94116", "94117", "94122",
    # Oakland
    "94601", "94602", "94603", "94606", "94607", "94609", "94610", "94611",
    # Berkeley
    "94702", "94703", "94704", "94705",
    # San Jose
    "95110", "95112", "95113", "95116", "95118", "95120", "95121", "95123", "95125", "95126",
    # Palo Alto
    "94301", "94303", "94306",
    # Mountain View
    "94040", "94041", "94043",
    # Sunnyvale
    "94085", "94086", "94087",
    # Fremont
    "94536", "94538", "94539",
    # Walnut Creek
    "94595", "94596", "94597",
    # San Mateo
    "94401", "94402", "94403", "94404",
]

# ── Scraper settings ──────────────────────────────────────────────────────────
SCRAPE_RATE_LIMIT_SECONDS: float = float(os.getenv("SCRAPE_RATE_LIMIT_SECONDS", "2.0"))
SCRAPE_MAX_RETRIES: int = int(os.getenv("SCRAPE_MAX_RETRIES", "3"))
SCRAPE_TIMEOUT_SECONDS: int = int(os.getenv("SCRAPE_TIMEOUT_SECONDS", "15"))

# ── AWS / S3 ──────────────────────────────────────────────────────────────────
AWS_REGION: str = os.getenv("AWS_REGION", "us-west-2")
S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "rent-arbitrage-raw-data")

# ── PySpark ───────────────────────────────────────────────────────────────────
SPARK_MASTER: str = os.getenv("SPARK_MASTER", "local[*]")
SPARK_APP_NAME: str = os.getenv("SPARK_APP_NAME", "rent-arbitrage-pipeline")
SPARK_JDBC_DRIVER_PATH: str = os.getenv(
    "SPARK_JDBC_DRIVER_PATH", "/opt/spark/jars/postgresql-42.7.1.jar"
)

# ── Dashboard ─────────────────────────────────────────────────────────────────
DASH_HOST: str = os.getenv("DASH_HOST", "0.0.0.0")
DASH_PORT: int = int(os.getenv("DASH_PORT", "8050"))
DASH_DEBUG: bool = os.getenv("DASH_DEBUG", "true").lower() == "true"
DASH_REFRESH_INTERVAL_HOURS: int = int(os.getenv("DASH_REFRESH_INTERVAL_HOURS", "6"))

# ── Scoring thresholds ────────────────────────────────────────────────────────
ZSCORE_UNDERPRICED_THRESHOLD: float = float(os.getenv("ZSCORE_UNDERPRICED_THRESHOLD", "-1.5"))
ROLLING_WINDOW_WEEKS: int = int(os.getenv("ROLLING_WINDOW_WEEKS", "4"))
