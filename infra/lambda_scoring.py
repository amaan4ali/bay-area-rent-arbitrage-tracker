"""AWS Lambda handler: trigger PySpark scoring pipeline.

This handler can run PySpark locally (for small datasets) or submit a job
to EMR Serverless / Glue.  For the default path it runs the pipeline
in-process using ``local[*]`` Spark master.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def handler(event: dict, context: object) -> dict:
    """Lambda entrypoint for the scoring pipeline."""
    from pipeline.spark_scoring import run_pipeline

    logger.info("Starting scoring pipeline (event=%s)", event)
    run_pipeline()
    logger.info("Scoring pipeline complete")

    return {
        "statusCode": 200,
        "body": {"message": "Scoring pipeline executed successfully"},
    }
