"""PySpark pipeline: compute rolling median rent and z-scores per listing.

Reads from PostgreSQL ``listings`` table, computes 4-week rolling median
rent per (zip_code, bedrooms) group, derives z-scores, flags underpriced
anomalies, and writes results to the ``scored_listings`` table.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from pyspark.sql import SparkSession, DataFrame, Window
from pyspark.sql import functions as F
from pyspark.sql.types import (
    BooleanType,
    FloatType,
    IntegerType,
    StringType,
    StructField,
    StructType,
    TimestampType,
)

from db.config import (
    DATABASE_URL,
    ROLLING_WINDOW_WEEKS,
    SPARK_APP_NAME,
    SPARK_JDBC_DRIVER_PATH,
    SPARK_MASTER,
    ZSCORE_UNDERPRICED_THRESHOLD,
)

logger = logging.getLogger(__name__)


def _jdbc_url_and_props() -> tuple[str, dict[str, str]]:
    """Convert SQLAlchemy-style URL to JDBC format."""
    # postgresql://user:pass@host:port/db → jdbc:postgresql://host:port/db
    url = DATABASE_URL
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "", 1)
    elif url.startswith("postgresql+psycopg2://"):
        url = url.replace("postgresql+psycopg2://", "", 1)

    # Split user:pass from host
    user_pass, host_db = url.split("@", 1)
    user, password = user_pass.split(":", 1)
    jdbc_url = f"jdbc:postgresql://{host_db}"

    props = {
        "user": user,
        "password": password,
        "driver": "org.postgresql.Driver",
    }
    return jdbc_url, props


def get_spark() -> SparkSession:
    """Create or retrieve the SparkSession."""
    return (
        SparkSession.builder
        .master(SPARK_MASTER)
        .appName(SPARK_APP_NAME)
        .config("spark.jars", SPARK_JDBC_DRIVER_PATH)
        .config("spark.sql.shuffle.partitions", "8")
        .getOrCreate()
    )


def read_listings(spark: SparkSession) -> DataFrame:
    """Read the listings table from PostgreSQL."""
    jdbc_url, props = _jdbc_url_and_props()
    return spark.read.jdbc(url=jdbc_url, table="listings", properties=props)


def compute_rolling_median(df: DataFrame, window_weeks: int = ROLLING_WINDOW_WEEKS) -> DataFrame:
    """Compute rolling median rent per (zip_code, bedrooms) over *window_weeks*.

    PySpark doesn't have a built-in rolling-median window function, so we
    approximate using ``percentile_approx(price, 0.5)`` over a row-based
    window ordered by scraped_at.
    """
    cutoff = datetime.utcnow() - timedelta(weeks=window_weeks)
    recent = df.filter(
        (F.col("price").isNotNull()) & (F.col("scraped_at") >= F.lit(cutoff))
    )

    # Group-level median
    medians = (
        recent.groupBy("zip_code", "bedrooms")
        .agg(
            F.percentile_approx("price", 0.5).alias("rolling_median"),
            F.stddev("price").alias("price_std"),
            F.count("*").alias("group_count"),
        )
    )

    # Join back to get per-listing stats
    joined = recent.join(medians, on=["zip_code", "bedrooms"], how="inner")
    return joined


def compute_z_scores(df: DataFrame) -> DataFrame:
    """Add z_score column: (price - rolling_median) / std.

    Listings with null std (groups of 1) get z_score = 0.
    """
    return df.withColumn(
        "z_score",
        F.when(
            (F.col("price_std").isNotNull()) & (F.col("price_std") > 0),
            (F.col("price") - F.col("rolling_median")) / F.col("price_std"),
        ).otherwise(F.lit(0.0)),
    )


def flag_underpriced(df: DataFrame, threshold: float = ZSCORE_UNDERPRICED_THRESHOLD) -> DataFrame:
    """Flag listings where z_score < threshold as underpriced."""
    return df.withColumn(
        "is_underpriced",
        F.col("z_score") < F.lit(threshold),
    )


def write_scored_listings(df: DataFrame) -> None:
    """Write scored results to PostgreSQL ``scored_listings`` table.

    Uses overwrite mode — the pipeline is designed to re-score all active
    listings on each run.
    """
    jdbc_url, props = _jdbc_url_and_props()

    output = df.select(
        F.col("id").alias("listing_id"),
        F.col("rolling_median").cast(FloatType()),
        F.col("z_score").cast(FloatType()),
        F.col("is_underpriced").cast(BooleanType()),
        F.current_timestamp().alias("scored_at"),
    )

    (
        output.write
        .mode("overwrite")
        .jdbc(url=jdbc_url, table="scored_listings", properties=props)
    )


def run_pipeline() -> None:
    """Execute the full scoring pipeline end-to-end."""
    logger.info("Starting PySpark scoring pipeline")
    spark = get_spark()

    try:
        listings = read_listings(spark)
        row_count = listings.count()
        logger.info("Loaded %d listings from PostgreSQL", row_count)

        if row_count == 0:
            logger.warning("No listings found — skipping scoring.")
            return

        with_median = compute_rolling_median(listings)
        with_z = compute_z_scores(with_median)
        scored = flag_underpriced(with_z)

        underpriced_count = scored.filter(F.col("is_underpriced")).count()
        logger.info("Flagged %d underpriced listings", underpriced_count)

        write_scored_listings(scored)
        logger.info("Scored listings written to PostgreSQL")
    finally:
        spark.stop()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_pipeline()
