import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { join } from "path";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from 'aws-cdk-lib/aws-iam';

interface GPTStackProps extends cdk.StackProps {
  cyberThreatTableArn: string;
}

export class GPTStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: GPTStackProps) {
    super(scope, id, props);

    // Create the Lambda function
    const chatGPTHandler = new NodejsFunction(this, "ChatGPTHandler", {
      runtime: Runtime.NODEJS_22_X,
      entry: join(__dirname, "../src/lambdas/chatGPT/chatGPTHandler.ts"),
      handler: "handler",
      timeout: cdk.Duration.seconds(120),
      environment: {
        API_KEY: process.env.API_KEY || "",
        BASE_URL: process.env.BASE_URL || "",
        MODEL_NAME: process.env.MODEL_NAME || "deepseek/deepseek-chat:free",
      },
    });

    chatGPTHandler.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)

    // Grant DynamoDB scan permission to the Lambda function
    chatGPTHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:Scan", "dynamodb:Query"],
        resources: [props.cyberThreatTableArn],
      })
    );

    // Create API Gateway
    const api = new apigateway.RestApi(this, "ChatGPTApi", {
      restApiName: "ChatGPT API",
      description: "API for ChatGPT integration",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    api.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)

    // Create API resource and method
    const chatGPT = api.root.addResource("chat");
    chatGPT.addMethod("POST", new apigateway.LambdaIntegration(chatGPTHandler));

    // Output the API URL
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway URL",
    });

    this.apiUrl = `${api.url}chat`;
  }
}
