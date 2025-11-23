# DynamoDB Bands Data Model

- [DynamoDB Bands Data Model](#dynamodb-bands-data-model)
  - [Overview](#overview)
  - [Current Access Patterns Analysis](#current-access-patterns-analysis)
    - [Public Pages (Frontend)](#public-pages-frontend)
    - [Admin Pages (Backend)](#admin-pages-backend)
  - [Data Model Requirements](#data-model-requirements)
  - [Single-Table Design](#single-table-design)
    - [Table Structure](#table-structure)
    - [Entity Types](#entity-types)
  - [Data Model](#data-model)
    - [1. Band Entity (Complete Metadata)](#1-band-entity-complete-metadata)
    - [2. Band Metadata Entity (Aggregated)](#2-band-metadata-entity-aggregated)
    - [3. Genre Entity](#3-genre-entity)
    - [4. Genre Metadata Entity](#4-genre-metadata-entity)
    - [5. Role Entity](#5-role-entity)
    - [6. Role Metadata Entity](#6-role-metadata-entity)
    - [7. Band Reference in Festivals](#7-band-reference-in-festivals)
  - [Query Patterns](#query-patterns)
    - [1. Get All Bands](#1-get-all-bands)
    - [2. Get Band by Key](#2-get-band-by-key)
    - [3. Get Reviewed Bands](#3-get-reviewed-bands)
    - [4. Create or Update Band](#4-create-or-update-band)
    - [5. Batch Get Bands](#5-batch-get-bands)
    - [6. Delete Band](#6-delete-band)
    - [7. Get All Genres](#7-get-all-genres)
    - [8. Get Genre by Key](#8-get-genre-by-key)
    - [9. Create or Update Genre](#9-create-or-update-genre)
    - [10. Get All Roles](#10-get-all-roles)
    - [11. Get Role by Key](#11-get-role-by-key)
    - [12. Create or Update Role](#12-create-or-update-role)
    - [13. Validate Genre and Role References](#13-validate-genre-and-role-references)
  - [Data Integrity Patterns](#data-integrity-patterns)
    - [1. Referential Integrity](#1-referential-integrity)
  - [Data Integrity Patterns (continued)](#data-integrity-patterns-continued)
    - [1. Referential Integrity (continued)](#1-referential-integrity-continued)
    - [2. Synchronization with Festival Updates](#2-synchronization-with-festival-updates)
  - [Data Examples](#data-examples)
    - [Example 1: Complete Band with Metadata](#example-1-complete-band-with-metadata)
    - [Example 2: Unreviewed Band (Minimal Data)](#example-2-unreviewed-band-minimal-data)
  - [Design Considerations](#design-considerations)
    - [1. Single Table Benefits](#1-single-table-benefits)
    - [2. Referential Integrity](#2-referential-integrity)
    - [3. Reviewed vs Unreviewed Status](#3-reviewed-vs-unreviewed-status)
    - [4. Festival Count Tracking](#4-festival-count-tracking)
    - [5. Search and Filtering](#5-search-and-filtering)
    - [6. Genre and Role Deduplication](#6-genre-and-role-deduplication)
  - [Migration Strategy](#migration-strategy)
    - [From Current db.json to DynamoDB](#from-current-dbjson-to-dynamodb)
  - [API Adaptations](#api-adaptations)
    - [Current API](#current-api)
    - [Proposed API with DynamoDB](#proposed-api-with-dynamodb)
  - [Benefits of This Design](#benefits-of-this-design)
  - [Integration with Festivals](#integration-with-festivals)
    - [Consistency Rules](#consistency-rules)
    - [Transaction Example](#transaction-example)

## Overview

This document describes the DynamoDB schema for storing bands metadata within the same single table (`MetalFests`) used for festivals data. Bands are referenced by festivals through `BandRef` objects, ensuring data integrity and consistency across the application.

## Current Access Patterns Analysis

Based on the codebase analysis, bands data is accessed in the following ways:

### Public Pages (Frontend)

1. **Band Manager**:
   - Load ALL bands metadata
   - Get band by name
   - Check if band has complete information (reviewed flag)
   - Display band modal with details (logo, genres, members, description)
   - Filter festivals by bands

2. **Festival Cards**:
   - Display band names with clickable links (if reviewed)
   - Show band tiers based on size (0-1: tier-1, 2: tier-2, 3: tier-3)
   - Search by band name or genres

3. **Band Modal/Detail View**:
   - Show band logo, headline image
   - Display genres, country, description
   - List band members with roles
   - Provide links to website and Spotify

### Admin Pages (Backend)

1. **Band Management**:
   - List all bands
   - Add new bands
   - Update band metadata (`PUT /api/bands/{key}`)
   - Mark bands as reviewed
   - Manage band members, genres, images

2. **Band Collection**:
   - Collect all unique band references from festivals
   - Identify bands that need metadata completion

## Data Model Requirements

- **Single Table Design**: Store bands in the same table as festivals
- **Data Integrity**: Ensure festival band references (`BandRef`) link to actual band entities
- **Metadata Completeness**: Track whether a band has complete metadata (reviewed flag)
- **Efficient Queries**: Support listing all bands, getting by key/name, and filtering
- **No Editions**: Bands are static metadata entities without time-based versions

## Single-Table Design

### Table Structure

**Table Name**: `MetalFests` (same table as festivals)

**Primary Key**:

- **Partition Key (PK)**: `string`
- **Sort Key (SK)**: `string`

**Global Secondary Indexes (GSI)**:

- **GSI1**: Used for festivals date-based queries (not used by bands)
- **GSI2**: Used for festivals location queries (not used by bands)
- **GSI3** (NEW): Query bands by status or genre
  - **GSI3PK**: `string` (Status or category identifier)
  - **GSI3SK**: `string` (Band key or name)

### Entity Types

The table stores bands and related reference data as:

1. **BAND** - Band metadata entity
2. **BAND_METADATA** - Aggregated band information for queries
3. **GENRE** - Genre reference entity (avoiding duplicates)
4. **ROLE** - Member role reference entity (avoiding duplicates)
5. **GENRE_METADATA** - Aggregated genre information
6. **ROLE_METADATA** - Aggregated role information

## Data Model

### 1. Band Entity (Complete Metadata)

Stores all information about a band. Genres and member roles use references to shared entities.

**Keys**:

- `PK`: `BAND#<band-key>`
- `SK`: `METADATA`

**Attributes**:

```json
{
  "PK": "BAND#metallica",
  "SK": "METADATA",
  "EntityType": "BAND",
  "key": "metallica",
  "name": "Metallica",
  "country": "United States",
  "description": "American heavy metal band formed in 1981 in Los Angeles. Metallica is one of the founding 'big four' bands of thrash metal alongside Megadeth, Anthrax, and Slayer.",
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
    },
    {
      "name": "Kirk Hammett",
      "roleKeys": ["lead-guitar"]
    },
    {
      "name": "Robert Trujillo",
      "roleKeys": ["bass"]
    }
  ],
  "reviewed": true,
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z",
  "GSI3PK": "BANDS_REVIEWED",
  "GSI3SK": "metallica"
}
```

**Note**: `genreKeys` references GENRE entities, and `roleKeys` in members reference ROLE entities.

### 2. Band Metadata Entity (Aggregated)

Stores denormalized data for efficient listing and filtering. Includes denormalized genre names for display.

**Keys**:

- `PK`: `METADATA#BANDS`
- `SK`: `BAND#<band-key>`

**Attributes**:

```json
{
  "PK": "METADATA#BANDS",
  "SK": "BAND#metallica",
  "EntityType": "BAND_METADATA",
  "key": "metallica",
  "name": "Metallica",
  "country": "United States",
  "genreKeys": ["heavy-metal", "thrash-metal", "hard-rock"],
  "genreNames": ["Heavy Metal", "Thrash Metal", "Hard Rock"],
  "logo": "https://example.com/metallica-logo.png",
  "reviewed": true,
  "festivalCount": 15,
  "updatedAt": "2025-01-15T10:00:00Z",
  "GSI3PK": "BANDS_REVIEWED",
  "GSI3SK": "metallica"
}
```

**Note**: `genreNames` is denormalized for quick display without additional lookups.

### 3. Genre Entity

Stores genre reference data to avoid duplicates and maintain consistency.

**Keys**:

- `PK`: `GENRE#<genre-key>`
- `SK`: `METADATA`

**Attributes**:

```json
{
  "PK": "GENRE#heavy-metal",
  "SK": "METADATA",
  "EntityType": "GENRE",
  "key": "heavy-metal",
  "name": "Heavy Metal",
  "description": "A genre of rock music that developed in the late 1960s and early 1970s, characterized by amplified distortion, extended guitar solos, emphatic beats, and loudness.",
  "bandCount": 250,
  "createdAt": "2025-01-10T08:00:00Z",
  "updatedAt": "2025-11-22T10:00:00Z"
}
```

### 4. Genre Metadata Entity

Stores aggregated genre data for efficient listing.

**Keys**:

- `PK`: `METADATA#GENRES`
- `SK`: `GENRE#<genre-key>`

**Attributes**:

```json
{
  "PK": "METADATA#GENRES",
  "SK": "GENRE#heavy-metal",
  "EntityType": "GENRE_METADATA",
  "key": "heavy-metal",
  "name": "Heavy Metal",
  "bandCount": 250,
  "updatedAt": "2025-11-22T10:00:00Z"
}
```

### 5. Role Entity

Stores member role reference data to avoid duplicates and maintain consistency.

**Keys**:

- `PK`: `ROLE#<role-key>`
- `SK`: `METADATA`

**Attributes**:

```json
{
  "PK": "ROLE#vocals",
  "SK": "METADATA",
  "EntityType": "ROLE",
  "key": "vocals",
  "name": "Vocals",
  "description": "Lead or backing vocals",
  "category": "voice",
  "bandMemberCount": 450,
  "createdAt": "2025-01-10T08:00:00Z",
  "updatedAt": "2025-11-22T10:00:00Z"
}
```

### 6. Role Metadata Entity

Stores aggregated role data for efficient listing.

**Keys**:

- `PK`: `METADATA#ROLES`
- `SK`: `ROLE#<role-key>`

**Attributes**:

```json
{
  "PK": "METADATA#ROLES",
  "SK": "ROLE#vocals",
  "EntityType": "ROLE_METADATA",
  "key": "vocals",
  "name": "Vocals",
  "category": "voice",
  "bandMemberCount": 450,
  "updatedAt": "2025-11-22T10:00:00Z"
}
```

### 7. Band Reference in Festivals

Band references in festival editions maintain the link to band entities.

**In Festival Edition**:

```json
{
  "PK": "FESTIVAL#wacken-open-air",
  "SK": "EDITION#2026",
  "bands": [
    {
      "key": "metallica",
      "name": "Metallica",
      "size": 3
    },
    {
      "key": "iron-maiden",
      "name": "Iron Maiden",
      "size": 3
    }
  ]
}
```

**Note**: The `key` field in `BandRef` MUST match the `key` in the corresponding `BAND` entity to maintain referential integrity.

## Query Patterns

### 1. Get All Bands

**Query**: Query on `METADATA#BANDS` partition

```text
PK = "METADATA#BANDS"
```

**Result**: Returns all bands with their metadata.

**Go Code Example**:

```go
import (
    "context"
    "fmt"

    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

// BandMetadata represents the metadata entity
type BandMetadata struct {
    PK            string   `dynamodbav:"PK"`
    SK            string   `dynamodbav:"SK"`
    EntityType    string   `dynamodbav:"EntityType"`
    Key           string   `dynamodbav:"key"`
    Name          string   `dynamodbav:"name"`
    Country       string   `dynamodbav:"country"`
    GenreKeys     []string `dynamodbav:"genreKeys"`     // References to GENRE entities
    GenreNames    []string `dynamodbav:"genreNames"`    // Denormalized for display
    Logo          string   `dynamodbav:"logo"`
    Reviewed      bool     `dynamodbav:"reviewed"`
    FestivalCount int      `dynamodbav:"festivalCount"`
    UpdatedAt     string   `dynamodbav:"updatedAt"`
    GSI3PK        string   `dynamodbav:"GSI3PK"`
    GSI3SK        string   `dynamodbav:"GSI3SK"`
}

// Genre represents a music genre entity
type Genre struct {
    PK               string `dynamodbav:"PK"`
    SK               string `dynamodbav:"SK"`
    EntityType       string `dynamodbav:"EntityType"`
    Key              string `dynamodbav:"key"`
    Name             string `dynamodbav:"name"`
    Description      string `dynamodbav:"description"`
    BandCount        int    `dynamodbav:"bandCount"`
    CreatedAt        string `dynamodbav:"createdAt"`
    UpdatedAt        string `dynamodbav:"updatedAt"`
}

// GenreMetadata represents aggregated genre data
type GenreMetadata struct {
    PK         string `dynamodbav:"PK"`
    SK         string `dynamodbav:"SK"`
    EntityType string `dynamodbav:"EntityType"`
    Key        string `dynamodbav:"key"`
    Name       string `dynamodbav:"name"`
    BandCount  int    `dynamodbav:"bandCount"`
    UpdatedAt  string `dynamodbav:"updatedAt"`
}

// Role represents a band member role entity
type Role struct {
    PK              string `dynamodbav:"PK"`
    SK              string `dynamodbav:"SK"`
    EntityType      string `dynamodbav:"EntityType"`
    Key             string `dynamodbav:"key"`
    Name            string `dynamodbav:"name"`
    Description     string `dynamodbav:"description"`
    Category        string `dynamodbav:"category"` // e.g., "voice", "string", "percussion", "other"
    BandMemberCount int    `dynamodbav:"bandMemberCount"`
    CreatedAt       string `dynamodbav:"createdAt"`
    UpdatedAt       string `dynamodbav:"updatedAt"`
}

// RoleMetadata represents aggregated role data
type RoleMetadata struct {
    PK              string `dynamodbav:"PK"`
    SK              string `dynamodbav:"SK"`
    EntityType      string `dynamodbav:"EntityType"`
    Key             string `dynamodbav:"key"`
    Name            string `dynamodbav:"name"`
    Category        string `dynamodbav:"category"`
    BandMemberCount int    `dynamodbav:"bandMemberCount"`
    UpdatedAt       string `dynamodbav:"updatedAt"`
}

// Band represents the complete band entity
type Band struct {
    PK            string   `dynamodbav:"PK"`
    SK            string   `dynamodbav:"SK"`
    EntityType    string   `dynamodbav:"EntityType"`
    Key           string   `dynamodbav:"key"`
    Name          string   `dynamodbav:"name"`
    Country       string   `dynamodbav:"country"`
    Description   string   `dynamodbav:"description"`
    Logo          string   `dynamodbav:"logo"`
    HeadlineImage string   `dynamodbav:"headlineImage"`
    Website       string   `dynamodbav:"website"`
    Spotify       string   `dynamodbav:"spotify"`
    GenreKeys     []string `dynamodbav:"genreKeys"` // References to GENRE entities
    Members       []Member `dynamodbav:"members"`
    Reviewed      bool     `dynamodbav:"reviewed"`
    CreatedAt     string   `dynamodbav:"createdAt"`
    UpdatedAt     string   `dynamodbav:"updatedAt"`
    GSI3PK        string   `dynamodbav:"GSI3PK,omitempty"`
    GSI3SK        string   `dynamodbav:"GSI3SK,omitempty"`
}

type Member struct {
    Name     string   `dynamodbav:"name" json:"name"`
    RoleKeys []string `dynamodbav:"roleKeys" json:"roleKeys"` // References to ROLE entities
}

// GetAllBands retrieves all bands metadata
func GetAllBands(ctx context.Context, client *dynamodb.Client, tableName string) ([]BandMetadata, error) {
    input := &dynamodb.QueryInput{
        TableName:              aws.String(tableName),
        KeyConditionExpression: aws.String("PK = :pk"),
        ExpressionAttributeValues: map[string]types.AttributeValue{
            ":pk": &types.AttributeValueMemberS{Value: "METADATA#BANDS"},
        },
    }

    result, err := client.Query(ctx, input)
    if err != nil {
        return nil, fmt.Errorf("failed to query bands: %w", err)
    }

    var bands []BandMetadata
    err = attributevalue.UnmarshalListOfMaps(result.Items, &bands)
    if err != nil {
        return nil, fmt.Errorf("failed to unmarshal bands: %w", err)
    }

    return bands, nil
}
```

### 2. Get Band by Key

**Query**: Get specific band

```text
PK = "BAND#<band-key>"
SK = "METADATA"
```

**Result**: Returns complete band information.

**Go Code Example**:

```go
// GetBandByKey retrieves a specific band by its key
func GetBandByKey(ctx context.Context, client *dynamodb.Client, tableName, bandKey string) (*Band, error) {
    pk := fmt.Sprintf("BAND#%s", bandKey)

    input := &dynamodb.GetItemInput{
        TableName: aws.String(tableName),
        Key: map[string]types.AttributeValue{
            "PK": &types.AttributeValueMemberS{Value: pk},
            "SK": &types.AttributeValueMemberS{Value: "METADATA"},
        },
    }

    result, err := client.GetItem(ctx, input)
    if err != nil {
        return nil, fmt.Errorf("failed to get band: %w", err)
    }

    if result.Item == nil {
        return nil, fmt.Errorf("band not found")
    }

    var band Band
    err = attributevalue.UnmarshalMap(result.Item, &band)
    if err != nil {
        return nil, fmt.Errorf("failed to unmarshal band: %w", err)
    }

    return &band, nil
}
```

### 3. Get Reviewed Bands

**Query**: Query GSI3 for reviewed bands

```text
GSI3PK = "BANDS_REVIEWED"
```

**Result**: Returns all bands that have been reviewed (complete metadata).

**Go Code Example**:

```go
// GetReviewedBands retrieves all bands that have been reviewed
func GetReviewedBands(ctx context.Context, client *dynamodb.Client, tableName string) ([]BandMetadata, error) {
    input := &dynamodb.QueryInput{
        TableName:              aws.String(tableName),
        IndexName:              aws.String("GSI3"),
        KeyConditionExpression: aws.String("GSI3PK = :gsi3pk"),
        ExpressionAttributeValues: map[string]types.AttributeValue{
            ":gsi3pk": &types.AttributeValueMemberS{Value: "BANDS_REVIEWED"},
        },
    }

    result, err := client.Query(ctx, input)
    if err != nil {
        return nil, fmt.Errorf("failed to query reviewed bands: %w", err)
    }

    var bands []BandMetadata
    err = attributevalue.UnmarshalListOfMaps(result.Items, &bands)
    if err != nil {
        return nil, fmt.Errorf("failed to unmarshal bands: %w", err)
    }

    return bands, nil
}

// GetUnreviewedBands retrieves all bands that need review
func GetUnreviewedBands(ctx context.Context, client *dynamodb.Client, tableName string) ([]BandMetadata, error) {
    input := &dynamodb.QueryInput{
        TableName:              aws.String(tableName),
        IndexName:              aws.String("GSI3"),
        KeyConditionExpression: aws.String("GSI3PK = :gsi3pk"),
        ExpressionAttributeValues: map[string]types.AttributeValue{
            ":gsi3pk": &types.AttributeValueMemberS{Value: "BANDS_UNREVIEWED"},
        },
    }

    result, err := client.Query(ctx, input)
    if err != nil {
        return nil, fmt.Errorf("failed to query unreviewed bands: %w", err)
    }

    var bands []BandMetadata
    err = attributevalue.UnmarshalListOfMaps(result.Items, &bands)
    if err != nil {
        return nil, fmt.Errorf("failed to unmarshal bands: %w", err)
    }

    return bands, nil
}
```

### 4. Create or Update Band

**Put/Update**: Add or update band

```text
PK = "BAND#<band-key>"
SK = "METADATA"
```

**Additional**: Update metadata entity to keep denormalized data in sync.

**Go Code Example**:

```go
// CreateOrUpdateBand creates or updates a band
func CreateOrUpdateBand(ctx context.Context, client *dynamodb.Client, tableName string, band Band) error {
    band.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
    if band.CreatedAt == "" {
        band.CreatedAt = band.UpdatedAt
    }

    // Set GSI3 keys based on reviewed status
    if band.Reviewed {
        band.GSI3PK = "BANDS_REVIEWED"
    } else {
        band.GSI3PK = "BANDS_UNREVIEWED"
    }
    band.GSI3SK = band.Key

    item, err := attributevalue.MarshalMap(band)
    if err != nil {
        return fmt.Errorf("failed to marshal band: %w", err)
    }

    input := &dynamodb.PutItemInput{
        TableName: aws.String(tableName),
        Item:      item,
    }

    _, err = client.PutItem(ctx, input)
    if err != nil {
        return fmt.Errorf("failed to put band: %w", err)
    }

    // Update the metadata entity to sync denormalized data
    err = updateBandMetadata(ctx, client, tableName, band)
    if err != nil {
        return fmt.Errorf("failed to update band metadata: %w", err)
    }

    return nil
}

// updateBandMetadata updates the BAND_METADATA entity
func updateBandMetadata(ctx context.Context, client *dynamodb.Client, tableName string, band Band) error {
    // First, get the current festival count
    festivalCount, err := countBandInFestivals(ctx, client, tableName, band.Key)
    if err != nil {
        festivalCount = 0 // Default to 0 if error
    }

    metadata := BandMetadata{
        PK:            "METADATA#BANDS",
        SK:            fmt.Sprintf("BAND#%s", band.Key),
        EntityType:    "BAND_METADATA",
        Key:           band.Key,
        Name:          band.Name,
        Country:       band.Country,
        Genres:        band.Genres,
        Logo:          band.Logo,
        Reviewed:      band.Reviewed,
        FestivalCount: festivalCount,
        UpdatedAt:     band.UpdatedAt,
        GSI3PK:        band.GSI3PK,
        GSI3SK:        band.GSI3SK,
    }

    item, err := attributevalue.MarshalMap(metadata)
    if err != nil {
        return fmt.Errorf("failed to marshal band metadata: %w", err)
    }

    input := &dynamodb.PutItemInput{
        TableName: aws.String(tableName),
        Item:      item,
    }

    _, err = client.PutItem(ctx, input)
    if err != nil {
        return fmt.Errorf("failed to put band metadata: %w", err)
    }

    return nil
}

// countBandInFestivals counts how many festivals include this band
func countBandInFestivals(ctx context.Context, client *dynamodb.Client, tableName, bandKey string) (int, error) {
    // This would require scanning all festival editions or maintaining a separate counter
    // For now, returning 0 - could be enhanced with a separate GSI or counter attribute
    return 0, nil
}
```

### 5. Batch Get Bands

For efficient bulk operations when loading band details for multiple festivals.

**Go Code Example**:

```go
// BatchGetBands retrieves multiple bands by their keys
func BatchGetBands(ctx context.Context, client *dynamodb.Client, tableName string, bandKeys []string) (map[string]Band, error) {
    if len(bandKeys) == 0 {
        return make(map[string]Band), nil
    }

    // DynamoDB limits batch get to 100 items
    if len(bandKeys) > 100 {
        return nil, fmt.Errorf("batch get limited to 100 items")
    }

    // Remove duplicates
    uniqueKeys := make(map[string]bool)
    for _, key := range bandKeys {
        uniqueKeys[key] = true
    }

    keys := make([]map[string]types.AttributeValue, 0, len(uniqueKeys))
    for key := range uniqueKeys {
        pk := fmt.Sprintf("BAND#%s", key)
        keys = append(keys, map[string]types.AttributeValue{
            "PK": &types.AttributeValueMemberS{Value: pk},
            "SK": &types.AttributeValueMemberS{Value: "METADATA"},
        })
    }

    input := &dynamodb.BatchGetItemInput{
        RequestItems: map[string]types.KeysAndAttributes{
            tableName: {
                Keys: keys,
            },
        },
    }

    result, err := client.BatchGetItem(ctx, input)
    if err != nil {
        return nil, fmt.Errorf("failed to batch get bands: %w", err)
    }

    bands := make(map[string]Band)
    if items, ok := result.Responses[tableName]; ok {
        for _, item := range items {
            var band Band
            err = attributevalue.UnmarshalMap(item, &band)
            if err != nil {
                continue // Skip invalid items
            }
            bands[band.Key] = band
        }
    }

    return bands, nil
}
```

### 6. Delete Band

**Delete**: Remove band entity

```text
PK = "BAND#<band-key>"
SK = "METADATA"
```

**Important**: Check for referential integrity before deletion.

**Go Code Example**:

```go
// DeleteBand deletes a band after checking it's not referenced by any festival
func DeleteBand(ctx context.Context, client *dynamodb.Client, tableName, bandKey string) error {
    // First, check if band is referenced by any festival
    isReferenced, err := isBandReferencedInFestivals(ctx, client, tableName, bandKey)
    if err != nil {
        return fmt.Errorf("failed to check band references: %w", err)
    }

    if isReferenced {
        return fmt.Errorf("cannot delete band: still referenced by festivals")
    }

    // Delete the band entity
    pk := fmt.Sprintf("BAND#%s", bandKey)

    input := &dynamodb.DeleteItemInput{
        TableName: aws.String(tableName),
        Key: map[string]types.AttributeValue{
            "PK": &types.AttributeValueMemberS{Value: pk},
            "SK": &types.AttributeValueMemberS{Value: "METADATA"},
        },
    }

    _, err = client.DeleteItem(ctx, input)
    if err != nil {
        return fmt.Errorf("failed to delete band: %w", err)
    }

    // Delete the metadata entity
    metadataInput := &dynamodb.DeleteItemInput{
        TableName: aws.String(tableName),
        Key: map[string]types.AttributeValue{
            "PK": &types.AttributeValueMemberS{Value: "METADATA#BANDS"},
            "SK": &types.AttributeValueMemberS{Value: fmt.Sprintf("BAND#%s", bandKey)},
        },
    }

    _, err = client.DeleteItem(ctx, metadataInput)
    if err != nil {
        return fmt.Errorf("failed to delete band metadata: %w", err)
    }

    return nil
}

// isBandReferencedInFestivals checks if a band is referenced by any festival edition
func isBandReferencedInFestivals(ctx context.Context, client *dynamodb.Client, tableName, bandKey string) (bool, error) {
    // This requires scanning all festival editions or maintaining a reference counter
    // Implementation would depend on scale and performance requirements
    // For now, returning false - should be implemented based on needs
    return false, nil
}
```

### 7. Get All Genres

**Query**: Query on `METADATA#GENRES` partition

```text
PK = "METADATA#GENRES"
```

**Result**: Returns all genres.

**Go Code Example**:

```go
// GetAllGenres retrieves all genres
func GetAllGenres(ctx context.Context, client *dynamodb.Client, tableName string) ([]GenreMetadata, error) {
    input := &dynamodb.QueryInput{
        TableName:              aws.String(tableName),
        KeyConditionExpression: aws.String("PK = :pk"),
        ExpressionAttributeValues: map[string]types.AttributeValue{
            ":pk": &types.AttributeValueMemberS{Value: "METADATA#GENRES"},
        },
    }

    result, err := client.Query(ctx, input)
    if err != nil {
        return nil, fmt.Errorf("failed to query genres: %w", err)
    }

    var genres []GenreMetadata
    err = attributevalue.UnmarshalListOfMaps(result.Items, &genres)
    if err != nil {
        return nil, fmt.Errorf("failed to unmarshal genres: %w", err)
    }

    return genres, nil
}
```

### 8. Get Genre by Key

**Query**: Get specific genre

```text
PK = "GENRE#<genre-key>"
SK = "METADATA"
```

**Result**: Returns complete genre information.

**Go Code Example**:

```go
// GetGenreByKey retrieves a specific genre by its key
func GetGenreByKey(ctx context.Context, client *dynamodb.Client, tableName, genreKey string) (*Genre, error) {
    pk := fmt.Sprintf("GENRE#%s", genreKey)

    input := &dynamodb.GetItemInput{
        TableName: aws.String(tableName),
        Key: map[string]types.AttributeValue{
            "PK": &types.AttributeValueMemberS{Value: pk},
            "SK": &types.AttributeValueMemberS{Value: "METADATA"},
        },
    }

    result, err := client.GetItem(ctx, input)
    if err != nil {
        return nil, fmt.Errorf("failed to get genre: %w", err)
    }

    if result.Item == nil {
        return nil, fmt.Errorf("genre not found")
    }

    var genre Genre
    err = attributevalue.UnmarshalMap(result.Item, &genre)
    if err != nil {
        return nil, fmt.Errorf("failed to unmarshal genre: %w", err)
    }

    return &genre, nil
}

// BatchGetGenres retrieves multiple genres by their keys
func BatchGetGenres(ctx context.Context, client *dynamodb.Client, tableName string, genreKeys []string) (map[string]Genre, error) {
    if len(genreKeys) == 0 {
        return make(map[string]Genre), nil
    }

    if len(genreKeys) > 100 {
        return nil, fmt.Errorf("batch get limited to 100 items")
    }

    // Remove duplicates
    uniqueKeys := make(map[string]bool)
    for _, key := range genreKeys {
        uniqueKeys[key] = true
    }

    keys := make([]map[string]types.AttributeValue, 0, len(uniqueKeys))
    for key := range uniqueKeys {
        pk := fmt.Sprintf("GENRE#%s", key)
        keys = append(keys, map[string]types.AttributeValue{
            "PK": &types.AttributeValueMemberS{Value: pk},
            "SK": &types.AttributeValueMemberS{Value: "METADATA"},
        })
    }

    input := &dynamodb.BatchGetItemInput{
        RequestItems: map[string]types.KeysAndAttributes{
            tableName: {
                Keys: keys,
            },
        },
    }

    result, err := client.BatchGetItem(ctx, input)
    if err != nil {
        return nil, fmt.Errorf("failed to batch get genres: %w", err)
    }

    genres := make(map[string]Genre)
    if items, ok := result.Responses[tableName]; ok {
        for _, item := range items {
            var genre Genre
            err = attributevalue.UnmarshalMap(item, &genre)
            if err != nil {
                continue
            }
            genres[genre.Key] = genre
        }
    }

    return genres, nil
}
```

### 9. Create or Update Genre

**Put/Update**: Add or update genre

```text
PK = "GENRE#<genre-key>"
SK = "METADATA"
```

**Additional**: Update metadata entity to keep denormalized data in sync.

**Go Code Example**:

```go
// CreateOrUpdateGenre creates or updates a genre
func CreateOrUpdateGenre(ctx context.Context, client *dynamodb.Client, tableName string, genre Genre) error {
    genre.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
    if genre.CreatedAt == "" {
        genre.CreatedAt = genre.UpdatedAt
    }

    item, err := attributevalue.MarshalMap(genre)
    if err != nil {
        return fmt.Errorf("failed to marshal genre: %w", err)
    }

    input := &dynamodb.PutItemInput{
        TableName: aws.String(tableName),
        Item:      item,
    }

    _, err = client.PutItem(ctx, input)
    if err != nil {
        return fmt.Errorf("failed to put genre: %w", err)
    }

    // Update metadata entity
    metadata := GenreMetadata{
        PK:         "METADATA#GENRES",
        SK:         fmt.Sprintf("GENRE#%s", genre.Key),
        EntityType: "GENRE_METADATA",
        Key:        genre.Key,
        Name:       genre.Name,
        BandCount:  genre.BandCount,
        UpdatedAt:  genre.UpdatedAt,
    }

    metadataItem, err := attributevalue.MarshalMap(metadata)
    if err != nil {
        return fmt.Errorf("failed to marshal genre metadata: %w", err)
    }

    metadataInput := &dynamodb.PutItemInput{
        TableName: aws.String(tableName),
        Item:      metadataItem,
    }

    _, err = client.PutItem(ctx, metadataInput)
    if err != nil {
        return fmt.Errorf("failed to put genre metadata: %w", err)
    }

    return nil
}
```

### 10. Get All Roles

**Query**: Query on `METADATA#ROLES` partition

```text
PK = "METADATA#ROLES"
```

**Result**: Returns all roles.

**Go Code Example**:

```go
// GetAllRoles retrieves all roles
func GetAllRoles(ctx context.Context, client *dynamodb.Client, tableName string) ([]RoleMetadata, error) {
    input := &dynamodb.QueryInput{
        TableName:              aws.String(tableName),
        KeyConditionExpression: aws.String("PK = :pk"),
        ExpressionAttributeValues: map[string]types.AttributeValue{
            ":pk": &types.AttributeValueMemberS{Value: "METADATA#ROLES"},
        },
    }

    result, err := client.Query(ctx, input)
    if err != nil {
        return nil, fmt.Errorf("failed to query roles: %w", err)
    }

    var roles []RoleMetadata
    err = attributevalue.UnmarshalListOfMaps(result.Items, &roles)
    if err != nil {
        return nil, fmt.Errorf("failed to unmarshal roles: %w", err)
    }

    return roles, nil
}
```

### 11. Get Role by Key

**Query**: Get specific role

```text
PK = "ROLE#<role-key>"
SK = "METADATA"
```

**Result**: Returns complete role information.

**Go Code Example**:

```go
// GetRoleByKey retrieves a specific role by its key
func GetRoleByKey(ctx context.Context, client *dynamodb.Client, tableName, roleKey string) (*Role, error) {
    pk := fmt.Sprintf("ROLE#%s", roleKey)

    input := &dynamodb.GetItemInput{
        TableName: aws.String(tableName),
        Key: map[string]types.AttributeValue{
            "PK": &types.AttributeValueMemberS{Value: pk},
            "SK": &types.AttributeValueMemberS{Value: "METADATA"},
        },
    }

    result, err := client.GetItem(ctx, input)
    if err != nil {
        return nil, fmt.Errorf("failed to get role: %w", err)
    }

    if result.Item == nil {
        return nil, fmt.Errorf("role not found")
    }

    var role Role
    err = attributevalue.UnmarshalMap(result.Item, &role)
    if err != nil {
        return nil, fmt.Errorf("failed to unmarshal role: %w", err)
    }

    return &role, nil
}

// BatchGetRoles retrieves multiple roles by their keys
func BatchGetRoles(ctx context.Context, client *dynamodb.Client, tableName string, roleKeys []string) (map[string]Role, error) {
    if len(roleKeys) == 0 {
        return make(map[string]Role), nil
    }

    if len(roleKeys) > 100 {
        return nil, fmt.Errorf("batch get limited to 100 items")
    }

    // Remove duplicates
    uniqueKeys := make(map[string]bool)
    for _, key := range roleKeys {
        uniqueKeys[key] = true
    }

    keys := make([]map[string]types.AttributeValue, 0, len(uniqueKeys))
    for key := range uniqueKeys {
        pk := fmt.Sprintf("ROLE#%s", key)
        keys = append(keys, map[string]types.AttributeValue{
            "PK": &types.AttributeValueMemberS{Value: pk},
            "SK": &types.AttributeValueMemberS{Value: "METADATA"},
        })
    }

    input := &dynamodb.BatchGetItemInput{
        RequestItems: map[string]types.KeysAndAttributes{
            tableName: {
                Keys: keys,
            },
        },
    }

    result, err := client.BatchGetItem(ctx, input)
    if err != nil {
        return nil, fmt.Errorf("failed to batch get roles: %w", err)
    }

    roles := make(map[string]Role)
    if items, ok := result.Responses[tableName]; ok {
        for _, item := range items {
            var role Role
            err = attributevalue.UnmarshalMap(item, &role)
            if err != nil {
                continue
            }
            roles[role.Key] = role
        }
    }

    return roles, nil
}
```

### 12. Create or Update Role

**Put/Update**: Add or update role

```text
PK = "ROLE#<role-key>"
SK = "METADATA"
```

**Additional**: Update metadata entity to keep denormalized data in sync.

**Go Code Example**:

```go
// CreateOrUpdateRole creates or updates a role
func CreateOrUpdateRole(ctx context.Context, client *dynamodb.Client, tableName string, role Role) error {
    role.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
    if role.CreatedAt == "" {
        role.CreatedAt = role.UpdatedAt
    }

    item, err := attributevalue.MarshalMap(role)
    if err != nil {
        return fmt.Errorf("failed to marshal role: %w", err)
    }

    input := &dynamodb.PutItemInput{
        TableName: aws.String(tableName),
        Item:      item,
    }

    _, err = client.PutItem(ctx, input)
    if err != nil {
        return fmt.Errorf("failed to put role: %w", err)
    }

    // Update metadata entity
    metadata := RoleMetadata{
        PK:              "METADATA#ROLES",
        SK:              fmt.Sprintf("ROLE#%s", role.Key),
        EntityType:      "ROLE_METADATA",
        Key:             role.Key,
        Name:            role.Name,
        Category:        role.Category,
        BandMemberCount: role.BandMemberCount,
        UpdatedAt:       role.UpdatedAt,
    }

    metadataItem, err := attributevalue.MarshalMap(metadata)
    if err != nil {
        return fmt.Errorf("failed to marshal role metadata: %w", err)
    }

    metadataInput := &dynamodb.PutItemInput{
        TableName: aws.String(tableName),
        Item:      metadataItem,
    }

    _, err = client.PutItem(ctx, metadataInput)
    if err != nil {
        return fmt.Errorf("failed to put role metadata: %w", err)
    }

    return nil
}
```

### 13. Validate Genre and Role References

Ensures that all genre and role references in a band are valid.

**Go Code Example**:

```go
// ValidateGenreAndRoleReferences validates that all genre and role references exist
func ValidateGenreAndRoleReferences(ctx context.Context, client *dynamodb.Client, tableName string, band Band) error {
    // Validate genre references
    if len(band.GenreKeys) > 0 {
        existingGenres, err := BatchGetGenres(ctx, client, tableName, band.GenreKeys)
        if err != nil {
            return fmt.Errorf("failed to validate genre references: %w", err)
        }

        var missingGenres []string
        for _, genreKey := range band.GenreKeys {
            if _, exists := existingGenres[genreKey]; !exists {
                missingGenres = append(missingGenres, genreKey)
            }
        }

        if len(missingGenres) > 0 {
            return fmt.Errorf("invalid genre references: %v", missingGenres)
        }
    }

    // Validate role references
    allRoleKeys := make([]string, 0)
    for _, member := range band.Members {
        allRoleKeys = append(allRoleKeys, member.RoleKeys...)
    }

    if len(allRoleKeys) > 0 {
        existingRoles, err := BatchGetRoles(ctx, client, tableName, allRoleKeys)
        if err != nil {
            return fmt.Errorf("failed to validate role references: %w", err)
        }

        var missingRoles []string
        for _, roleKey := range allRoleKeys {
            if _, exists := existingRoles[roleKey]; !exists {
                missingRoles = append(missingRoles, roleKey)
            }
        }

        if len(missingRoles) > 0 {
            return fmt.Errorf("invalid role references: %v", missingRoles)
        }
    }

    return nil
}

// GetBandWithResolvedReferences retrieves a band and resolves genre and role references
func GetBandWithResolvedReferences(ctx context.Context, client *dynamodb.Client, tableName, bandKey string) (*Band, map[string]Genre, map[string]Role, error) {
    // Get band
    band, err := GetBandByKey(ctx, client, tableName, bandKey)
    if err != nil {
        return nil, nil, nil, err
    }

    // Get genres
    genres, err := BatchGetGenres(ctx, client, tableName, band.GenreKeys)
    if err != nil {
        return nil, nil, nil, fmt.Errorf("failed to get genres: %w", err)
    }

    // Get roles
    allRoleKeys := make([]string, 0)
    for _, member := range band.Members {
        allRoleKeys = append(allRoleKeys, member.RoleKeys...)
    }

    roles, err := BatchGetRoles(ctx, client, tableName, allRoleKeys)
    if err != nil {
        return nil, nil, nil, fmt.Errorf("failed to get roles: %w", err)
    }

    return band, genres, roles, nil
}
```

## Data Integrity Patterns

### 1. Referential Integrity

Ensuring band references in festivals point to valid band entities, and bands reference valid genres and roles.

**When creating/updating festival edition**:

```go
// ValidateBandReferences validates that all band references exist
func ValidateBandReferences(ctx context.Context, client *dynamodb.Client, tableName string, bandRefs []BandRef) error {
    bandKeys := make([]string, len(bandRefs))
    for i, ref := range bandRefs {
        bandKeys[i] = ref.Key
    }

    // Batch get all bands
    existingBands, err := BatchGetBands(ctx, client, tableName, bandKeys)
    if err != nil {
        return fmt.Errorf("failed to validate band references: %w", err)
    }

    // Check each reference
    var missingBands []string
    for _, ref := range bandRefs {
        if _, exists := existingBands[ref.Key]; !exists {
            missingBands = append(missingBands, ref.Key)
        }
    }

    if len(missingBands) > 0 {
        return fmt.Errorf("invalid band references: %v", missingBands)
    }

    return nil
}
```

**When creating/updating band**:

```go
// CreateOrUpdateBandWithValidation creates or updates a band with full validation
func CreateOrUpdateBandWithValidation(ctx context.Context, client *dynamodb.Client, tableName string, band Band) error {
    // Validate genre and role references first
    err := ValidateGenreAndRoleReferences(ctx, client, tableName, band)
    if err != nil {
        return err
    }

    // Create or update the band
    return CreateOrUpdateBand(ctx, client, tableName, band)
}
```

## Data Integrity Patterns (continued)

### 1. Referential Integrity (continued)

### 2. Synchronization with Festival Updates

When festival editions are updated, maintain band metadata consistency.

**When festival edition is created/updated**:

```go
// SyncBandMetadataFromFestival updates band festival counts when festivals change
func SyncBandMetadataFromFestival(ctx context.Context, client *dynamodb.Client, tableName string, oldBands, newBands []BandRef) error {
    // Identify added and removed bands
    oldBandKeys := make(map[string]bool)
    for _, ref := range oldBands {
        oldBandKeys[ref.Key] = true
    }

    newBandKeys := make(map[string]bool)
    for _, ref := range newBands {
        newBandKeys[ref.Key] = true
    }

    // Update counts for affected bands
    for key := range oldBandKeys {
        if !newBandKeys[key] {
            // Band was removed, decrement count
            err := updateBandFestivalCount(ctx, client, tableName, key, -1)
            if err != nil {
                return err
            }
        }
    }

    for key := range newBandKeys {
        if !oldBandKeys[key] {
            // Band was added, increment count
            err := updateBandFestivalCount(ctx, client, tableName, key, 1)
            if err != nil {
                return err
            }
        }
    }

    return nil
}

// updateBandFestivalCount increments or decrements the festival count for a band
func updateBandFestivalCount(ctx context.Context, client *dynamodb.Client, tableName, bandKey string, delta int) error {
    input := &dynamodb.UpdateItemInput{
        TableName: aws.String(tableName),
        Key: map[string]types.AttributeValue{
            "PK": &types.AttributeValueMemberS{Value: "METADATA#BANDS"},
            "SK": &types.AttributeValueMemberS{Value: fmt.Sprintf("BAND#%s", bandKey)},
        },
        UpdateExpression: aws.String("ADD festivalCount :delta SET updatedAt = :updatedAt"),
        ExpressionAttributeValues: map[string]types.AttributeValue{
            ":delta":     &types.AttributeValueMemberN{Value: fmt.Sprintf("%d", delta)},
            ":updatedAt": &types.AttributeValueMemberS{Value: time.Now().UTC().Format(time.RFC3339)},
        },
    }

    _, err := client.UpdateItem(ctx, input)
    if err != nil {
        return fmt.Errorf("failed to update band festival count: %w", err)
    }

    return nil
}
```

## Data Examples

### Example 1: Complete Band with Metadata

**Band Entity**:

```json
{
  "PK": "BAND#iron-maiden",
  "SK": "METADATA",
  "EntityType": "BAND",
  "key": "iron-maiden",
  "name": "Iron Maiden",
  "country": "United Kingdom",
  "description": "British heavy metal band formed in 1975. Iron Maiden are a British heavy metal band formed in Leyton, East London, in 1975 by bassist and primary songwriter Steve Harris.",
  "logo": "https://example.com/iron-maiden-logo.png",
  "headlineImage": "https://example.com/iron-maiden-live.jpg",
  "website": "https://www.ironmaiden.com",
  "spotify": "https://open.spotify.com/artist/6mdiAmATAx73kdxrNrnlao",
  "genreKeys": ["heavy-metal", "nwobhm", "hard-rock"],
  "members": [
    {
      "name": "Bruce Dickinson",
      "roleKeys": ["vocals"]
    },
    {
      "name": "Steve Harris",
      "roleKeys": ["bass"]
    },
    {
      "name": "Dave Murray",
      "roleKeys": ["guitar"]
    },
    {
      "name": "Adrian Smith",
      "roleKeys": ["guitar"]
    },
    {
      "name": "Janick Gers",
      "roleKeys": ["guitar"]
    },
    {
      "name": "Nicko McBrain",
      "roleKeys": ["drums"]
    }
  ],
  "reviewed": true,
  "createdAt": "2025-01-10T08:00:00Z",
  "updatedAt": "2025-01-20T14:30:00Z",
  "GSI3PK": "BANDS_REVIEWED",
  "GSI3SK": "iron-maiden"
}
```

**Band Metadata Entity**:

```json
{
  "PK": "METADATA#BANDS",
  "SK": "BAND#iron-maiden",
  "EntityType": "BAND_METADATA",
  "key": "iron-maiden",
  "name": "Iron Maiden",
  "country": "United Kingdom",
  "genreKeys": ["heavy-metal", "nwobhm", "hard-rock"],
  "genreNames": ["Heavy Metal", "NWOBHM", "Hard Rock"],
  "logo": "https://example.com/iron-maiden-logo.png",
  "reviewed": true,
  "festivalCount": 12,
  "updatedAt": "2025-01-20T14:30:00Z",
  "GSI3PK": "BANDS_REVIEWED",
  "GSI3SK": "iron-maiden"
}
```

**Related Genre Entities**:

```json
{
  "PK": "GENRE#heavy-metal",
  "SK": "METADATA",
  "EntityType": "GENRE",
  "key": "heavy-metal",
  "name": "Heavy Metal",
  "description": "A genre of rock music characterized by amplified distortion and loudness.",
  "bandCount": 250,
  "createdAt": "2025-01-10T08:00:00Z",
  "updatedAt": "2025-11-22T10:00:00Z"
}
```

**Related Role Entities**:

```json
{
  "PK": "ROLE#vocals",
  "SK": "METADATA",
  "EntityType": "ROLE",
  "key": "vocals",
  "name": "Vocals",
  "description": "Lead or backing vocals",
  "category": "voice",
  "bandMemberCount": 450,
  "createdAt": "2025-01-10T08:00:00Z",
  "updatedAt": "2025-11-22T10:00:00Z"
}
```

### Example 2: Unreviewed Band (Minimal Data)

**Band Entity**:

```json
{
  "PK": "BAND#new-metal-band",
  "SK": "METADATA",
  "EntityType": "BAND",
  "key": "new-metal-band",
  "name": "New Metal Band",
  "country": "",
  "description": "",
  "logo": "",
  "headlineImage": "",
  "website": "",
  "spotify": "",
  "genreKeys": [],
  "members": [],
  "reviewed": false,
  "createdAt": "2025-11-22T10:00:00Z",
  "updatedAt": "2025-11-22T10:00:00Z",
  "GSI3PK": "BANDS_UNREVIEWED",
  "GSI3SK": "new-metal-band"
}
```

**Band Metadata Entity**:

```json
{
  "PK": "METADATA#BANDS",
  "SK": "BAND#new-metal-band",
  "EntityType": "BAND_METADATA",
  "key": "new-metal-band",
  "name": "New Metal Band",
  "country": "",
  "genreKeys": [],
  "genreNames": [],
  "logo": "",
  "reviewed": false,
  "festivalCount": 1,
  "updatedAt": "2025-11-22T10:00:00Z",
  "GSI3PK": "BANDS_UNREVIEWED",
  "GSI3SK": "new-metal-band"
}
```

## Design Considerations

### 1. Single Table Benefits

- **Consistent Schema**: Bands and festivals in same table
- **Transaction Support**: Can update festivals and bands atomically
- **Cost Efficiency**: One table to manage, one set of GSIs
- **Simplified Queries**: Related data colocated

### 2. Referential Integrity

- **Validation Required**: Check band references before creating/updating festivals
- **Cascade Considerations**: Prevent deleting bands referenced by festivals
- **Sync Mechanism**: Update band metadata when festival references change
- **Data Consistency**: Use transactions for critical updates

### 3. Reviewed vs Unreviewed Status

- **GSI3 Separation**: Efficiently query bands by review status
- **Admin Workflow**: Easy to list bands needing review
- **Frontend Display**: Only show modal for reviewed bands
- **Progressive Enhancement**: Bands can start minimal and be enhanced later

### 4. Festival Count Tracking

- **Denormalized Counter**: Store count in metadata for performance
- **Update on Changes**: Increment/decrement when festivals change
- **Eventual Consistency**: Accept slight delays in count updates
- **Periodic Reconciliation**: Background job to verify counts

### 5. Search and Filtering

- **Client-Side**: Genre and name search done in frontend
- **Server-Side Options**: Could add GSI for genre-based queries
- **Full-Text Search**: Consider ElasticSearch/OpenSearch for advanced search
- **Performance**: Metadata entity optimized for listing

### 6. Genre and Role Deduplication

- **Normalized References**: Genres and roles stored once, referenced by key
- **Consistency**: Changes to genre/role names propagate naturally through denormalized data
- **Validation**: Enforce valid references before creating/updating bands
- **Count Tracking**: Maintain usage counts for genres and roles
- **Standardization**: Centralized definitions prevent spelling variations and duplicates

## Migration Strategy

### From Current db.json to DynamoDB

1. **Extract Unique Genres**: Parse all unique genre names from bands, create normalized keys
2. **Extract Unique Roles**: Parse all unique role names from band members, create normalized keys
3. **Create Reference Entities**: Create GENRE and ROLE entities with METADATA counterparts
4. **Extract Bands**: Parse all unique bands from current db.json
5. **Convert to References**: Replace genre/role strings with keys (e.g., "Heavy Metal" → "heavy-metal")
6. **Create Band Entities**: For each band, create BAND and BAND_METADATA with proper references
7. **Set Reviewed Status**: Mark bands with complete info as reviewed
8. **Validate References**: Ensure all festival band refs match band keys, all band genre/role refs are valid
9. **Sync Counts**: Calculate and set initial festival counts, genre band counts, role usage counts
10. **Test Integrity**: Verify all references are valid

**Migration Script Pattern**:

```go
func MigrateBandsFromJSON(ctx context.Context, client *dynamodb.Client, tableName string, bands []Band) error {
    // First, extract and create genres and roles
    genres := extractUniqueGenres(bands)
    for _, genre := range genres {
        err := CreateOrUpdateGenre(ctx, client, tableName, genre)
        if err != nil {
            return fmt.Errorf("failed to migrate genre %s: %w", genre.Key, err)
        }
    }

    roles := extractUniqueRoles(bands)
    for _, role := range roles {
        err := CreateOrUpdateRole(ctx, client, tableName, role)
        if err != nil {
            return fmt.Errorf("failed to migrate role %s: %w", role.Key, err)
        }
    }

    // Then migrate bands with references
    for _, band := range bands {
        // Determine reviewed status
        band.Reviewed = isComplete(band)

        // Validate references
        err := ValidateGenreAndRoleReferences(ctx, client, tableName, band)
        if err != nil {
            return fmt.Errorf("invalid references in band %s: %w", band.Key, err)
        }

        // Create band entity
        err = CreateOrUpdateBand(ctx, client, tableName, band)
        if err != nil {
            return fmt.Errorf("failed to migrate band %s: %w", band.Key, err)
        }
    }

    return nil
}

func isComplete(band Band) bool {
    return band.Description != "" &&
           band.Logo != "" &&
           len(band.GenreKeys) > 0 &&
           len(band.Members) > 0
}

func extractUniqueGenres(bands []Band) []Genre {
    genreMap := make(map[string]Genre)
    for _, band := range bands {
        for _, genreKey := range band.GenreKeys {
            if _, exists := genreMap[genreKey]; !exists {
                genreMap[genreKey] = Genre{
                    PK:          fmt.Sprintf("GENRE#%s", genreKey),
                    SK:          "METADATA",
                    EntityType:  "GENRE",
                    Key:         genreKey,
                    Name:        formatGenreName(genreKey), // Convert key to display name
                    Description: "",
                    BandCount:   0,
                }
            }
        }
    }

    genres := make([]Genre, 0, len(genreMap))
    for _, genre := range genreMap {
        genres = append(genres, genre)
    }
    return genres
}

func extractUniqueRoles(bands []Band) []Role {
    roleMap := make(map[string]Role)
    for _, band := range bands {
        for _, member := range band.Members {
            for _, roleKey := range member.RoleKeys {
                if _, exists := roleMap[roleKey]; !exists {
                    roleMap[roleKey] = Role{
                        PK:              fmt.Sprintf("ROLE#%s", roleKey),
                        SK:              "METADATA",
                        EntityType:      "ROLE",
                        Key:             roleKey,
                        Name:            formatRoleName(roleKey),
                        Description:     "",
                        Category:        determineRoleCategory(roleKey),
                        BandMemberCount: 0,
                    }
                }
            }
        }
    }

    roles := make([]Role, 0, len(roleMap))
    for _, role := range roleMap {
        roles = append(roles, role)
    }
    return roles
}
```

## API Adaptations

### Current API

```text
GET /db.json - Returns all festivals and bands
PUT /api/bands/{key} - Updates band
```

### Proposed API with DynamoDB

```text
# Bands
GET /api/bands - Returns all bands metadata
GET /api/bands/{key} - Returns specific band details
POST /api/bands - Creates new band
PUT /api/bands/{key} - Updates band
DELETE /api/bands/{key} - Deletes band (if not referenced)
GET /api/bands/reviewed - Returns only reviewed bands
GET /api/bands/unreviewed - Returns bands needing review
POST /api/bands/validate - Validates band references array
GET /api/bands/{key}/festivals - Returns festivals featuring this band

# Genres
GET /api/genres - Returns all genres
GET /api/genres/{key} - Returns specific genre details
POST /api/genres - Creates new genre
PUT /api/genres/{key} - Updates genre
GET /api/genres/{key}/bands - Returns bands in this genre

# Roles
GET /api/roles - Returns all roles
GET /api/roles/{key} - Returns specific role details
POST /api/roles - Creates new role
PUT /api/roles/{key} - Updates role
GET /api/roles/{key}/members - Returns band members with this role
```

## Benefits of This Design

1. **Data Integrity**: Strong referential integrity between festivals, bands, genres, and roles
2. **Efficient Queries**: Quick access to all bands or filtered by review status
3. **Single Table**: Simplified infrastructure and reduced costs
4. **Scalability**: Can handle unlimited bands, genres, and roles without schema changes
5. **Flexibility**: Easy to add new attributes without breaking changes
6. **Consistency**: Denormalized metadata keeps queries fast
7. **Admin Workflow**: Clear separation of reviewed vs unreviewed bands
8. **Performance**: Batch operations for loading multiple band details
9. **Deduplication**: Genres and roles stored once, preventing duplicates and inconsistencies
10. **Maintainability**: Centralized genre and role definitions make updates easier

## Integration with Festivals

### Consistency Rules

1. **Creating Festival Edition**:
   - Validate all band references exist
   - Increment festival count for each band

2. **Updating Festival Edition**:
   - Validate new band references
   - Update festival counts for added/removed bands

3. **Deleting Festival Edition**:
   - Decrement festival count for all bands

4. **Creating Band**:
   - Create both BAND and BAND_METADATA entities
   - Set appropriate GSI3 keys based on reviewed status

5. **Updating Band**:
   - Update both entities
   - Adjust GSI3 keys if reviewed status changes

6. **Deleting Band**:
   - Check for festival references first
   - Prevent deletion if referenced
   - Remove both entities if safe

### Transaction Example

For critical operations requiring atomicity:

```go
func UpdateFestivalEditionWithBandValidation(ctx context.Context, client *dynamodb.Client, tableName string, edition Edition) error {
    // Validate band references first
    err := ValidateBandReferences(ctx, client, tableName, edition.Bands)
    if err != nil {
        return err
    }

    // Use transaction to update edition and band counts atomically
    transactItems := []types.TransactWriteItem{
        {
            Put: &types.Put{
                TableName: aws.String(tableName),
                Item: marshalEdition(edition),
            },
        },
    }

    // Add updates for band festival counts
    for _, bandRef := range edition.Bands {
        transactItems = append(transactItems, types.TransactWriteItem{
            Update: &types.Update{
                TableName: aws.String(tableName),
                Key: map[string]types.AttributeValue{
                    "PK": &types.AttributeValueMemberS{Value: "METADATA#BANDS"},
                    "SK": &types.AttributeValueMemberS{Value: fmt.Sprintf("BAND#%s", bandRef.Key)},
                },
                UpdateExpression: aws.String("ADD festivalCount :inc SET updatedAt = :updatedAt"),
                ExpressionAttributeValues: map[string]types.AttributeValue{
                    ":inc":       &types.AttributeValueMemberN{Value: "1"},
                    ":updatedAt": &types.AttributeValueMemberS{Value: time.Now().UTC().Format(time.RFC3339)},
                },
            },
        })
    }

    input := &dynamodb.TransactWriteItemsInput{
        TransactItems: transactItems,
    }

    _, err = client.TransactWriteItems(ctx, input)
    if err != nil {
        return fmt.Errorf("transaction failed: %w", err)
    }

    return nil
}
```
