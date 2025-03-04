import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dotenv from "dotenv";
import { GPTStack } from "./gpt-stack";
import { FrontendStack } from "./frontend-stack";

dotenv.config({ path: ".env.local" });

export class TapStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const gptStack = new GPTStack(this, "GPTStack");

    const frontendStack = new FrontendStack(this, "FrontendStack", {
      apiUrl: gptStack.apiUrl,
    });

    this.addDependency(gptStack);
    this.addDependency(frontendStack);
  }
}
