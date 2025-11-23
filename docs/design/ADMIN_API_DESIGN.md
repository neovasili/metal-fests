# Metal Fests Admin API Design

- [Metal Fests Admin API Design](#metal-fests-admin-api-design)
  - [Overview](#overview)
  - [Architecture](#architecture)
    - [Infrastructure Components](#infrastructure-components)
    - [Architecture Diagram](#architecture-diagram)
  - [Authentication \& Authorization](#authentication--authorization)
    - [AWS Cognito User Pool](#aws-cognito-user-pool)
    - [SAML 2.0 Integration](#saml-20-integration)
    - [AWS IAM Identity Center Integration](#aws-iam-identity-center-integration)
    - [Authentication Flow](#authentication-flow)
    - [Authorization Model](#authorization-model)
  - [API Endpoints](#api-endpoints)
    - [Festivals Admin API](#festivals-admin-api)
    - [Bands Admin API](#bands-admin-api)
    - [Genres Admin API](#genres-admin-api)
    - [Roles Admin API](#roles-admin-api)
    - [Cache Management API](#cache-management-api)
    - [System API](#system-api)
  - [API Specifications](#api-specifications)
    - [Festivals](#festivals)
      - [POST /api/admin/festivals](#post-apiadminfestivals)
      - [PUT /api/admin/festivals/{key}/editions/{year}](#put-apiadminfestivalskeyeditionsyear)
      - [DELETE /api/admin/festivals/{key}/editions/{year}](#delete-apiadminfestivalskeyeditionsyear)
    - [Bands](#bands)
      - [POST /api/admin/bands](#post-apiadminbands)
      - [PUT /api/admin/bands/{key}](#put-apiadminbandskey)
      - [POST /api/admin/bands/validate](#post-apiadminbandsvalidate)
    - [Genres](#genres)
      - [POST /api/admin/genres](#post-apiadmingenres)
    - [Roles](#roles)
      - [POST /api/admin/roles](#post-apiadminroles)
    - [Cache Management](#cache-management)
      - [POST /api/admin/cache/invalidate](#post-apiadmincacheinvalidate)
      - [GET /api/admin/cache/status](#get-apiadmincachestatus)
    - [System Operations](#system-operations)
      - [GET /api/admin/health](#get-apiadminhealth)
      - [GET /api/admin/stats](#get-apiadminstats)
      - [GET /api/admin/audit](#get-apiadminaudit)
  - [Infrastructure \& Deployment](#infrastructure--deployment)
  - [Related Documentation](#related-documentation)

## Overview

This document describes the **Admin REST API** design for the Metal Fests application. The Admin API provides authenticated and authorized access for administrative operations including creating, updating, and deleting festivals, bands, genres, and roles.

**Key Characteristics**:

- Full CRUD operations (GET, POST, PUT, DELETE)
- **Authentication**: AWS Cognito with SAML 2.0
- **Authorization**: AWS IAM Identity Center (AWS SSO) integration
- **Access Control**: Only users in AWS IAM Identity Center database
- Backend written in **Golang**
- Observability via **OpenTelemetry (OTEL)**
- Monitoring via **AWS Grafana + CloudWatch**
- Request/response validation via **API Gateway schemas**

**Access Restrictions**:

- Admin panel accessible only to authenticated AWS IAM Identity Center users
- Each operation requires valid JWT token from Cognito
- Fine-grained permissions via Cognito groups

## Architecture

### Infrastructure Components

The Metal Fests Admin API is built on AWS serverless architecture with strong authentication:

1. **AWS IAM Identity Center** - Centralized identity source
2. **AWS Cognito User Pool** - Authentication and JWT token generation
3. **SAML 2.0 Provider** - Identity federation bridge
4. **API Gateway** - REST API with Cognito authorizer
5. **AWS Lambda** - Serverless compute running **Golang** functions
6. **DynamoDB** - NoSQL database for data persistence
7. **CloudFront** - CDN with cache invalidation capabilities
8. **CloudWatch** - Log aggregation and metrics collection
9. **AWS Grafana** - Visualization and dashboards
10. **OpenTelemetry (OTEL)** - Distributed tracing and observability

### Architecture Diagram

```text
┌─────────────────────────────────────────┐
│       Admin User (Browser)              │
│    (AWS IAM Identity Center user)       │
└──────┬──────────────────────────────────┘
       │
       │ 1. Login request
       ▼
┌─────────────────────────────────────────┐
│    AWS IAM Identity Center (SSO)        │
│  - User authentication                  │
│  - MFA enforcement                      │
│  - SAML assertion generation            │
└──────┬──────────────────────────────────┘
       │
       │ 2. SAML assertion
       ▼
┌─────────────────────────────────────────┐
│       AWS Cognito User Pool             │
│  - SAML 2.0 identity provider           │
│  - JWT token generation                 │
│  - Group membership mapping             │
│  - Token validation                     │
└──────┬──────────────────────────────────┘
       │
       │ 3. JWT Access Token
       ▼
┌─────────────────────────────────────────┐
│       Admin Frontend                    │
│    (React/Vue/Static SPA)               │
│  - Stores JWT in memory/session         │
│  - Includes token in API requests       │
└──────┬──────────────────────────────────┘
       │
       │ 4. API Request + JWT Bearer Token
       │    Authorization: Bearer <jwt>
       ▼
┌─────────────────────────────────────────┐
│      API Gateway (REST)                 │
│  ┌───────────────────────────────────┐  │
│  │  Cognito Authorizer               │  │
│  │  - Validates JWT signature        │  │
│  │  - Checks token expiration        │  │
│  │  - Extracts user identity         │  │
│  │  - Validates group membership     │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  Request/Response Validation      │  │
│  │  - Schema validation              │  │
│  │  - Rate limiting                  │  │
│  │  - CORS configuration             │  │
│  └───────────────────────────────────┘  │
└──────┬──────────────────────────────────┘
       │
       │ 5. Authorized request
       ▼
┌─────────────────────────────────────────┐
│    AWS Lambda (Golang Runtime)          │
│  ┌───────────────────────────────────┐  │
│  │  Admin Handlers                   │  │
│  │  - Festivals CRUD                 │  │
│  │  - Bands CRUD                     │  │
│  │  │  Genres CRUD                   │  │
│  │  - Roles CRUD                     │  │
│  │  - Cache invalidation             │  │
│  │  - Health checks                  │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  OTEL Instrumentation             │  │
│  │  - Traces                         │  │
│  │  - Metrics                        │  │
│  │  - Context propagation            │  │
│  └───────────────────────────────────┘  │
└──────┬──────────────────────────────────┘
       │
       │ 6. DynamoDB operations
       │    + CloudFront cache invalidation
       ▼
┌─────────────────────────────────────────┐
│  DynamoDB + CloudFront                  │
│  - Write operations (PUT, POST, DELETE) │
│  - Referential integrity validation     │
│  - Cache invalidation triggers          │
└─────────────────────────────────────────┘

        Observability Stack
┌─────────────────────────────────────────┐
│  CloudWatch + AWS Grafana               │
│  - Admin operation audit logs           │
│  - Performance metrics                  │
│  - Security event monitoring            │
│  - Failed authentication attempts       │
└─────────────────────────────────────────┘
```

## Authentication & Authorization

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

### AWS IAM Identity Center Integration

**Setup Steps**:

1. **Enable IAM Identity Center** in your AWS Organization
2. **Create Admin Application** in IAM Identity Center
   - Application name: `MetalFests Admin Panel`
   - Application type: Custom SAML 2.0 application
3. **Configure SAML Settings**:
   - ACS URL: `https://metal-fests-admin-pool.auth.us-east-1.amazoncognito.com/saml2/idpresponse`
   - Entity ID: `urn:amazon:cognito:sp:us-east-1_XXXXXXXXX`
4. **Create Permission Sets**:
   - `MetalFestsAdminFull`
   - `MetalFestsAdminEditor`
   - `MetalFestsAdminViewer`
5. **Assign Users** from IAM Identity Center to application

**Benefits**:

- Centralized user management
- Automatic user provisioning/deprovisioning
- Audit trail of all access
- MFA enforced at IdP level
- Integration with corporate directory (AD, Okta, etc.)

### Authentication Flow

```text
1. User navigates to admin panel
   └─> Redirected to IAM Identity Center login

2. User authenticates with IAM Identity Center
   ├─> Username/password
   ├─> MFA verification
   └─> SAML assertion generated

3. SAML assertion sent to Cognito
   └─> Cognito validates assertion
       └─> Maps SAML groups to Cognito groups
           └─> Generates JWT tokens (access, ID, refresh)

4. Frontend receives JWT tokens
   └─> Stores tokens securely (memory or httpOnly cookie)

5. Frontend makes API request
   └─> Includes: Authorization: Bearer <access_token>

6. API Gateway validates token
   ├─> Verifies JWT signature (Cognito public keys)
   ├─> Checks expiration
   ├─> Validates issuer
   └─> Extracts claims (user ID, groups, email)

7. Lambda function receives authorized request
   └─> Context includes user identity and groups
       └─> Fine-grained authorization logic

8. Token refresh (when access token expires)
   └─> Use refresh token to get new access token
   └─> If refresh token expired, re-authenticate
```

### Authorization Model

**Group-Based Permissions**:

```go
type Permission int

const (
    PermissionRead Permission = iota
    PermissionWrite
    PermissionDelete
)

var groupPermissions = map[string][]Permission{
    "AdminFull": {PermissionRead, PermissionWrite, PermissionDelete},
    "AdminEditor": {PermissionRead, PermissionWrite},
    "AdminViewer": {PermissionRead},
}

// Extract from JWT claims
func GetUserGroups(ctx context.Context) []string {
    claims := ctx.Value("claims").(jwt.Claims)
    return claims["cognito:groups"].([]string)
}

// Check permission
func HasPermission(groups []string, required Permission) bool {
    for _, group := range groups {
        if perms, ok := groupPermissions[group]; ok {
            for _, perm := range perms {
                if perm == required {
                    return true
                }
            }
        }
    }
    return false
}
```

## API Endpoints

### Festivals Admin API

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/admin/festivals` | Write | Create new festival |
| PUT | `/api/admin/festivals/{key}` | Write | Update festival general info |
| PUT | `/api/admin/festivals/{key}/editions/{year}` | Write | Create/update edition |
| DELETE | `/api/admin/festivals/{key}/editions/{year}` | Delete | Delete edition |

### Bands Admin API

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/admin/bands` | Write | Create new band |
| PUT | `/api/admin/bands/{key}` | Write | Update band |
| DELETE | `/api/admin/bands/{key}` | Delete | Delete band (if not referenced) |
| POST | `/api/admin/bands/validate` | Read | Validate band references array |

### Genres Admin API

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/admin/genres` | Write | Create new genre |
| PUT | `/api/admin/genres/{key}` | Write | Update genre |

### Roles Admin API

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/admin/roles` | Write | Create new role |
| PUT | `/api/admin/roles/{key}` | Write | Update role |

### Cache Management API

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/admin/cache/invalidate` | Write | Invalidate CloudFront cache |
| GET | `/api/admin/cache/status` | Read | Get invalidation status |

### System API

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/admin/health` | Read | Health check with DynamoDB status |
| GET | `/api/admin/stats` | Read | Get database statistics |
| GET | `/api/admin/audit` | Read | Get audit logs |

## API Specifications

### Festivals

#### POST /api/admin/festivals

Creates a new festival.

**Required Permission**: Write

**Request Headers**:

```http
Authorization: Bearer <jwt_access_token>
Content-Type: application/json
```

**Request Body**:

```json
{
  "key": "new-festival",
  "name": "New Festival",
  "location": "City, Country",
  "coordinates": {
    "lat": 48.8566,
    "lng": 2.3522
  },
  "website": "https://example.com",
  "poster": "https://example.com/poster.jpg",
  "description": "Festival description"
}
```

**Response** (201 Created):

```json
{
  "success": true,
  "festival": {
    "key": "new-festival",
    "name": "New Festival",
    "location": "City, Country",
    "coordinates": {
      "lat": 48.8566,
      "lng": 2.3522
    },
    "website": "https://example.com",
    "poster": "https://example.com/poster.jpg",
    "description": "Festival description",
    "createdAt": "2025-11-23T10:00:00Z",
    "createdBy": "user@example.com"
  }
}
```

**Error Responses**:

- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User lacks Write permission
- `409 Conflict`: Festival with this key already exists
- `422 Unprocessable Entity`: Validation errors

#### PUT /api/admin/festivals/{key}/editions/{year}

Creates or updates a festival edition with band reference validation.

**Required Permission**: Write

**Request**:

```json
{
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
```

**Response** (201 Created or 200 OK):

```json
{
  "success": true,
  "edition": {
    "festivalKey": "hellfest",
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
    "status": "announced",
    "createdAt": "2025-11-23T10:00:00Z",
    "updatedBy": "user@example.com"
  },
  "bandValidation": {
    "valid": true,
    "invalidBands": []
  },
  "cacheInvalidation": {
    "status": "InProgress",
    "invalidationId": "I2J3K4L5M6N7",
    "paths": [
      "/api/festivals/*",
      "/api/festivals/hellfest/*"
    ]
  }
}
```

#### DELETE /api/admin/festivals/{key}/editions/{year}

Deletes a specific festival edition.

**Required Permission**: Delete

**Response** (204 No Content):

```json
{
  "success": true,
  "message": "Edition deleted successfully",
  "cacheInvalidation": {
    "status": "InProgress",
    "invalidationId": "I3J4K5L6M7N8"
  }
}
```

### Bands

#### POST /api/admin/bands

Creates a new band with genre and role validation.

**Required Permission**: Write

**Request**:

```json
{
  "key": "new-band",
  "name": "New Band",
  "country": "United States",
  "description": "Band description",
  "logo": "https://example.com/logo.png",
  "headlineImage": "https://example.com/headline.jpg",
  "website": "https://www.newband.com",
  "spotify": "https://open.spotify.com/artist/...",
  "genreKeys": ["heavy-metal", "thrash-metal"],
  "members": [
    {
      "name": "John Doe",
      "roleKeys": ["vocals", "guitar"]
    }
  ],
  "reviewed": false
}
```

**Response** (201 Created):

```json
{
  "success": true,
  "band": { /* created band */ },
  "validation": {
    "genresValid": true,
    "rolesValid": true,
    "invalidGenres": [],
    "invalidRoles": []
  },
  "cacheInvalidation": {
    "status": "InProgress",
    "invalidationId": "I4J5K6L7M8N9"
  }
}
```

#### PUT /api/admin/bands/{key}

Updates band information with validation.

**Required Permission**: Write

**Request**:

```json
{
  "name": "Updated Band Name",
  "country": "United States",
  "description": "Updated description",
  "logo": "https://example.com/new-logo.png",
  "genreKeys": ["heavy-metal", "progressive-metal"],
  "members": [
    {
      "name": "John Doe",
      "roleKeys": ["vocals"]
    }
  ],
  "reviewed": true
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "band": { /* updated band */ },
  "validation": {
    "genresValid": true,
    "rolesValid": true
  },
  "affectedFestivals": 5,
  "cacheInvalidation": {
    "status": "InProgress",
    "invalidationId": "I5J6K7L8M9N0",
    "paths": [
      "/api/bands/updated-band",
      "/api/festivals/*"
    ]
  }
}
```

#### POST /api/admin/bands/validate

Validates an array of band references before creating/updating a festival.

**Required Permission**: Read

**Request**:

```json
{
  "bandRefs": [
    {
      "key": "metallica",
      "name": "Metallica",
      "size": 0
    },
    {
      "key": "non-existent-band",
      "name": "Non Existent",
      "size": 1
    }
  ]
}
```

**Response** (200 OK):

```json
{
  "valid": false,
  "invalidBands": [
    {
      "key": "non-existent-band",
      "reason": "Band not found in database"
    }
  ],
  "validatedCount": 2,
  "validCount": 1,
  "invalidCount": 1
}
```

### Genres

#### POST /api/admin/genres

Creates a new genre.

**Required Permission**: Write

**Request**:

```json
{
  "key": "progressive-metal",
  "name": "Progressive Metal",
  "description": "A fusion genre combining progressive rock and heavy metal"
}
```

**Response** (201 Created):

```json
{
  "success": true,
  "genre": {
    "key": "progressive-metal",
    "name": "Progressive Metal",
    "description": "A fusion genre combining progressive rock and heavy metal",
    "bandCount": 0,
    "createdAt": "2025-11-23T10:00:00Z"
  },
  "cacheInvalidation": {
    "status": "InProgress",
    "invalidationId": "I6J7K8L9M0N1"
  }
}
```

### Roles

#### POST /api/admin/roles

Creates a new role.

**Required Permission**: Write

**Request**:

```json
{
  "key": "synthesizer",
  "name": "Synthesizer",
  "description": "Electronic keyboard synthesizer",
  "category": "keyboard"
}
```

**Response** (201 Created):

```json
{
  "success": true,
  "role": {
    "key": "synthesizer",
    "name": "Synthesizer",
    "description": "Electronic keyboard synthesizer",
    "category": "keyboard",
    "bandMemberCount": 0,
    "createdAt": "2025-11-23T10:00:00Z"
  },
  "cacheInvalidation": {
    "status": "InProgress",
    "invalidationId": "I7J8K9L0M1N2"
  }
}
```

### Cache Management

#### POST /api/admin/cache/invalidate

Manually invalidates CloudFront cache for specified paths.

**Required Permission**: Write

**Request**:

```json
{
  "paths": [
    "/api/festivals/*",
    "/api/bands/metallica"
  ],
  "reason": "Manual refresh after bulk update"
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "invalidationId": "I8J9K0L1M2N3",
  "status": "InProgress",
  "paths": [
    "/api/festivals/*",
    "/api/bands/metallica"
  ],
  "estimatedCompletion": "2025-11-23T10:05:00Z",
  "initiatedBy": "user@example.com"
}
```

#### GET /api/admin/cache/status

Get status of cache invalidation.

**Required Permission**: Read

**Query Parameters**:

- `invalidationId`: Invalidation ID to check

**Response** (200 OK):

```json
{
  "invalidationId": "I8J9K0L1M2N3",
  "status": "Completed",
  "paths": [
    "/api/festivals/*",
    "/api/bands/metallica"
  ],
  "createTime": "2025-11-23T10:00:00Z",
  "completedTime": "2025-11-23T10:03:45Z"
}
```

### System Operations

#### GET /api/admin/health

Returns health status of all backend services.

**Required Permission**: Read

**Response** (200 OK):

```json
{
  "status": "healthy",
  "services": {
    "dynamodb": {
      "status": "healthy",
      "latency": 12,
      "lastCheck": "2025-11-23T10:00:00Z"
    },
    "cognito": {
      "status": "healthy",
      "lastCheck": "2025-11-23T10:00:00Z"
    },
    "cloudfront": {
      "status": "healthy",
      "lastCheck": "2025-11-23T10:00:00Z"
    }
  },
  "timestamp": "2025-11-23T10:00:00Z"
}
```

#### GET /api/admin/stats

Returns comprehensive database statistics.

**Required Permission**: Read

**Response** (200 OK):

```json
{
  "stats": {
    "festivals": {
      "total": 100,
      "totalEditions": 350,
      "upcomingEditions": 85
    },
    "bands": {
      "total": 2500,
      "reviewed": 1800,
      "unreviewed": 700
    },
    "genres": {
      "total": 45
    },
    "roles": {
      "total": 18
    }
  },
  "recentActivity": {
    "lastFestivalUpdate": "2025-11-22T15:30:00Z",
    "lastBandUpdate": "2025-11-23T09:45:00Z",
    "editsLast24Hours": 23
  },
  "timestamp": "2025-11-23T10:00:00Z"
}
```

#### GET /api/admin/audit

Returns audit log of admin operations.

**Required Permission**: Read

**Query Parameters**:

- `startDate`: ISO 8601 date (default: 24 hours ago)
- `endDate`: ISO 8601 date (default: now)
- `user`: Filter by user email
- `action`: Filter by action type (CREATE, UPDATE, DELETE)
- `limit`: Max results (default: 100, max: 1000)

**Response** (200 OK):

```json
{
  "auditLogs": [
    {
      "timestamp": "2025-11-23T09:45:00Z",
      "user": "admin@example.com",
      "userId": "us-east-1_abc123",
      "action": "UPDATE",
      "resource": "band",
      "resourceId": "metallica",
      "changes": {
        "reviewed": {"from": false, "to": true}
      },
      "ipAddress": "203.0.113.45",
      "userAgent": "Mozilla/5.0..."
    }
  ],
  "count": 1,
  "hasMore": false
}
```

## Infrastructure & Deployment

The complete infrastructure architecture, deployment strategy, monitoring setup, and cost optimization details for both Public and Admin APIs are documented in the [API and Backend Infrastructure Design](API_AND_BACKEND_INFRASTRUCTURE_DESIGN.md) document.

**Admin API Specific Infrastructure**:

- AWS Cognito User Pool with SAML 2.0 integration
- AWS IAM Identity Center for centralized authentication
- API Gateway with Cognito Authorizer
- AWS Lambda (Golang) with write permissions
- CloudFront cache invalidation capabilities

For infrastructure-specific details including:

- Cognito User Pool configuration and SAML setup
- IAM policies for admin operations
- Lambda function permissions for write operations
- Cache invalidation infrastructure
- Security and audit logging

Please refer to the [API and Backend Infrastructure Design](API_AND_BACKEND_INFRASTRUCTURE_DESIGN.md) document.

## Related Documentation

- [API and Backend Infrastructure Design](API_AND_BACKEND_INFRASTRUCTURE_DESIGN.md) - Complete infrastructure architecture, deployment, monitoring, and cost optimization for both Public and Admin APIs
- [Public API Design](API_DESIGN.md) - Read-only public API specification
- [DynamoDB Bands Data Model](DYNAMODB_BANDS_DATA_MODEL.md) - Bands schema and integrity
- [DynamoDB Festivals Data Model](DYNAMODB_FESTIVALS_DATA_MODEL.md) - Festivals schema and integrity
