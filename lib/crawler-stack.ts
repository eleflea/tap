import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';
import { join } from "path";

export class CrawlerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the Lambda function
    const crawlerHandler = new lambda.Function(this, 'CrawlerHandler', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset(join(__dirname, '../src/lambdas/crawler'), {
        bundling: {
          image: lambda.Runtime.PYTHON_3_11.bundlingImage,
          command: [
            'bash', '-c',
            'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output'
          ],
        },
      }),
      handler: 'threats_crawler.lambda_handler',
      initialPolicy: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'cloudwatch:PutMetricData',
            'cloudwatch:PutDashboard',
            'cloudwatch:PutMetricAlarm',
            'cloudwatch:DescribeAlarms',
            'cloudwatch:DeleteAlarms',
            'dynamodb:*'
          ],
          resources: ['*'],
        }),
      ],
      
    });

    crawlerHandler.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)

    const crawlerLambdaEvent = new events.Rule(this,'CrawlerEvent',{
      description: "Web Crawler run every 5 mins",
      targets: [new eventsTargets.LambdaFunction(crawlerHandler)],
      schedule: events.Schedule.rate(cdk.Duration.minutes(2)),
    });

    crawlerLambdaEvent.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)

    // Create DynamoDB table
    const cyberThreatTable = new dynamodb.Table(this, 'CyberThreatData', {
      tableName: 'CyberThreatData',
      partitionKey: { name: 'ThreatID', type: dynamodb.AttributeType.STRING },
      readCapacity: 5,
      writeCapacity: 5,
      removalPolicy: cdk.RemovalPolicy.DESTROY, 
    });

    // Create API Gateway
    const api = new apigateway.LambdaRestApi(this, 'ThreatApiGateway', {
      restApiName: 'CyberThreat API',
      handler: crawlerHandler, 
      proxy: true, 
    });

    api.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)
  }
}




  