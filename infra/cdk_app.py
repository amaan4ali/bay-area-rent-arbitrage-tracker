"""CDK app entrypoint."""

from __future__ import annotations

import aws_cdk as cdk

from infra.cdk_stack import RentArbitrageStack

app = cdk.App()
RentArbitrageStack(
    app,
    "RentArbitrageStack",
    env=cdk.Environment(region="us-west-2"),
)
app.synth()
