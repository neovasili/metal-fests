#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { WebsiteStack, WebsiteUsEast1Stack } from "./src/stacks/Website";
import { Tagger, Stage } from "@seventhlab/cdk-lib";

const app = new cdk.App();
const websiteUsEast1Stack = new WebsiteUsEast1Stack(app, "WebsiteUsEast1Stack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
});
const websiteStack = new WebsiteStack(app, "WebsiteStack", {
  cloudFrontCertificate: websiteUsEast1Stack.cloudFrontCertificate,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  crossRegionReferences: true,
});

cdk.Aspects.of(websiteUsEast1Stack).add(
  new Tagger({
    stage: Stage.PROD,
    project: "metal-fests",
    projectVersion: "1.0.0",
  }),
);
cdk.Aspects.of(websiteStack).add(
  new Tagger({
    stage: Stage.PROD,
    project: "metal-fests",
    projectVersion: "1.0.0",
  }),
);
