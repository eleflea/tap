import * as cdk from 'aws-cdk-lib';
import {Construct} from "constructs";
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import {CodePipelineSource} from "aws-cdk-lib/pipelines";
import {SecretValue} from "aws-cdk-lib";
import {CrawlerStack} from "./crawler-stack";
import {CrawlerAppStage} from "./crawler-app-stage";
import {IStage} from "aws-cdk-lib/aws-codepipeline";

export class CrawlerPipelineStack extends cdk.Stack {
  public readonly gammaStage: CrawlerAppStage;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the pipeline
    const pipeline = new codepipeline.Pipeline(this, 'CrawlerPipeline', {
      pipelineName: 'CrawlerPipeline',
    });

    // Add a source stage
    const codeSource = CodePipelineSource.gitHub(
      'eleflea/tap',
      'main',
      {
        authentication: SecretValue.secretsManager('my-github-token'),
      }
    )

    // Add a build stage
    this.gammaStage = new CrawlerAppStage(this, "Gamma");
    pipeline.addStage(this.gammaStage);
  }
}