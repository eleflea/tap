import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as amplify from "@aws-cdk/aws-amplify-alpha";

interface FrontendStackProps extends cdk.StackProps {
  apiUrl: string;
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const amplifyApp = new amplify.App(this, "FrontendApp", {
      sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
        owner: process.env.GITHUB_OWNER ?? "",
        repository: process.env.GITHUB_REPO ?? "tap",
        oauthToken: cdk.SecretValue.unsafePlainText(
          process.env.GITHUB_TOKEN ?? ""
        ),
      }),
      environmentVariables: {
        REACT_APP_API_URL: props.apiUrl, // 传递 API URL 给前端环境变量
      },
    });

    const masterBranch = amplifyApp.addBranch("main");

    new cdk.CfnOutput(this, "AmplifyAppUrl", {
      value: `https://${masterBranch.branchName}.${amplifyApp.defaultDomain}`,
    });
  }
}
