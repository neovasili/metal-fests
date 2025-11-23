# Metal Fests Public API Design

- [Metal Fests Public API Design](#metal-fests-public-api-design)
  - [Overview](#overview)
  - [Architecture](#architecture)
    - [Infrastructure Components](#infrastructure-components)
    - [Architecture Diagram](#architecture-diagram)
  - [API Endpoints](#api-endpoints)
    - [Festivals API](#festivals-api)
    - [Bands API](#bands-api)
    - [Genres API](#genres-api)
    - [Roles API](#roles-api)
  - [API Specifications](#api-specifications)
    - [Festivals](#festivals)
      - [GET /api/festivals](#get-apifestivals)
      - [GET /api/festivals/upcoming](#get-apifestivalsupcoming)
      - [GET /api/festivals/{key}](#get-apifestivalskey)
    - [Bands](#bands)
      - [GET /api/bands](#get-apibands)
      - [GET /api/bands/{key}](#get-apibandskey)
    - [Genres](#genres)
      - [GET /api/genres](#get-apigenres)
      - [GET /api/genres/{key}](#get-apigenreskey)
    - [Roles](#roles)
      - [GET /api/roles](#get-apiroles)
      - [GET /api/roles/{key}](#get-apiroleskey)
  - [Infrastructure \& Deployment](#infrastructure--deployment)
  - [Caching Strategy](#caching-strategy)
    - [Cache TTL by Endpoint](#cache-ttl-by-endpoint)
    - [Cache Invalidation](#cache-invalidation)
  - [Error Handling](#error-handling)
    - [Standard Error Response](#standard-error-response)
    - [HTTP Status Codes](#http-status-codes)
  - [Authentication \& Authorization](#authentication--authorization)
    - [Public Endpoints](#public-endpoints)
    - [Admin Endpoints](#admin-endpoints)
  - [Rate Limiting](#rate-limiting)
    - [CloudFront Level](#cloudfront-level)
    - [API Gateway Level](#api-gateway-level)
  - [Request/Response Examples](#requestresponse-examples)
    - [Example 1: Get All Festivals](#example-1-get-all-festivals)
    - [Example 2: Get Band Details](#example-2-get-band-details)
    - [Example 3: Create Festival Edition](#example-3-create-festival-edition)
    - [Example 4: Update Band](#example-4-update-band)
    - [Example 5: Invalidate Cache](#example-5-invalidate-cache)
  - [Performance Considerations](#performance-considerations)
    - [Lambda Optimization](#lambda-optimization)
    - [DynamoDB Optimization](#dynamodb-optimization)
    - [API Gateway Optimization](#api-gateway-optimization)
  - [Migration from Current System](#migration-from-current-system)
    - [Phase 1: Infrastructure Setup](#phase-1-infrastructure-setup)
    - [Phase 2: Data Migration](#phase-2-data-migration)
    - [Phase 3: API Deployment](#phase-3-api-deployment)
    - [Phase 4: Frontend Integration](#phase-4-frontend-integration)
    - [Phase 5: Cutover](#phase-5-cutover)
  - [API Versioning](#api-versioning)
    - [Current Approach](#current-approach)
  - [Related Documentation](#related-documentation)

## Overview

This document describes the **Public REST API** design for the Metal Fests application, including detailed infrastructure specifications for deployment on AWS using API Gateway, Lambda, DynamoDB, and CloudFront.

The public API provides **read-only access** to festival and band data for public consumption (timeline view, map view, band information). All administrative operations (create, update, delete) are handled by a separate Admin API (see [Admin API Design](ADMIN_API_DESIGN.md)).

**Key Characteristics**:

- Read-only endpoints (GET only)
- No authentication required
- Aggressive caching via CloudFront CDN
- High availability and low latency
- Backend written in **Golang**
- Observability via **OpenTelemetry (OTEL)**
- Monitoring via **AWS Grafana + CloudWatch**
- Request/response validation via **API Gateway schemas**

## Architecture

### Infrastructure Components

The Metal Fests Public API is built on AWS serverless architecture:

1. **CloudFront** - CDN layer for caching GET requests
2. **API Gateway** - REST API endpoint management with request/response schema validation
3. **AWS Lambda** - Serverless compute running **Golang** functions
4. **DynamoDB** - NoSQL database for data persistence
5. **CloudWatch** - Log aggregation and metrics collection
6. **AWS Grafana** - Visualization and dashboards
7. **OpenTelemetry (OTEL)** - Distributed tracing and observability
8. **IAM** - Security and access control

### Architecture Diagram

```text
┌─────────────┐
│   Client    │
│ (Browser)   │
└──────┬──────┘
       │
       │ HTTPS
       ▼
┌─────────────────────────────────────────┐
│          CloudFront CDN                 │
│  ┌───────────────────────────────────┐  │
│  │  Cache Layer (GET requests)       │  │
│  │  - TTL: 5-60 minutes              │  │
│  │  - Cache invalidation via Admin  │  │
│  └───────────────────────────────────┘  │
└──────┬──────────────────────────────────┘
       │
       │ Cache MISS
       ▼
┌─────────────────────────────────────────┐
│         API Gateway (REST)              │
│  ┌───────────────────────────────────┐  │
│  │  - Schema validation (request)    │  │
│  │  - Schema validation (response)   │  │
│  │  - Rate limiting                  │  │
│  │  - CORS configuration             │  │
│  └───────────────────────────────────┘  │
└──────┬──────────────────────────────────┘
       │
       │ Invokes
       ▼
┌─────────────────────────────────────────┐
│    AWS Lambda (Golang Runtime)          │
│  ┌───────────────┐  ┌────────────────┐  │
│  │  Festivals    │  │    Bands       │  │
│  │  Handler      │  │    Handler     │  │
│  │  (Go)         │  │    (Go)        │  │
│  └───────┬───────┘  └────────┬───────┘  │
│          │                   │          │
│  ┌───────▼───────┐  ┌────────▼───────┐  │
│  │   Genres      │  │    Roles       │  │
│  │   Handler     │  │    Handler     │  │
│  │   (Go)        │  │    (Go)        │  │
│  └───────┬───────┘  └────────┬───────┘  │
│          │                   │          │
│          └───────┬───────────┘          │
│                  │                      │
│          ┌───────▼───────┐              │
│          │ OTEL SDK      │              │
│          │ (Tracing/     │              │
│          │  Metrics)     │              │
│          └───────────────┘              │
└──────┬──────────────────────────────────┘
       │
       │ AWS SDK (Go)
       ▼
┌─────────────────────────────────────────┐
│            DynamoDB                     │
│  ┌───────────────────────────────────┐  │
│  │  Table: MetalFests                │  │
│  │  - On-demand billing              │  │
│  │  - Point-in-time recovery         │  │
│  │  - Encryption at rest             │  │
│  │                                   │  │
│  │  GSI1: Date-based queries         │  │
│  │  GSI2: Location-based queries     │  │
│  │  GSI3: Band review status         │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘

        Observability Stack
┌─────────────────────────────────────────┐
│          CloudWatch                     │
│  - Logs (OTEL formatted)                │
│  - Metrics (OTEL + Lambda metrics)      │
│  - Log Insights queries                 │
└──────┬──────────────────────────────────┘
       │
       │ Data source
       ▼
┌─────────────────────────────────────────┐
│          AWS Grafana                    │
│  - Real-time dashboards                 │
│  - Request latency (P50/P90/P99)        │
│  - Error rate monitoring                │
│  - Distributed tracing visualization    │
│  - Custom business metrics              │
└─────────────────────────────────────────┘
```

## API Endpoints

### Festivals API

| Method | Endpoint | Description | Cache |
|--------|----------|-------------|-------|
| GET | `/api/festivals` | Get all festivals with latest editions | 10 min |
| GET | `/api/festivals/upcoming` | Get upcoming festivals from current date | 5 min |
| GET | `/api/festivals/{key}` | Get festival details with all editions | 30 min |
| GET | `/api/festivals/{key}/editions` | Get all editions for a festival | 30 min |
| GET | `/api/festivals/{key}/editions/{year}` | Get specific edition | 60 min |

> **Note**: Admin operations (POST, PUT, DELETE) are documented in the [Admin API Design](ADMIN_API_DESIGN.md) document.

### Bands API

| Method | Endpoint | Description | Cache |
|--------|----------|-------------|-------|
| GET | `/api/bands` | Get all bands metadata | 10 min |
| GET | `/api/bands/reviewed` | Get only reviewed bands | 10 min |
| GET | `/api/bands/unreviewed` | Get bands needing review | 5 min |
| GET | `/api/bands/{key}` | Get band details | 30 min |
| GET | `/api/bands/{key}/festivals` | Get festivals featuring this band | 10 min |

> **Note**: Admin operations (POST, PUT, DELETE) are documented in the [Admin API Design](ADMIN_API_DESIGN.md) document.

### Genres API

| Method | Endpoint | Description | Cache |
|--------|----------|-------------|-------|
| GET | `/api/genres` | Get all genres | 60 min |
| GET | `/api/genres/{key}` | Get genre details | 60 min |
| GET | `/api/genres/{key}/bands` | Get bands in this genre | 10 min |

> **Note**: Admin operations (POST, PUT) are documented in the [Admin API Design](ADMIN_API_DESIGN.md) document.

### Roles API

| Method | Endpoint | Description | Cache |
|--------|----------|-------------|-------|
| GET | `/api/roles` | Get all roles | 60 min |
| GET | `/api/roles/{key}` | Get role details | 60 min |
| GET | `/api/roles/{key}/members` | Get band members with this role | 10 min |

> **Note**: Admin operations (POST, PUT) are documented in the [Admin API Design](ADMIN_API_DESIGN.md) document.

## API Specifications

### Festivals

#### GET /api/festivals

Returns all festivals with their latest edition information.

**Response**:

```json
{
  "festivals": [
    {
      "festivalKey": "hellfest",
      "festivalName": "Hellfest",
      "location": "Clisson, France",
      "coordinates": {
        "lat": 47.0889,
        "lng": -1.2806
      },
      "website": "https://www.hellfest.fr",
      "poster": "https://example.com/hellfest-logo.jpg",
      "latestEdition": {
        "year": 2026,
        "dates": {
          "start": "2026-06-18",
          "end": "2026-06-21"
        },
        "bandCount": 150,
        "ticketPrice": 259.00,
        "currency": "EUR"
      },
      "editions": [2024, 2025, 2026],
      "totalEditions": 3
    }
  ],
  "count": 100
}
```

#### GET /api/festivals/upcoming

Returns upcoming festivals from current date.

**Query Parameters**:

- `limit` (optional): Maximum number of results (default: 50, max: 100)
- `offset` (optional): Offset for pagination (default: 0)

**Response**: Same structure as GET /api/festivals

#### GET /api/festivals/{key}

Returns complete festival information including all editions.

**Response**:

```json
{
  "festival": {
    "key": "hellfest",
    "name": "Hellfest",
    "location": "Clisson, France",
    "coordinates": {
      "lat": 47.0889,
      "lng": -1.2806
    },
    "website": "https://www.hellfest.fr",
    "poster": "https://example.com/hellfest-logo.jpg",
    "description": "One of Europe's largest metal festivals"
  },
  "editions": [
    {
      "year": 2026,
      "dates": {
        "start": "2026-06-18",
        "end": "2026-06-21"
      },
      "bands": [
        {
          "key": "metallica",
          "name": "Metallica",
          "size": 0
        }
      ],
      "ticketPrice": 259.00,
      "currency": "EUR",
      "status": "announced"
    }
  ]
}
```

### Bands

#### GET /api/bands

Returns all bands with metadata.

**Query Parameters**:

- `reviewed` (optional): Filter by review status (true/false)
- `limit` (optional): Maximum number of results (default: 100, max: 500)
- `offset` (optional): Offset for pagination (default: 0)

**Response**:

```json
{
  "bands": [
    {
      "key": "metallica",
      "name": "Metallica",
      "country": "United States",
      "genreKeys": ["heavy-metal", "thrash-metal"],
      "genreNames": ["Heavy Metal", "Thrash Metal"],
      "logo": "https://example.com/metallica-logo.png",
      "reviewed": true,
      "festivalCount": 15
    }
  ],
  "count": 250
}
```

#### GET /api/bands/{key}

Returns complete band information.

**Response**:

```json
{
  "band": {
    "key": "metallica",
    "name": "Metallica",
    "country": "United States",
    "description": "American heavy metal band...",
    "logo": "https://example.com/metallica-logo.png",
    "headlineImage": "https://example.com/metallica-headline.jpg",
    "website": "https://www.metallica.com",
    "spotify": "https://open.spotify.com/artist/2ye2Wgw4gimLv2eAKyk1NB",
    "genreKeys": ["heavy-metal", "thrash-metal"],
    "members": [
      {
        "name": "James Hetfield",
        "roleKeys": ["vocals", "rhythm-guitar"]
      }
    ],
    "reviewed": true
  },
  "genres": [
    {
      "key": "heavy-metal",
      "name": "Heavy Metal",
      "description": "A genre of rock music..."
    }
  ],
  "roles": [
    {
      "key": "vocals",
      "name": "Vocals",
      "category": "voice"
    }
  ]
}
```

### Genres

#### GET /api/genres

Returns all genres.

**Response**:

```json
{
  "genres": [
    {
      "key": "heavy-metal",
      "name": "Heavy Metal",
      "bandCount": 250
    }
  ],
  "count": 50
}
```

#### GET /api/genres/{key}

Returns genre details.

**Response**:

```json
{
  "genre": {
    "key": "heavy-metal",
    "name": "Heavy Metal",
    "description": "A genre of rock music...",
    "bandCount": 250
  }
}
```

### Roles

#### GET /api/roles

Returns all roles.

**Response**:

```json
{
  "roles": [
    {
      "key": "vocals",
      "name": "Vocals",
      "category": "voice",
      "bandMemberCount": 450
    }
  ],
  "count": 20
}
```

#### GET /api/roles/{key}

Returns role details.

**Response**:

```json
{
  "role": {
    "key": "vocals",
    "name": "Vocals",
    "description": "Lead or backing vocals",
    "category": "voice",
    "bandMemberCount": 450
  }
}
```

## Infrastructure & Deployment

The complete infrastructure architecture, deployment strategy, monitoring setup, and cost optimization details are documented in the [API and Backend Infrastructure Design](API_AND_BACKEND_INFRASTRUCTURE_DESIGN.md) document.

**Key Infrastructure Components**:

- AWS Lambda (Golang) for compute
- Amazon API Gateway for API management
- Amazon DynamoDB (single-table design)
- Amazon CloudFront for CDN and caching
- CloudWatch + AWS Grafana + OpenTelemetry for observability

For infrastructure-specific details including:

- Lambda function configuration and IAM policies
- API Gateway setup and usage plans
- DynamoDB table schema and GSI configuration
- CloudFront distribution and cache policies
- Monitoring dashboards and alarms
- Deployment pipelines and strategies
- Cost breakdown and optimization

Please refer to the [API and Backend Infrastructure Design](API_AND_BACKEND_INFRASTRUCTURE_DESIGN.md) document.

## Caching Strategy

### Cache TTL by Endpoint

| Endpoint Pattern | TTL | Reason |
|-----------------|-----|--------|
| `/api/festivals` | 10 min | Changes infrequently |
| `/api/festivals/upcoming` | 5 min | Date-sensitive |
| `/api/festivals/{key}` | 30 min | Static festival info |
| `/api/festivals/{key}/editions/{year}` | 60 min | Historical data rarely changes |
| `/api/bands` | 10 min | Changes infrequently |
| `/api/bands/{key}` | 30 min | Band details rarely change |
| `/api/genres` | 60 min | Very stable data |
| `/api/roles` | 60 min | Very stable data |
| POST/PUT/DELETE | No cache | Mutations |

### Cache Invalidation

**Automatic Invalidation**:
After any write operation (POST/PUT/DELETE), the Lambda function automatically triggers CloudFront cache invalidation for affected paths.

**Invalidation Patterns**:

1. **Festival Update**:

   ```text
   /api/festivals
   /api/festivals/upcoming
   /api/festivals/{key}/*
   ```

2. **Band Update**:

   ```text
   /api/bands
   /api/bands/{key}
   /api/festivals/*  (if band is in any festival)
   ```

3. **Genre/Role Update**:

   ```text
   /api/genres
   /api/genres/{key}
   /api/bands  (all bands may reference this)
   ```

**Manual Invalidation**:
Admins can trigger manual cache invalidation via:

```http
POST /api/admin/cache/invalidate
```

## Error Handling

### Standard Error Response

All error responses follow this structure:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Festival with key 'invalid-key' not found",
    "details": {},
    "timestamp": "2025-11-23T10:00:00Z",
    "requestId": "abc123-def456-ghi789"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful GET request |
| 201 | Created | Successful POST request |
| 204 | No Content | Successful DELETE request |
| 400 | Bad Request | Invalid request body/parameters |
| 401 | Unauthorized | Missing or invalid API key |
| 403 | Forbidden | Valid API key but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists or referential integrity violation |
| 422 | Unprocessable Entity | Validation failed (e.g., invalid band references) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | DynamoDB or downstream service unavailable |

**Error Codes**:

- `VALIDATION_ERROR` - Request validation failed
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `RESOURCE_ALREADY_EXISTS` - Attempting to create duplicate resource
- `REFERENTIAL_INTEGRITY_ERROR` - Invalid reference (e.g., band doesn't exist)
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Unexpected server error
- `SERVICE_UNAVAILABLE` - Backend service unavailable

## Authentication & Authorization

### Public Endpoints

No authentication required for GET operations:

- `/api/festivals/*`
- `/api/bands/*`
- `/api/genres/*`
- `/api/roles/*`

### Admin Endpoints

Require API key in header: `X-Api-Key: {api-key}`

Protected operations:

- All POST/PUT/DELETE operations
- `/api/admin/*` endpoints

**API Key Validation**:

1. API Gateway validates key presence
2. Lambda function validates key permissions
3. CloudWatch logs all admin operations with key ID

**Future Enhancement**: OAuth 2.0 / JWT for user-specific admin operations

## Rate Limiting

### CloudFront Level

- Per IP: 2,000 requests per 5 minutes (WAF rule)
- Exceeded: 429 Too Many Requests

### API Gateway Level

**Public Plan**:

- Rate: 1,000 requests/second
- Burst: 2,000 requests
- Per API key (optional for tracking)

**Admin Plan**:

- Rate: 100 requests/second
- Burst: 200 requests
- Quota: 100,000 requests/month
- Per API key (required)

**Rate Limit Response**:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 60 seconds.",
    "details": {
      "limit": 1000,
      "remaining": 0,
      "reset": 1700740800
    }
  }
}
```

## Request/Response Examples

### Example 1: Get All Festivals

**Request**:

```http
GET /api/festivals HTTP/1.1
Host: api.metalfests.com
Accept: application/json
```

**Response** (200 OK):

```json
{
  "festivals": [
    {
      "festivalKey": "hellfest",
      "festivalName": "Hellfest",
      "location": "Clisson, France",
      "coordinates": {
        "lat": 47.0889,
        "lng": -1.2806
      },
      "website": "https://www.hellfest.fr",
      "poster": "https://example.com/hellfest-logo.jpg",
      "latestEdition": {
        "year": 2026,
        "dates": {
          "start": "2026-06-18",
          "end": "2026-06-21"
        },
        "bandCount": 150,
        "ticketPrice": 259.00,
        "currency": "EUR"
      },
      "editions": [2024, 2025, 2026],
      "totalEditions": 3
    }
  ],
  "count": 1
}
```

**Headers**:

```http
X-Cache: Hit from cloudfront
X-Amz-Cf-Pop: LAX50-C1
X-Amz-Cf-Id: abc123def456
Age: 123
```

### Example 2: Get Band Details

**Request**:

```http
GET /api/bands/metallica HTTP/1.1
Host: api.metalfests.com
Accept: application/json
```

**Response** (200 OK):

```json
{
  "band": {
    "key": "metallica",
    "name": "Metallica",
    "country": "United States",
    "description": "American heavy metal band formed in 1981...",
    "logo": "https://example.com/metallica-logo.png",
    "headlineImage": "https://example.com/metallica-headline.jpg",
    "website": "https://www.metallica.com",
    "spotify": "https://open.spotify.com/artist/2ye2Wgw4gimLv2eAKyk1NB",
    "genreKeys": ["heavy-metal", "thrash-metal"],
    "members": [
      {
        "name": "James Hetfield",
        "roleKeys": ["vocals", "rhythm-guitar"]
      }
    ],
    "reviewed": true
  },
  "genres": [
    {
      "key": "heavy-metal",
      "name": "Heavy Metal",
      "description": "A genre of rock music..."
    },
    {
      "key": "thrash-metal",
      "name": "Thrash Metal",
      "description": "Subgenre characterized by fast tempo..."
    }
  ],
  "roles": [
    {
      "key": "vocals",
      "name": "Vocals",
      "category": "voice"
    },
    {
      "key": "rhythm-guitar",
      "name": "Rhythm Guitar",
      "category": "string"
    }
  ]
}
```

### Example 3: Create Festival Edition

**Request**:

```http
PUT /api/festivals/hellfest/editions/2027 HTTP/1.1
Host: api.metalfests.com
Content-Type: application/json
X-Api-Key: admin_key_12345

{
  "dates": {
    "start": "2027-06-17",
    "end": "2027-06-20"
  },
  "bands": [
    {
      "key": "metallica",
      "name": "Metallica",
      "size": 0
    },
    {
      "key": "iron-maiden",
      "name": "Iron Maiden",
      "size": 0
    }
  ],
  "ticketPrice": 269.00,
  "currency": "EUR",
  "status": "announced"
}
```

**Response** (201 Created):

```json
{
  "success": true,
  "edition": {
    "festivalKey": "hellfest",
    "year": 2027,
    "dates": {
      "start": "2027-06-17",
      "end": "2027-06-20"
    },
    "bands": [
      {
        "key": "metallica",
        "name": "Metallica",
        "size": 0
      },
      {
        "key": "iron-maiden",
        "name": "Iron Maiden",
        "size": 0
      }
    ],
    "ticketPrice": 269.00,
    "currency": "EUR",
    "status": "announced",
    "createdAt": "2025-11-23T10:00:00Z"
  },
  "bandValidation": {
    "valid": true,
    "invalidBands": []
  },
  "cacheInvalidation": {
    "status": "InProgress",
    "invalidationId": "I2J3K4L5M6N7"
  }
}
```

### Example 4: Update Band

**Request**:

```http
PUT /api/bands/metallica HTTP/1.1
Host: api.metalfests.com
Content-Type: application/json
X-Api-Key: admin_key_12345

{
  "name": "Metallica",
  "country": "United States",
  "description": "Updated description with more details...",
  "logo": "https://example.com/metallica-logo.png",
  "headlineImage": "https://example.com/metallica-headline.jpg",
  "website": "https://www.metallica.com",
  "spotify": "https://open.spotify.com/artist/2ye2Wgw4gimLv2eAKyk1NB",
  "genreKeys": ["heavy-metal", "thrash-metal", "hard-rock"],
  "members": [
    {
      "name": "James Hetfield",
      "roleKeys": ["vocals", "rhythm-guitar"]
    },
    {
      "name": "Lars Ulrich",
      "roleKeys": ["drums"]
    }
  ],
  "reviewed": true
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "band": {
    "key": "metallica",
    "name": "Metallica",
    "country": "United States",
    "description": "Updated description with more details...",
    "genreKeys": ["heavy-metal", "thrash-metal", "hard-rock"],
    "members": [
      {
        "name": "James Hetfield",
        "roleKeys": ["vocals", "rhythm-guitar"]
      },
      {
        "name": "Lars Ulrich",
        "roleKeys": ["drums"]
      }
    ],
    "reviewed": true,
    "updatedAt": "2025-11-23T10:00:00Z"
  },
  "validation": {
    "genresValid": true,
    "rolesValid": true,
    "invalidGenres": [],
    "invalidRoles": []
  },
  "cacheInvalidation": {
    "status": "InProgress",
    "invalidationId": "I3J4K5L6M7N8"
  }
}
```

### Example 5: Invalidate Cache

**Request**:

```http
POST /api/admin/cache/invalidate HTTP/1.1
Host: api.metalfests.com
Content-Type: application/json
X-Api-Key: admin_key_12345

{
  "paths": [
    "/api/festivals/*",
    "/api/bands/metallica"
  ]
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "invalidationId": "I4J5K6L7M8N9",
  "status": "InProgress",
  "paths": [
    "/api/festivals/*",
    "/api/bands/metallica"
  ],
  "estimatedCompletion": "2025-11-23T10:05:00Z"
}
```

## Performance Considerations

### Lambda Optimization

**Cold Start Mitigation**:

- Provisioned concurrency for critical functions (festivals, bands)
- Minimal dependencies in deployment package
- Connection pooling for DynamoDB client

**Function Optimization**:

- Batch operations where possible (BatchGetItem)
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

## Migration from Current System

### Phase 1: Infrastructure Setup

**Week 1-2**:

1. Create AWS resources using Terraform/CDK
   - DynamoDB table with GSIs
   - Lambda functions (empty stubs)
   - API Gateway REST API
   - CloudFront distribution

2. Set up monitoring
   - CloudWatch dashboards
   - Alarms
   - X-Ray tracing

3. Configure CI/CD pipeline
   - GitHub Actions workflow
   - Staging environment

### Phase 2: Data Migration

**Week 3-4**:

1. Develop migration scripts
   - Parse current `db.json`
   - Extract festivals → FESTIVAL + EDITION entities
   - Extract bands → BAND + BAND_METADATA entities
   - Create GENRE and ROLE entities
   - Generate metadata entities

2. Test migration in staging
   - Verify data integrity
   - Check referential integrity
   - Validate GSI queries

3. Migrate production data
   - Run migration script against prod DynamoDB
   - Verify data completeness
   - Keep `db.json` as backup

### Phase 3: API Deployment

**Week 5-6**:

1. Implement Lambda functions
   - Festivals handler
   - Bands handler
   - Genres/Roles handlers
   - Cache invalidation handler

2. Deploy to staging
   - Run integration tests
   - Performance testing
   - Load testing

3. Deploy to production
   - Blue-green deployment
   - Monitor closely
   - Keep old API running temporarily

### Phase 4: Frontend Integration

**Week 7-8**:

1. Update frontend code
   - Replace `/db.json` calls with API calls
   - Add error handling
   - Implement retry logic

2. Test in staging
   - End-to-end testing
   - Browser compatibility testing
   - Performance testing

3. Deploy frontend changes
   - Feature flag for new API
   - Gradual rollout (10% → 50% → 100%)
   - Monitor user experience metrics

### Phase 5: Cutover

**Week 9**:

1. Switch 100% traffic to new API
2. Decommission old system
   - Stop serving `db.json`
   - Remove old Go server endpoints
   - Archive old code

3. Post-launch monitoring
   - Monitor for 2 weeks
   - Gather user feedback
   - Fix any issues

4. Optimization phase
   - Fine-tune cache TTLs
   - Adjust Lambda memory
   - Optimize DynamoDB access patterns

## API Versioning

### Current Approach

**URL Path Versioning**:

- All endpoints under `/api/`
- No version in path initially (implicit v1)

**Future Versioning**:
When breaking changes are needed:

- `/api/v2/festivals`
- `/api/v2/bands`

**Versioning Strategy**:

1. Add new v2 endpoints alongside v1
2. Maintain v1 for 6 months minimum
3. Deprecation warnings in v1 responses
4. Sunset v1 after migration period

**Breaking Changes**:

- Changes to response structure
- Removal of fields
- Changes to authentication

**Non-Breaking Changes**:

- Adding new fields (backward compatible)
- Adding new endpoints
- Adding new query parameters (with defaults)

## Related Documentation

- **[API and Backend Infrastructure Design](API_AND_BACKEND_INFRASTRUCTURE_DESIGN.md)** - Complete infrastructure architecture, deployment, monitoring, and cost optimization
- **[Admin API Design](ADMIN_API_DESIGN.md)** - Admin API with Cognito + SAML + AWS IAM Identity Center authentication
- [DynamoDB Bands Data Model](DYNAMODB_BANDS_DATA_MODEL.md) - Complete bands schema and query patterns
- [DynamoDB Festivals Data Model](DYNAMODB_FESTIVALS_DATA_MODEL.md) - Complete festivals schema and query patterns
- Infrastructure Code: `/infra` - AWS CDK/Terraform definitions
- Lambda Functions: `/internal/api` - Go implementation
- Frontend Integration: `/js` - JavaScript API client
