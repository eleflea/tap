import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';

export class CrawlerStack extends cdk.Stack {
  public readonly cyberThreatTableArn: string;
  
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const threatCrawlerLambda = this.createThreatCrawlerLambda();
    this.createCrawlerScheduler(threatCrawlerLambda, Duration.minutes(10));
    this.createDynamoDbDatabase();
    this.createTestGateway(threatCrawlerLambda);
  }

  private createThreatCrawlerLambda(): lambda.Function {
    const threatCrawlerFunction = new lambda.Function(this, 'MonitoringFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset('threats_crawler/lambda'),
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
    return threatCrawlerFunction;
  }

  private createDynamoDbDatabase(): void {
    new dynamodb.Table(this, 'CyberThreatData', {
      tableName: 'CyberThreatData',
      partitionKey: { name: 'ThreatID', type: dynamodb.AttributeType.STRING },
      readCapacity: 5,
      writeCapacity: 5,
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }

  private createTestGateway(threatLambda: lambda.Function): void {
    new apigateway.LambdaRestApi(this, 'ThreatApiGateway', {
      restApiName: 'CyberThreatApi',
      handler: threatLambda,
      proxy: true,
    });
  }

  private createCrawlerScheduler(threatLambda: lambda.Function, duration: Duration): void {
    new events.Rule(this, 'ThreatCrawlerRule', {
      ruleName: 'ThreatCrawlerScheduler',
      schedule: events.Schedule.rate(duration),
      targets: [new targets.LambdaFunction(threatLambda)],
    });
  }
}