import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { join } from "path";
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";

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

    chatGPTHandler.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    chatGPTHandler.addToRolePolicy(new iam.PolicyStatement({
      actions: ['execute-api:ManageConnections'],
      resources: ['*'],
    }));
    // Grant DynamoDB scan permission to the Lambda function
    chatGPTHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:Scan", "dynamodb:Query"],
        resources: [props.cyberThreatTableArn],
      })
    );

    const api = new apigwv2.WebSocketApi(this, "ChatGPTApi", {
      connectRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration(
          "ConnectIntegration",
          chatGPTHandler
        ),
      },
      disconnectRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration(
          "DisconnectIntegration",
          chatGPTHandler
        ),
      },
      defaultRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration(
          "DefaultIntegration",
          chatGPTHandler
        ),
      },
    });
    api.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    chatGPTHandler.addEnvironment(
      "WEBSOCKET_API_ENDPOINT",
      `${api.apiEndpoint}/prod`
    );

    new apigwv2.WebSocketStage(this, "ChatGPTStage", {
      webSocketApi: api,
      stageName: "prod",
      autoDeploy: true,
    });

    new cdk.CfnOutput(this, "ChatGPTUrl", {
      value: api.apiEndpoint,
    });

    this.apiUrl = `${api.apiEndpoint}/prod`;
  }
}
