import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfrontOrigins from "aws-cdk-lib/aws-cloudfront-origins";

import { TAGGING_POLICY_STATEMENT } from "@seventhlab/cdk-lib";

const DOMAIN_NAME = "metal-fests.com";
const ALL_DOMAINS = [
  DOMAIN_NAME,
  `www.${DOMAIN_NAME}`,
  "metal-fests.info",
  "metal-fests.eu",
];

interface WebsiteStackProps extends cdk.StackProps {
  cloudFrontCertificate: acm.ICertificate;
}

class WebsiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WebsiteStackProps) {
    super(scope, id, props);

    const { cloudFrontCertificate } = props;
    if (!cloudFrontCertificate) {
      throw new Error("CloudFront certificate is not provided");
    }

    const provider = new iam.CfnOIDCProvider(this, "GitHubIdentityProvider", {
      url: "https://token.actions.githubusercontent.com",
      clientIdList: ["sts.amazonaws.com"],
      thumbprintList: ["1b511abead59c6ce207077c0bf0e0043b1382612"],
    });
    // The thumbprint value is painful to retrieve, but we can always the 'hack' of try to create iDP from AWS console
    // and use the 'Get thumbprint' button that makes the trick for us.
    // The hard way: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html

    const cdkProvider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this,
      "CdkGitHubProvider",
      provider.attrArn,
    );

    const principal = new iam.OpenIdConnectPrincipal(cdkProvider, {
      StringLike: {
        "token.actions.githubusercontent.com:sub":
          "repo:neovasili/metal-fests:*",
      },
    });
    const taggingPolicy = new iam.Policy(this, "TaggingPolicy", {
      policyName: "TaggingPolicy",
      statements: [TAGGING_POLICY_STATEMENT],
    });

    new s3.Bucket(this, "RootWebsiteBucket", {
      bucketName: `www.${DOMAIN_NAME}`,
      versioned: false,
      blockPublicAccess: {
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
      websiteRedirect: {
        hostName: DOMAIN_NAME,
      },
    });

    const bucket = new s3.Bucket(this, "WebsiteBucket", {
      bucketName: DOMAIN_NAME,
      versioned: false,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "error.html",
      publicReadAccess: true,
    });

    const cdn = new cloudfront.Distribution(this, "WebsiteDistribution", {
      comment: `Seventhlab '${DOMAIN_NAME}' website`,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      defaultBehavior: {
        compress: true,
        origin: new cloudfrontOrigins.S3StaticWebsiteOrigin(bucket),
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      domainNames: ALL_DOMAINS,
      certificate: cloudFrontCertificate,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });
    cdn.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

    const deployRole = new iam.Role(this, "GitHubWbesiteDeployRole", {
      roleName: "GitHubWebsiteDeployRole",
      description: "Role to deploy the website from GitHub Actions",
      assumedBy: principal,
      path: "/automation/github/",
      inlinePolicies: {
        S3DeployPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:DeleteObject",
                "s3:ListBucket",
              ],
              resources: [
                `arn:aws:s3:::${bucket.bucketName}`,
                `arn:aws:s3:::${bucket.bucketName}/*`,
              ],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["cloudfront:CreateInvalidation"],
              resources: [
                `arn:aws:cloudfront::*:distribution/${cdn.distributionId}`,
              ],
            }),
          ],
        }),
      },
    });
    taggingPolicy.attachToRole(deployRole);

    new cdk.CfnOutput(this, "GitHubWbesiteDeployRoleArn", {
      exportName: "GitHubWbesiteDeployRoleArn",
      description: "ARN of the role to deploy the website from GitHub Actions",
      value: deployRole.roleArn,
    });
  }
}

class WebsiteUsEast1Stack extends cdk.Stack {
  public cloudFrontCertificate: acm.ICertificate;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    this.cloudFrontCertificate = new acm.Certificate(this, "Certificate", {
      domainName: DOMAIN_NAME,
      subjectAlternativeNames: ALL_DOMAINS,
      validation: acm.CertificateValidation.fromDns(),
    });
  }
}

export { WebsiteStack, WebsiteUsEast1Stack };
