import * as cdk from 'aws-cdk-lib';
import * as dotenv from "dotenv";
import { Construct } from 'constructs';
import { GPTStack } from './gpt-stack';
import { FrontendStack } from './frontend-stack';
import { CrawlerStack } from './crawler-stack';

dotenv.config({ path: ".env.local" });

export class TapStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Instantiate the Crawler Stack
    const crawlerStack = new CrawlerStack(this, "CrawlerStack");

    // Instantiate the GPT Stack
    const gptStack = new GPTStack(this, "GPTStack");

    // Instantiate the Frontend Stack, passing the API URL from GPT Stack
    const frontendStack = new FrontendStack(this, "FrontendStack", {
      apiUrl: gptStack.apiUrl,
    });

    // Ensure stacks are deployed in the correct order
    this.addDependency(crawlerStack);
    this.addDependency(gptStack);
    this.addDependency(frontendStack);
  }
}