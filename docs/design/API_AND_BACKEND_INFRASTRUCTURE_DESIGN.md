# Metal Fests API and Backend Infrastructure Design

- [Metal Fests API and Backend Infrastructure Design](#metal-fests-api-and-backend-infrastructure-design)
  - [Overview](#overview)
  - [Architecture Components](#architecture-components)
  - [AWS Lambda Functions](#aws-lambda-functions)
    - [Public API Lambda Configuration](#public-api-lambda-configuration)
    - [Admin API Lambda Configuration](#admin-api-lambda-configuration)
    - [Function List](#function-list)
    - [Go Project Structure](#go-project-structure)
    - [OTEL Integration](#otel-integration)
  - [API Gateway Configuration](#api-gateway-configuration)
    - [Public API Gateway](#public-api-gateway)
    - [Admin API Gateway](#admin-api-gateway)
  - [DynamoDB Configuration](#dynamodb-configuration)
    - [Table Configuration](#table-configuration)
    - [Global Secondary Indexes](#global-secondary-indexes)
    - [Advanced Features](#advanced-features)
  - [CloudFront Configuration](#cloudfront-configuration)
    - [Distribution Settings](#distribution-settings)
    - [Cache Policy](#cache-policy)
    - [WAF Integration](#waf-integration)
  - [Authentication & Authorization Infrastructure](#authentication--authorization-infrastructure)
    - [AWS Cognito User Pool](#aws-cognito-user-pool)
    - [SAML 2.0 Integration](#saml-20-integration)
    - [AWS IAM Identity Center](#aws-iam-identity-center)
  - [Monitoring & Observability](#monitoring--observability)
    - [CloudWatch Metrics](#cloudwatch-metrics)
    - [CloudWatch Logs](#cloudwatch-logs)
    - [OpenTelemetry (OTEL) Tracing](#opentelemetry-otel-tracing)
    - [AWS Grafana](#aws-grafana)
    - [Alarms](#alarms)
  - [Security](#security)
    - [Data Protection](#data-protection)
    - [Network Security](#network-security)
    - [IAM Policies](#iam-policies)
  - [Performance Optimization](#performance-optimization)
    - [Lambda Optimization](#lambda-optimization)
    - [DynamoDB Optimization](#dynamodb-optimization)
    - [API Gateway Optimization](#api-gateway-optimization)
  - [Deployment Strategy](#deployment-strategy)
    - [Environment Management](#environment-management)
    - [CI/CD Pipeline](#cicd-pipeline)
    - [Blue-Green Deployment](#blue-green-deployment)
  - [Cost Optimization](#cost-optimization)
    - [Cost Breakdown](#cost-breakdown)
    - [Optimization Strategies](#optimization-strategies)
  - [Related Documentation](#related-documentation)

## Overview

This document describes the complete infrastructure architecture for the Metal Fests application backend, including both the Public API and Admin API components. The infrastructure is built on AWS serverless architecture using API Gateway, Lambda, DynamoDB, CloudFront, and supporting services.

**Key Technologies**:

- **Compute**: AWS Lambda with Golang runtime
- **API Management**: Amazon API Gateway (REST)
- **Database**: Amazon DynamoDB (single-table design)
- **CDN**: Amazon CloudFront
- **Authentication**: AWS Cognito + SAML 2.0 + IAM Identity Center
- **Monitoring**: CloudWatch, AWS Grafana, OpenTelemetry
- **Infrastructure as Code**: Terraform / AWS CDK

## Architecture Components

The Metal Fests backend consists of two main API systems:

1. **Public API** - Read-only access for public consumption
   - No authentication required
   - Aggressive caching via CloudFront
   - High availability and low latency
   - Routes: `/api/festivals`, `/api/bands`, `/api/genres`, `/api/roles`

2. **Admin API** - Authenticated CRUD operations
   - AWS Cognito authentication with SAML 2.0
   - AWS IAM Identity Center integration
   - Fine-grained authorization via Cognito groups
   - Routes: `/api/admin/*`

**Shared Infrastructure**:

- Single DynamoDB table (MetalFests)
- Shared CloudWatch logging and metrics
- Shared OpenTelemetry observability
- Shared CloudFront distribution (with cache invalidation)

## AWS Lambda Functions

### Public API Lambda Configuration

**Runtime**: `provided.al2` (Custom Go runtime) or `go1.x`

**Architecture**: ARM64 (Graviton2 for better price-performance)

**Memory**:

- All GET operations: 256 MB

**Timeout**:

- All GET operations: 10 seconds

**Environment Variables**:

```bash
DYNAMODB_TABLE_NAME=MetalFests
AWS_REGION=us-east-1
LOG_LEVEL=info
OTEL_SERVICE_NAME=metal-fests-public-api
OTEL_EXPORTER_OTLP_ENDPOINT=https://cloudwatch-endpoint
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

**IAM Role Permissions** (Read-only):

- `dynamodb:GetItem` - Read individual items
- `dynamodb:Query` - Query tables and GSIs
- `dynamodb:BatchGetItem` - Batch read operations
- `logs:CreateLogGroup` - Create log groups
- `logs:CreateLogStream` - Create log streams
- `logs:PutLogEvents` - Write logs
- `xray:PutTraceSegments` - OTEL trace export
- `xray:PutTelemetryRecords` - OTEL telemetry

**Go Dependencies**:

```go
// Core AWS SDK
github.com/aws/aws-sdk-go-v2/service/dynamodb
github.com/aws/aws-sdk-go-v2/config

// OpenTelemetry
go.opentelemetry.io/otel
go.opentelemetry.io/otel/exporters/otlp/otlptrace
go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
go.opentelemetry.io/otel/sdk/trace
go.opentelemetry.io/contrib/instrumentation/github.com/aws/aws-lambda-go/otellambda
go.opentelemetry.io/contrib/instrumentation/github.com/aws/aws-sdk-go-v2/otelaws

// Lambda
github.com/aws/aws-lambda-go/lambda
github.com/aws/aws-lambda-go/events
```

### Admin API Lambda Configuration

**Runtime**: `provided.al2` (Custom Go runtime)

**Architecture**: ARM64 (Graviton2)

**Memory**:

- Read operations: 256 MB
- Write operations: 512 MB
- Cache invalidation: 512 MB

**Timeout**:

- Read operations: 10 seconds
- Write operations: 30 seconds
- Cache invalidation: 60 seconds

**Environment Variables**:

```bash
DYNAMODB_TABLE_NAME=MetalFests
AWS_REGION=us-east-1
LOG_LEVEL=info
CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_APP_CLIENT_ID=abc123def456
OTEL_SERVICE_NAME=metal-fests-admin-api
OTEL_EXPORTER_OTLP_ENDPOINT=https://cloudwatch-endpoint
```

**IAM Role Permissions** (Read-write):

- `dynamodb:GetItem`
- `dynamodb:PutItem`
- `dynamodb:UpdateItem`
- `dynamodb:DeleteItem`
- `dynamodb:Query`
- `dynamodb:BatchGetItem`
- `dynamodb:BatchWriteItem`
- `cloudfront:CreateInvalidation`
- `cloudfront:GetInvalidation`
- `logs:CreateLogGroup`
- `logs:CreateLogStream`
- `logs:PutLogEvents`
- `xray:PutTraceSegments`
- `xray:PutTelemetryRecords`

### Function List

**Public API Functions**:

1. **FestivalsFunction**
   - Handler: `cmd/festivals/main.go`
   - Binary: `bootstrap`
   - Routes: `/api/festivals`, `/api/festivals/*`
   - Operations: GET only

2. **BandsFunction**
   - Handler: `cmd/bands/main.go`
   - Binary: `bootstrap`
   - Routes: `/api/bands`, `/api/bands/*`
   - Operations: GET only

3. **GenresFunction**
   - Handler: `cmd/genres/main.go`
   - Binary: `bootstrap`
   - Routes: `/api/genres`, `/api/genres/*`
   - Operations: GET only

4. **RolesFunction**
   - Handler: `cmd/roles/main.go`
   - Binary: `bootstrap`
   - Routes: `/api/roles`, `/api/roles/*`
   - Operations: GET only

**Admin API Functions**:

1. **AdminFestivalsFunction**
   - Handler: `cmd/admin/festivals/main.go`
   - Routes: `/api/admin/festivals/*`
   - Operations: POST, PUT, DELETE

2. **AdminBandsFunction**
   - Handler: `cmd/admin/bands/main.go`
   - Routes: `/api/admin/bands/*`
   - Operations: POST, PUT, DELETE

3. **AdminGenresFunction**
   - Handler: `cmd/admin/genres/main.go`
   - Routes: `/api/admin/genres/*`
   - Operations: POST, PUT

4. **AdminRolesFunction**
   - Handler: `cmd/admin/roles/main.go`
   - Routes: `/api/admin/roles/*`
   - Operations: POST, PUT

5. **AdminCacheFunction**
   - Handler: `cmd/admin/cache/main.go`
   - Routes: `/api/admin/cache/*`
   - Operations: POST, GET

6. **AdminSystemFunction**
   - Handler: `cmd/admin/system/main.go`
   - Routes: `/api/admin/health`, `/api/admin/stats`, `/api/admin/audit`
   - Operations: GET

### Go Project Structure

```text
internal/
  handlers/
    festivals/        # Festival handler logic
    bands/            # Band handler logic
    genres/           # Genre handler logic
    roles/            # Role handler logic
    admin/
      festivals/      # Admin festival operations
      bands/          # Admin band operations
      genres/         # Admin genre operations
      roles/          # Admin role operations
      cache/          # Cache management
      system/         # System operations
  repository/         # DynamoDB access layer
  models/             # Data models
  middleware/         # OTEL, logging middleware
  telemetry/          # OTEL setup
  auth/               # Cognito JWT validation
cmd/
  festivals/main.go
  bands/main.go
  genres/main.go
  roles/main.go
  admin/
    festivals/main.go
    bands/main.go
    genres/main.go
    roles/main.go
    cache/main.go
    system/main.go
```

### OTEL Integration

**OTEL Configuration**:

```go
package main

import (
    "context"
    "github.com/aws/aws-lambda-go/lambda"
    "go.opentelemetry.io/contrib/instrumentation/github.com/aws/aws-lambda-go/otellambda"
    "go.opentelemetry.io/otel"
)

func main() {
    // Initialize OTEL tracer provider
    tp := initTracerProvider()
    defer tp.Shutdown(context.Background())

    otel.SetTracerProvider(tp)

    // Wrap handler with OTEL instrumentation
    lambda.Start(otellambda.InstrumentHandler(handleRequest, otellambda.WithTracerProvider(tp)))
}
```

**Instrumentation Example**:

```go
import (
    "go.opentelemetry.io/contrib/instrumentation/github.com/aws/aws-sdk-go-v2/otelaws"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

// Instrument AWS SDK
otelaws.AppendMiddlewares(&cfg.APIOptions)

// Manual span creation
tracer := otel.Tracer("metal-fests-api")
ctx, span := tracer.Start(ctx, "fetchFestivals")
defer span.End()

span.SetAttributes(
    attribute.String("db.system", "dynamodb"),
    attribute.String("db.operation", "Query"),
    attribute.Int("result.count", len(festivals)),
)
```

## API Gateway Configuration

### Public API Gateway

**API Name**: metal-fests-public-api

**Endpoint Type**: Regional

**CORS Configuration**:

```json
{
  "allowOrigins": ["https://metalfests.com", "http://localhost:3000"],
  "allowMethods": ["GET", "OPTIONS"],
  "allowHeaders": ["Content-Type"],
  "maxAge": 3600
}
```

**Request/Response Validation**:

```json
{
  "requestValidation": {
    "enabled": true,
    "validateRequestBody": true,
    "validateRequestParameters": true
  },
  "responseValidation": {
    "enabled": true,
    "validateResponseBody": true
  }
}
```

**Stage Configuration**:

- **Stage Name**: prod
- **Stage Variables**:
  - `lambdaAlias=live`
  - `environment=production`
- **Method Settings**:
  - Logging level: INFO
  - Data trace: false (disabled for production)
  - Metrics: true
  - Throttling: 10,000 requests/second burst, 5,000 steady state

**Usage Plans**:

- **Public Plan**:
  - Rate: 1,000 requests/second
  - Burst: 2,000 requests
  - No quota limit
  - No API key required

### Admin API Gateway

**API Name**: metal-fests-admin-api

**Endpoint Type**: Regional

**Authorizer Configuration**:

```json
{
  "name": "CognitoAuthorizer",
  "type": "COGNITO_USER_POOLS",
  "identitySource": "$request.header.Authorization",
  "userPoolArn": "arn:aws:cognito-idp:us-east-1:123456789012:userpool/us-east-1_XXXXXXXXX",
  "authorizerResultTtlInSeconds": 300
}
```

**CORS Configuration**:

```json
{
  "allowOrigins": ["https://admin.metalfests.com", "http://localhost:3001"],
  "allowMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  "allowHeaders": ["Content-Type", "Authorization"],
  "exposeHeaders": ["X-Invalidation-Id"],
  "maxAge": 3600,
  "allowCredentials": true
}
```

**Stage Configuration**:

- **Stage Name**: prod
- **Method Settings**:
  - Authorization: Cognito User Pool
  - Request validation: Enabled
  - Throttling: 100 requests/second burst, 50 steady state per user

**Usage Plans**:

- **Admin Plan**:
  - Rate: 100 requests/second
  - Burst: 200 requests
  - Quota: 100,000 requests/month
  - Per API key (required)

## DynamoDB Configuration

### Table Configuration

**Table Name**: MetalFests

**Billing Mode**: On-demand (PAY_PER_REQUEST)

**Primary Key**:

- Partition Key: `PK` (String)
- Sort Key: `SK` (String)

**Attributes**:

```json
{
  "PK": "String",
  "SK": "String",
  "GSI1PK": "String",
  "GSI1SK": "String",
  "GSI2PK": "String",
  "GSI2SK": "String",
  "GSI3PK": "String",
  "GSI3SK": "String"
}
```

### Global Secondary Indexes

**GSI1** - Date-based queries:

- Partition Key: `GSI1PK` (String)
- Sort Key: `GSI1SK` (String)
- Projection: ALL
- Purpose: Query festivals by date, upcoming festivals

**GSI2** - Location-based queries:

- Partition Key: `GSI2PK` (String)
- Sort Key: `GSI2SK` (String)
- Projection: ALL
- Purpose: Query festivals by location/country

**GSI3** - Band status queries:

- Partition Key: `GSI3PK` (String)
- Sort Key: `GSI3SK` (String)
- Projection: ALL
- Purpose: Query bands by review status

### Advanced Features

**Point-in-Time Recovery**: Enabled

**Encryption**:

- At rest: AWS managed KMS key
- In transit: TLS 1.2+

**Streams**: Disabled (can be enabled for future enhancements)

**Backup**:

- Daily automated backups
- Retention: 7 days

**Tags**:

```text
Environment=production
Application=metal-fests
ManagedBy=terraform
```

## CloudFront Configuration

### Distribution Settings

**Origin**:

- Domain: `{api-id}.execute-api.{region}.amazonaws.com`
- Origin Path: `/prod`
- Protocol: HTTPS only
- Origin Shield: Enabled (us-east-1)

**Cache Behavior**:

- Viewer Protocol Policy: Redirect HTTP to HTTPS
- Allowed Methods: GET, HEAD, OPTIONS
- Cached Methods: GET, HEAD, OPTIONS
- Compress Objects: true

**Cache Key and Origin Requests**:

```json
{
  "queryStrings": "all",
  "headers": ["Accept", "Authorization"],
  "cookies": "none"
}
```

### Cache Policy

**Cache Policy**:

- Name: metal-fests-cache-policy
- Min TTL: 0 seconds
- Max TTL: 86400 seconds (24 hours)
- Default TTL: 300 seconds (5 minutes)

**TTL by Endpoint**:

| Endpoint Pattern | TTL | Reason |
|-----------------|-----|--------|
| `/api/festivals` | 10 min | Changes infrequently |
| `/api/festivals/upcoming` | 5 min | Date-sensitive |
| `/api/festivals/{key}` | 30 min | Static festival info |
| `/api/bands` | 10 min | Changes infrequently |
| `/api/bands/{key}` | 30 min | Band details rarely change |
| `/api/genres` | 60 min | Very stable data |
| `/api/roles` | 60 min | Very stable data |
| POST/PUT/DELETE | No cache | Mutations |

**Origin Request Policy**:

- Name: metal-fests-origin-policy
- Include all query strings
- Include specified headers: Accept, Authorization, X-Api-Key
- No cookies

**Response Headers Policy**:

```json
{
  "SecurityHeadersPolicy": {
    "StrictTransportSecurity": {
      "AccessControlMaxAgeSec": 31536000,
      "IncludeSubdomains": true
    },
    "ContentTypeOptions": {
      "Override": true
    },
    "FrameOptions": {
      "FrameOption": "DENY",
      "Override": true
    },
    "XSSProtection": {
      "ModeBlock": true,
      "Protection": true,
      "Override": true
    }
  }
}
```

**Custom Error Responses**:

```json
[
  {
    "ErrorCode": 403,
    "ResponseCode": 404,
    "ResponsePagePath": "/error.html",
    "ErrorCachingMinTTL": 300
  },
  {
    "ErrorCode": 404,
    "ResponseCode": 404,
    "ResponsePagePath": "/error.html",
    "ErrorCachingMinTTL": 300
  }
]
```

### WAF Integration

**WAF Rules**: Enabled

- Rate-based rule (2,000 requests per 5 minutes per IP)
- Block common SQL injection patterns
- Block common XSS patterns
- Geographic restrictions (optional)
- Bot detection

## Authentication & Authorization Infrastructure

### AWS Cognito User Pool

**Configuration**:

- **User Pool Name**: `metal-fests-admin-pool`
- **Identity Providers**: SAML 2.0 (AWS IAM Identity Center)
- **MFA**: Required for all admin users
- **Password Policy**:
  - Minimum length: 12 characters
  - Requires uppercase, lowercase, numbers, symbols
  - Password rotation: 90 days
- **Token Validity**:
  - Access token: 1 hour
  - Refresh token: 30 days
  - ID token: 1 hour

**User Groups**:

1. **AdminFull** - Full CRUD access to all resources
2. **AdminEditor** - Can edit festivals and bands, cannot delete
3. **AdminViewer** - Read-only access to admin endpoints

**App Client Settings**:

```json
{
  "clientName": "metal-fests-admin-client",
  "generateSecret": false,
  "refreshTokenValidity": 30,
  "accessTokenValidity": 1,
  "idTokenValidity": 1,
  "tokenValidityUnits": {
    "refreshToken": "days",
    "accessToken": "hours",
    "idToken": "hours"
  },
  "explicitAuthFlows": [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}
```

### SAML 2.0 Integration

**Identity Provider Configuration**:

```xml
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata">
  <IDPSSODescriptor>
    <NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</NameIDFormat>
    <SingleSignOnService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="https://identity-center.aws.amazon.com/saml/assertion"/>
  </IDPSSODescriptor>
</EntityDescriptor>
```

**SAML Attribute Mapping**:

| SAML Attribute | Cognito Attribute | Description |
|----------------|-------------------|-------------|
| `email` | `email` | User email address |
| `name` | `name` | Full name |
| `groups` | `cognito:groups` | Admin group membership |
| `sub` | `sub` | Unique user identifier |

**Identity Provider (SAML) Configuration in Cognito**:

```json
{
  "providerName": "IAMIdentityCenter",
  "providerType": "SAML",
  "attributeMapping": {
    "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    "name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
    "custom:groups": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/groups"
  }
}
```

### AWS IAM Identity Center

**Setup Steps**:

1. Enable IAM Identity Center in your AWS Organization
2. Create Admin Application in IAM Identity Center:
   - Application name: `MetalFests Admin Panel`
   - ACS URL: `https://<cognito-domain>.auth.<region>.amazoncognito.com/saml2/idpresponse`
   - Entity ID: `urn:amazon:cognito:sp:<user-pool-id>`
3. Assign users and groups
4. Configure attribute mappings
5. Download SAML metadata XML
6. Import into Cognito as SAML Identity Provider

**Benefits**:

- Centralized user management
- SSO across AWS accounts and applications
- MFA enforced at IdP level
- Integration with corporate directory (AD, Okta, etc.)

## Monitoring & Observability

### CloudWatch Metrics

**Lambda Metrics**:

- Invocations
- Duration (P50, P90, P99)
- Errors
- Throttles
- Concurrent executions
- Iterator age (for streams)

**API Gateway Metrics**:

- Count (total requests)
- 4XXError, 5XXError
- Latency (P50, P90, P99)
- IntegrationLatency
- CacheHitCount, CacheMissCount

**DynamoDB Metrics**:

- ConsumedReadCapacityUnits
- ConsumedWriteCapacityUnits
- UserErrors, SystemErrors
- Query/Scan consumed capacity

**CloudFront Metrics**:

- Requests
- BytesDownloaded, BytesUploaded
- 4xxErrorRate, 5xxErrorRate
- CacheHitRate
- OriginLatency

### CloudWatch Logs

**Log Groups**:

- `/aws/lambda/festivals-function`
- `/aws/lambda/bands-function`
- `/aws/lambda/genres-function`
- `/aws/lambda/roles-function`
- `/aws/lambda/admin-festivals-function`
- `/aws/lambda/admin-bands-function`
- `/aws/lambda/admin-cache-function`
- `/aws/apigateway/metal-fests-public-api`
- `/aws/apigateway/metal-fests-admin-api`

**Log Format** (OTEL JSON format):

```json
{
  "timestamp": "2025-11-23T10:00:00.123Z",
  "level": "INFO",
  "service.name": "metal-fests-public-api",
  "trace.id": "abc123def456",
  "span.id": "789ghi012jkl",
  "function": "GetFestivals",
  "message": "Fetched 100 festivals",
  "duration_ms": 45,
  "status_code": 200,
  "cache_hit": true,
  "attributes": {
    "http.method": "GET",
    "http.route": "/api/festivals",
    "http.status_code": 200,
    "db.system": "dynamodb",
    "db.operation": "Query"
  }
}
```

**Log Retention**: 30 days

**Structured Logging in Go**:

```go
import (
    "go.opentelemetry.io/otel/trace"
    "go.uber.org/zap"
)

// Logger with OTEL context
logger.Info("fetched festivals",
    zap.String("trace.id", trace.SpanContextFromContext(ctx).TraceID().String()),
    zap.String("span.id", trace.SpanContextFromContext(ctx).SpanID().String()),
    zap.Int("count", len(festivals)),
    zap.Int64("duration_ms", elapsed.Milliseconds()),
)
```

### OpenTelemetry (OTEL) Tracing

**OTEL Configuration**:

- **Exporter**: AWS X-Ray (via OTLP)
- **Propagator**: AWS X-Ray propagator for CloudFront/API Gateway context
- **Sampler**: Parent-based with trace ID ratio (10% sampling)
- **Resource**: Service name, version, environment

**Trace Data Collected**:

- API Gateway → Lambda invocation
- Lambda handler execution
- DynamoDB Query/GetItem/PutItem/UpdateItem operations
- CloudFront cache invalidation calls
- External HTTP calls (if any)
- Custom business logic spans

**Trace Context Propagation**:

- CloudFront injects `X-Amzn-Trace-Id` header
- API Gateway propagates to Lambda
- Lambda OTEL SDK automatically extracts and continues trace
- All AWS SDK calls automatically instrumented

**Sampling Strategy**:

```bash
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # 10% sampling
```

### AWS Grafana

**Data Sources**:

1. **CloudWatch Metrics**
   - Lambda performance metrics
   - API Gateway metrics
   - DynamoDB metrics
   - CloudFront metrics

2. **CloudWatch Logs Insights**
   - Log queries and analysis
   - Error rate calculations
   - Custom metric extraction

3. **AWS X-Ray**
   - Distributed tracing visualization
   - Service map
   - Trace analysis

**Dashboards**:

1. **API Overview**
   - Request rate (requests/second)
   - Error rate (4XX, 5XX)
   - Latency percentiles (P50, P90, P99)
   - Cache hit rate
   - Top endpoints by traffic

2. **Performance Dashboard**
   - Lambda duration by function
   - DynamoDB consumed capacity
   - API Gateway integration latency
   - CloudFront origin latency

3. **Error Analysis**
   - Error count by endpoint
   - Error rate trends
   - Top error messages
   - Failed traces with details

4. **Business Metrics**
   - Most viewed festivals
   - Most searched bands
   - Geographic distribution of requests
   - Popular endpoints

**Example Grafana Panel Queries**:

```promql
# Request rate
rate(aws_apigateway_count_sum[5m])

# P99 latency
quantile_over_time(0.99, aws_lambda_duration_milliseconds[5m])

# Error rate
sum(rate(aws_apigateway_5xxerror_sum[5m])) / sum(rate(aws_apigateway_count_sum[5m]))

# Cache hit rate
sum(rate(cloudfront_cache_hit_count[5m])) / sum(rate(cloudfront_requests[5m]))
```

**Alerts in Grafana**:

- High error rate (> 1% for 5 minutes)
- High P99 latency (> 3s for 5 minutes)
- Low cache hit rate (< 70% for 10 minutes)
- DynamoDB throttling detected
- Lambda concurrent execution approaching limit

### Alarms

**Critical Alarms**:

1. **High Error Rate**: 5XX errors > 1% for 5 minutes
2. **High Latency**: P99 latency > 3 seconds for 5 minutes
3. **DynamoDB Throttling**: Any throttled requests
4. **Lambda Errors**: Error rate > 1% for 5 minutes

**Warning Alarms**:

1. **Cache Miss Rate**: < 70% hit rate for 10 minutes
2. **Lambda Duration**: P99 > 5 seconds for 10 minutes
3. **API Gateway 4XX**: > 5% of requests for 10 minutes

**Alarm Actions**:

- SNS topic notification
- Email to operations team
- PagerDuty integration (critical only)

## Security

### Data Protection

**Encryption**:

- At rest: DynamoDB encryption with AWS managed keys
- In transit: TLS 1.2+ for all API communication
- Secrets: API keys and tokens stored in AWS Secrets Manager

**Data Access**:

- Principle of least privilege for IAM roles
- No direct DynamoDB access from public internet
- Lambda functions use execution role with minimal permissions
- All admin operations logged with user identity

### Network Security

**VPC Configuration** (optional):

- Lambda functions in private subnets
- VPC endpoints for DynamoDB access
- NAT Gateway for external API calls
- Security groups restrict traffic

**WAF Rules**:

- Rate limiting per IP
- SQL injection protection
- XSS protection
- Geographic restrictions (if needed)
- Bot detection

### IAM Policies

**Public API Lambda Execution Role** (Read-only):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:BatchGetItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:123456789012:table/MetalFests",
        "arn:aws:dynamodb:us-east-1:123456789012:table/MetalFests/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords"
      ],
      "Resource": "*"
    }
  ]
}
```

**Admin API Lambda Execution Role** (Read-write):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:123456789012:table/MetalFests",
        "arn:aws:dynamodb:us-east-1:123456789012:table/MetalFests/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation"
      ],
      "Resource": "arn:aws:cloudfront::123456789012:distribution/E1234567890ABC"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords"
      ],
      "Resource": "*"
    }
  ]
}
```

**Security Best Practices**:

1. All admin operations logged to CloudWatch with user identity
2. MFA required for all admin users
3. IP allowlisting (optional, via WAF)
4. Regular access reviews of IAM Identity Center users
5. Audit logs retained for compliance (90 days minimum)
6. Failed authentication attempts monitored and alerted

## Performance Optimization

### Lambda Optimization

**Cold Start Mitigation**:

- Provisioned concurrency for critical functions (festivals, bands)
- Minimal dependencies in deployment package
- Connection pooling for DynamoDB client

**Function Optimization**:

- Batch operations where possible (BatchGetItem, BatchWriteItem)
- Parallel queries to multiple GSIs
- Response compression for large payloads
- Early returns for validation errors

**Memory Allocation**:

- Right-size memory based on workload
- Monitor CloudWatch Lambda Insights
- Adjust based on actual usage patterns

### DynamoDB Optimization

**Access Patterns**:

- Use Query instead of Scan wherever possible
- Leverage GSIs for efficient filtering
- Batch operations for bulk reads/writes

**Data Modeling**:

- Denormalize frequently accessed data
- Single-table design reduces cross-table queries
- Metadata entities for aggregated views

**Capacity Management**:

- On-demand billing for unpredictable traffic
- Monitor consumed capacity
- Set up CloudWatch alarms for throttling

### API Gateway Optimization

**Request Handling**:

- Enable compression
- Request/response caching at gateway level
- Efficient routing to Lambda functions

**Payload Optimization**:

- Validate requests early
- Reject invalid requests before Lambda invocation
- Use binary media types efficiently

## Deployment Strategy

### Environment Management

**Environments**:

1. **Development** (`dev`)
   - Separate AWS account
   - Reduced resources
   - Debug logging enabled

2. **Staging** (`staging`)
   - Production-like environment
   - Same AWS account as prod
   - Used for final testing

3. **Production** (`prod`)
   - Production AWS account
   - Full resources
   - Info-level logging

### CI/CD Pipeline

**Pipeline Stages**:

1. **Source**:
   - GitHub repository
   - Branch: `main` (production), `develop` (staging)
   - Webhook trigger on push

2. **Build**:
   - Compile Go binaries for Lambda (GOOS=linux GOARCH=arm64)
   - Run unit tests (`go test ./...`)
   - Run linting (`golangci-lint`)
   - Build deployment packages (zip with `bootstrap` binary)
   - Generate Terraform/CDK templates

3. **Test**:
   - Integration tests against staging DynamoDB
   - API contract tests
   - Performance tests

4. **Deploy to Staging**:
   - Deploy Lambda functions
   - Update API Gateway
   - Run smoke tests

5. **Manual Approval** (for production):
   - Review staging test results
   - Approve deployment

6. **Deploy to Production**:
   - Blue-green deployment
   - Deploy new Lambda versions
   - Update API Gateway stage
   - Monitor for errors

7. **Post-Deployment**:
   - Run smoke tests
   - Monitor metrics for 15 minutes
   - Auto-rollback on errors

**Tools**:

- GitHub Actions / AWS CodePipeline
- Terraform or AWS CDK for infrastructure
- Go test for unit tests
- Postman/Newman for API tests

### Blue-Green Deployment

**Lambda Versioning**:

- Publish new version
- Create new alias pointing to version
- Update API Gateway to use new alias
- Keep previous version for rollback

**Rollback Strategy**:

1. Detect errors via CloudWatch alarms
2. Automatically revert API Gateway to previous alias
3. Keep old Lambda version for 24 hours
4. Investigate and fix issues
5. Redeploy with fixes

## Cost Optimization

### Cost Breakdown

**Estimated Monthly Costs** (for 1M requests/month):

| Service | Usage | Cost |
|---------|-------|------|
| API Gateway | 1M requests | $3.50 |
| Lambda | 1M invocations, 256 MB, 500ms avg | $0.42 |
| DynamoDB | On-demand, ~10 GB, 1M reads, 100K writes | $2.75 |
| CloudFront | 1M requests, 10 GB transfer | $1.20 |
| CloudWatch | Logs (5 GB), Metrics | $2.50 |
| Cognito | 1,000 MAU | Free tier |
| **Total** | | **~$10.37/month** |

**Scaling** (for 10M requests/month):

- API Gateway: $35
- Lambda: $4.20
- DynamoDB: $27.50
- CloudFront: $12
- CloudWatch: $8
- Cognito: $2.75 (additional MAU)
- **Total**: **~$89.45/month**

### Optimization Strategies

1. **CloudFront Caching**:
   - Reduces API Gateway + Lambda invocations
   - 70%+ hit rate = 70% cost reduction on compute

2. **DynamoDB On-Demand**:
   - Pay only for what you use
   - No idle capacity charges
   - Auto-scaling without management

3. **Lambda Memory Tuning**:
   - Right-size based on actual usage
   - Higher memory = faster execution = lower cost

4. **API Gateway Caching**:
   - Optional stage-level caching
   - Further reduces Lambda invocations
   - $0.02/hour for 0.5 GB cache

5. **CloudWatch Log Retention**:
   - 30-day retention instead of indefinite
   - Archive old logs to S3 Glacier
   - Reduce log verbosity in production

6. **Reserved Capacity** (future):
   - If traffic becomes predictable
   - DynamoDB reserved capacity (up to 76% savings)
   - Lambda provisioned concurrency (pay for uptime)

## Related Documentation

- **[Public API Design](API_DESIGN.md)** - Public REST API specifications and endpoints
- **[Admin API Design](ADMIN_API_DESIGN.md)** - Admin REST API with authentication
- **[DynamoDB Bands Data Model](DYNAMODB_BANDS_DATA_MODEL.md)** - Complete bands schema and query patterns
- **[DynamoDB Festivals Data Model](DYNAMODB_FESTIVALS_DATA_MODEL.md)** - Complete festivals schema and query patterns
- **Infrastructure Code**: `/infra` - AWS CDK/Terraform definitions
- **Lambda Functions**: `/internal/api` - Go implementation
