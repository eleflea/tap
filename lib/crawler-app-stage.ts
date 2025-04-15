import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {CrawlerStack} from "./crawler-stack";

export class CrawlerAppStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    // Here we pass the stage name (using id) to the Crawler constructor.
    new CrawlerStack(this, "CrawlerStack", id)
  }
}
