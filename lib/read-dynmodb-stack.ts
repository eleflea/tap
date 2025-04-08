import * as cdk from "aws-cdk-lib";
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from "constructs";
import { join } from "path";

interface ReadDynamoDBStackProps extends cdk.StackProps {
  cyberThreatTableArn: string;
}

export class ReadDynamoDBStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ReadDynamoDBStackProps) {
    super(scope, id, props);

    // Create the Lambda function
    const readDynamoDBHandler = new lambda.Function(this, "ReadDynamoDBHandler", {
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset(join(__dirname, "../src/lambdas/readDynamoDB")),
      handler: "read_dynamodb.handler",
      timeout: cdk.Duration.seconds(120),
    });

    readDynamoDBHandler.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    readDynamoDBHandler.addToRolePolicy(new iam.PolicyStatement({
      actions: ['execute-api:ManageConnections'],
      resources: ['*'],
    }));

    // Grant DynamoDB scan permission to the Lambda function
    readDynamoDBHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:Scan", "dynamodb:Query"],
        resources: [props.cyberThreatTableArn],
      })
    );
  }
}
