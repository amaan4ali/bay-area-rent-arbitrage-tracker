# Bay Area Rent Arbitrage Tracker

Find underpriced rental listings across the Bay Area using statistical anomaly detection. The system scrapes listings from Craigslist and Apartments.com, computes rolling median rent and z-scores per neighborhood/bedroom group via PySpark, and surfaces deals through a Plotly Dash dashboard.

## Architecture

```mermaid
graph TB
    subgraph Scraping
        CL[Craigslist Scraper]
        APT[Apartments.com Scraper]
        CLI[CLI Entrypoint]
    end

    subgraph AWS Infrastructure
        EB[EventBridge<br/>Daily Schedule]
        SF[Step Functions]
        LS[Lambda: Scraper]
        LP[Lambda: Scoring]
        S3[S3 Bucket<br/>Raw JSON Archive]
    end

    subgraph Data Pipeline
        PG[(PostgreSQL<br/>listings + scored_listings)]
        SPARK[PySpark Pipeline<br/>Rolling Median + Z-Score]
    end

    subgraph Dashboard
        DASH[Plotly Dash]
        P1[Page 1: Alerts Table]
        P2[Page 2: Map View]
        P3[Page 3: Trend Charts]
    end

    EB -->|cron 6:00 UTC| SF
    SF --> LS --> S3
    LS --> PG
    SF --> LP --> SPARK
    SPARK -->|read listings| PG
    SPARK -->|write scores| PG
    CLI --> CL --> PG
    CLI --> APT --> PG
    DASH --> PG
    DASH --> P1
    DASH --> P2
    DASH --> P3
```

## Project Structure

```
rent-arbitrage-tracker/
├── scraper/                 # Scraping pipeline
│   ├── base.py              # BaseScraper (rate-limit, retry, rotating UA)
│   ├── craigslist.py        # Craigslist apartment scraper
│   ├── apartments.py        # Apartments.com scraper
│   └── run.py               # CLI entrypoint (click)
├── pipeline/                # PySpark processing
│   └── spark_scoring.py     # Rolling median, z-score, underpriced flagging
├── dashboard/               # Plotly Dash frontend
│   ├── app.py               # Main Dash app with routing
│   ├── data.py              # Read-only DB queries for dashboard
│   └── pages/
│       ├── alerts.py        # Page 1: Underpriced listings table
│       ├── map_view.py      # Page 2: Scattermapbox
│       └── trends.py        # Page 3: Rolling median line charts
├── infra/                   # AWS Lambda handlers + CDK
│   ├── lambda_scraper.py    # Scrape → S3 + PostgreSQL
│   ├── lambda_scoring.py    # Trigger PySpark scoring
│   ├── cdk_stack.py         # CDK stack (S3, Lambda, Step Functions, EventBridge)
│   └── cdk_app.py           # CDK app entrypoint
├── db/                      # SQL models & data access
│   ├── config.py            # Env-var config + 50 Bay Area zip codes
│   ├── models.py            # SQLAlchemy ORM (listings, scored_listings)
│   ├── session.py           # Engine + session factory
│   └── crud.py              # Upsert (dedup) + query helpers
├── tests/
│   ├── conftest.py          # Shared fixtures
│   ├── test_dedup.py        # Deduplication / upsert tests
│   ├── test_zscore.py       # Z-score computation tests
│   └── test_scraper_parsing.py  # HTML parsing tests
├── .env.example             # Environment variable template
├── pyproject.toml           # Project metadata & dependencies
└── README.md
```

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 14+
- Java 11+ (for PySpark)
- AWS CLI & CDK (for infrastructure deployment)

### 1. Clone & Install

```bash
git clone <repo-url> && cd rent-arbitrage-tracker
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials, AWS keys, etc.
```

### 3. Initialize Database

```python
from db.session import init_db
init_db()  # Creates listings + scored_listings tables
```

### 4. Run Scrapers

```bash
# Single zip code from Craigslist
python -m scraper.run --source craigslist --zip 94110

# All sources, all 50 configured zip codes
python -m scraper.run --source all

# Apartments.com for specific zips
python -m scraper.run --source apartments --zip 94301 --zip 94040
```

### 5. Run Scoring Pipeline

```bash
python -m pipeline.spark_scoring
```

### 6. Launch Dashboard

```bash
python -m dashboard.app
# Open http://localhost:8050
```

### 7. Run Tests

```bash
pytest -v
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:password@localhost:5432/rent_tracker` | PostgreSQL connection string |
| `AWS_REGION` | `us-west-2` | AWS region |
| `S3_BUCKET_NAME` | `rent-arbitrage-raw-data` | S3 bucket for raw JSON archival |
| `SCRAPE_RATE_LIMIT_SECONDS` | `2.0` | Minimum seconds between HTTP requests |
| `SCRAPE_MAX_RETRIES` | `3` | Max retries per request on failure |
| `SCRAPE_TIMEOUT_SECONDS` | `15` | HTTP request timeout |
| `SPARK_MASTER` | `local[*]` | Spark master URL |
| `SPARK_APP_NAME` | `rent-arbitrage-pipeline` | Spark application name |
| `SPARK_JDBC_DRIVER_PATH` | `/opt/spark/jars/postgresql-42.7.1.jar` | Path to PostgreSQL JDBC driver |
| `DASH_HOST` | `0.0.0.0` | Dashboard bind host |
| `DASH_PORT` | `8050` | Dashboard port |
| `DASH_DEBUG` | `true` | Enable Dash debug mode |
| `DASH_REFRESH_INTERVAL_HOURS` | `6` | Auto-refresh interval |
| `ZSCORE_UNDERPRICED_THRESHOLD` | `-1.5` | Z-score threshold for "underpriced" flag |
| `ROLLING_WINDOW_WEEKS` | `4` | Rolling window for median calculation |

## Key Design Decisions

- **Deduplication**: Keyed on `url` with PostgreSQL `ON CONFLICT DO UPDATE` — re-scraping the same listing updates price/description instead of creating duplicates.
- **Z-score approach**: Uses `percentile_approx` in PySpark for rolling median (exact median is expensive at scale). Threshold of -1.5 balances sensitivity vs. noise.
- **Rate limiting**: Configurable per-request delay + exponential backoff retries to avoid IP bans.
- **Rotating User-Agent**: Uses `fake-useragent` library to rotate browser fingerprints.
- **50 Bay Area zips**: Hardcoded in `db/config.py` — covers SF, East Bay, South Bay, Peninsula, and Tri-Valley.

## AWS Deployment

```bash
# Install CDK
npm install -g aws-cdk

# Deploy
cd infra
cdk deploy RentArbitrageStack
```

The CDK stack creates:
- **S3 bucket** with lifecycle rules (→ IA after 30d, expire after 90d)
- **Lambda: scraper** (512 MB, 15 min timeout)
- **Lambda: scoring** (1 GB, 15 min timeout)
- **Step Functions** state machine: scrape → score
- **EventBridge** rule: daily at 06:00 UTC
