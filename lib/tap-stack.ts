import * as cdk from 'aws-cdk-lib';
import * as dotenv from "dotenv";
import { Construct } from 'constructs';
import { GPTStack } from './gpt-stack';
import { FrontendStack } from './frontend-stack';
import { CrawlerStack } from './crawler-stack';
import { ReadDynamoDBStack } from './read-dynmodb-stack';

dotenv.config({ path: ".env.local" });

export class TapStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Instantiate the Crawler Stack
    const crawlerStack = new CrawlerStack(this, "CrawlerStack");

    // Instantiate the Read DynamoDB Stack - This stack is for debugging purposes only.
    const readDynamoDBStack = new ReadDynamoDBStack(this, "ReadDynamoDBStack", {
      cyberThreatTableArn: crawlerPipeline.gammaStage.crawlerStack.cyberThreatTableArn,
    });

    // Instantiate the GPT Stack
    const gptStack = new GPTStack(this, "GPTStack", {
      cyberThreatTableArn: crawlerPipeline.gammaStage.crawlerStack.cyberThreatTableArn,
    });

    // Instantiate the Frontend Stack, passing the API URL from GPT Stack
    const frontendStack = new FrontendStack(this, "FrontendStack", {
      apiUrl: gptStack.apiUrl,
    });

    // Ensure stacks are deployed in the correct order
    this.addDependency(crawlerStack);
    this.addDependency(readDynamoDBStack)
    this.addDependency(gptStack);
    this.addDependency(frontendStack);
  }
}