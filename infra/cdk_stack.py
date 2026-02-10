"""AWS CDK (Python) stack for the Rent Arbitrage Tracker infrastructure.

Resources:
  - S3 bucket for raw listing data archival
  - Lambda function for scraping pipeline
  - Lambda function for scoring pipeline
  - EventBridge rule for daily scheduling
  - Step Functions state machine to orchestrate scrape → score
"""

from __future__ import annotations

from aws_cdk import (
    Duration,
    RemovalPolicy,
    Stack,
    aws_events as events,
    aws_events_targets as targets,
    aws_iam as iam,
    aws_lambda as _lambda,
    aws_s3 as s3,
    aws_stepfunctions as sfn,
    aws_stepfunctions_tasks as sfn_tasks,
)
from constructs import Construct


class RentArbitrageStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ── S3 bucket for raw data archival ───────────────────────────────
        raw_bucket = s3.Bucket(
            self,
            "RawDataBucket",
            bucket_name="rent-arbitrage-raw-data",
            removal_policy=RemovalPolicy.RETAIN,
            lifecycle_rules=[
                s3.LifecycleRule(
                    expiration=Duration.days(90),
                    transitions=[
                        s3.Transition(
                            storage_class=s3.StorageClass.INFREQUENT_ACCESS,
                            transition_after=Duration.days(30),
                        ),
                    ],
                ),
            ],
        )

        # ── Lambda: scraper ───────────────────────────────────────────────
        scraper_lambda = _lambda.Function(
            self,
            "ScraperLambda",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="infra.lambda_scraper.handler",
            code=_lambda.Code.from_asset(
                ".",
                exclude=["cdk.out", ".git", "tests", "__pycache__", "*.pyc"],
            ),
            memory_size=512,
            timeout=Duration.minutes(15),
            environment={
                "S3_BUCKET_NAME": raw_bucket.bucket_name,
                "DATABASE_URL": "{{resolve:ssm:/rent-tracker/database-url}}",
            },
        )
        raw_bucket.grant_write(scraper_lambda)

        # ── Lambda: scoring ───────────────────────────────────────────────
        scoring_lambda = _lambda.Function(
            self,
            "ScoringLambda",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="infra.lambda_scoring.handler",
            code=_lambda.Code.from_asset(
                ".",
                exclude=["cdk.out", ".git", "tests", "__pycache__", "*.pyc"],
            ),
            memory_size=1024,
            timeout=Duration.minutes(15),
            environment={
                "DATABASE_URL": "{{resolve:ssm:/rent-tracker/database-url}}",
                "SPARK_MASTER": "local[*]",
            },
        )

        # ── Step Functions: scrape → score ────────────────────────────────
        scrape_task = sfn_tasks.LambdaInvoke(
            self,
            "ScrapeListings",
            lambda_function=scraper_lambda,
            result_path="$.scrapeResult",
        )
        score_task = sfn_tasks.LambdaInvoke(
            self,
            "ScoreListings",
            lambda_function=scoring_lambda,
            result_path="$.scoreResult",
        )

        definition = scrape_task.next(score_task)

        state_machine = sfn.StateMachine(
            self,
            "RentArbitragePipeline",
            definition_body=sfn.DefinitionBody.from_chainable(definition),
            timeout=Duration.minutes(45),
        )

        # ── EventBridge: daily schedule ───────────────────────────────────
        events.Rule(
            self,
            "DailySchedule",
            schedule=events.Schedule.cron(hour="6", minute="0"),
            targets=[targets.SfnStateMachine(state_machine)],
        )
