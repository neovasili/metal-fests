# DynamoDB Festivals Data Model

- [DynamoDB Festivals Data Model](#dynamodb-festivals-data-model)
  - [Overview](#overview)
  - [Current Access Patterns Analysis](#current-access-patterns-analysis)
    - [Public Pages (Frontend)](#public-pages-frontend)
    - [Admin Pages (Backend)](#admin-pages-backend)
  - [New Requirements](#new-requirements)
  - [Single-Table Design](#single-table-design)
    - [Table Structure](#table-structure)
    - [Entity Types](#entity-types)
  - [Data Model](#data-model)
    - [1. Festival Entity (General Information)](#1-festival-entity-general-information)
    - [2. Edition Entity (Year-Specific Information)](#2-edition-entity-year-specific-information)
    - [3. Festival Metadata Entity (Aggregated)](#3-festival-metadata-entity-aggregated)
  - [Query Patterns](#query-patterns)
    - [1. Get All Festivals with Latest Edition (Timeline/Map View)](#1-get-all-festivals-with-latest-edition-timelinemap-view)
    - [2. Get Festival Details with All Editions](#2-get-festival-details-with-all-editions)
    - [3. Get Specific Festival Edition](#3-get-specific-festival-edition)
    - [4. Get Upcoming Festivals from Current Date](#4-get-upcoming-festivals-from-current-date)
    - [5. Get Festivals by Location](#5-get-festivals-by-location)
    - [6. Update Festival Information](#6-update-festival-information)
    - [7. Add/Update Festival Edition](#7-addupdate-festival-edition)
    - [8. Batch Operations](#8-batch-operations)
    - [Supporting Types](#supporting-types)
  - [Data Examples](#data-examples)
    - [Example 1: Hellfest (Multiple Editions)](#example-1-hellfest-multiple-editions)
    - [Example 2: Wacken Open Air (Historical and Future Editions)](#example-2-wacken-open-air-historical-and-future-editions)
  - [Referential Integrity with Bands](#referential-integrity-with-bands)
    - [Band References in Festival Editions](#band-references-in-festival-editions)
  - [Design Considerations](#design-considerations)
    - [1. Denormalization Strategy](#1-denormalization-strategy)
    - [2. Date-Based Queries](#2-date-based-queries)
    - [3. Location-Based Queries](#3-location-based-queries)
    - [4. Client-Side vs Server-Side Filtering](#4-client-side-vs-server-side-filtering)
    - [5. Migration Strategy](#5-migration-strategy)
    - [6. Consistency Patterns](#6-consistency-patterns)
    - [7. Capacity Planning](#7-capacity-planning)
  - [API Adaptations](#api-adaptations)
    - [Current API](#current-api)
    - [Proposed API with DynamoDB](#proposed-api-with-dynamodb)
      - [Public API Endpoints (Read-Only)](#public-api-endpoints-read-only)
      - [Admin API Endpoints (Authentication Required)](#admin-api-endpoints-authentication-required)
  - [Benefits of This Design](#benefits-of-this-design)
  - [Related Documentation](#related-documentation)
  - [Future Enhancements](#future-enhancements)

## Overview

This document describes the DynamoDB single-table design for storing festivals data, including both festival general information and their individual editions (years). The design supports efficient querying patterns needed by the Metal Fests application.

## Current Access Patterns Analysis

Based on the codebase analysis, festivals data is accessed in the following ways:

### Public Pages (Frontend)

1. **Timeline View**:
   - Load ALL festivals
   - Sort by start date (ascending)
   - Filter by favorites (client-side)
   - Filter by bands (client-side)
   - Search by name, location, band names, or genres (client-side)
   - Show festivals from current date onwards

2. **Map View**:
   - Load ALL festivals
   - Display markers by coordinates
   - Apply same filters as timeline (favorites, bands, search)

3. **Festival Card Display**:
   - Show festival name, dates, location, coordinates
   - Display poster image, website link
   - List all bands (sorted by size and name)
   - Show ticket price

### Admin Pages (Backend)

1. **Festival Management**:
   - List all festivals
   - Update specific festival by key (`PUT /api/festivals/{key}`)
   - Full CRUD operations on festival data

## New Requirements

- **Multiple Editions**: A festival can have multiple editions (typically yearly)
- **Timeline Filtering**: Show festivals from current date onwards, considering all editions
- **Festival Identity**: Separate general festival information from edition-specific data

## Single-Table Design

### Table Structure

**Table Name**: `MetalFests`

**Primary Key**:

- **Partition Key (PK)**: `string`
- **Sort Key (SK)**: `string`

**Global Secondary Indexes (GSI)**:

1. **GSI1** - Query festivals by date
   - **GSI1PK**: `string` (Entity type identifier)
   - **GSI1SK**: `string` (Date or composite key)

2. **GSI2** - Query by location/coordinates
   - **GSI2PK**: `string` (Location identifier)
   - **GSI2SK**: `string` (Festival key)

### Entity Types

The table will store three entity types:

1. **FESTIVAL** - General festival information
2. **EDITION** - Specific festival edition (year)
3. **FESTIVAL_METADATA** - Aggregated metadata for queries

## Data Model

### 1. Festival Entity (General Information)

Stores the general, permanent information about a festival.

**Keys**:

- `PK`: `FESTIVAL#<festival-key>`
- `SK`: `METADATA`

**Attributes**:

```json
{
  "PK": "FESTIVAL#sweden-rock-festival",
  "SK": "METADATA",
  "EntityType": "FESTIVAL",
  "key": "sweden-rock-festival",
  "name": "Sweden Rock Festival",
  "location": "Sölvesborg, Sweden",
  "coordinates": {
    "lat": 56.0515,
    "lng": 14.5683
  },
  "website": "https://swedenrock.com",
  "poster": "https://play-lh.googleusercontent.com/...",
  "description": "One of Europe's largest rock and metal festivals",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z",
  "GSI2PK": "LOCATION#sweden",
  "GSI2SK": "FESTIVAL#sweden-rock-festival"
}
```

### 2. Edition Entity (Year-Specific Information)

Stores edition-specific information (dates, bands, ticket price).

**Keys**:

- `PK`: `FESTIVAL#<festival-key>`
- `SK`: `EDITION#<year>`

**Attributes**:

```json
{
  "PK": "FESTIVAL#sweden-rock-festival",
  "SK": "EDITION#2026",
  "EntityType": "EDITION",
  "festivalKey": "sweden-rock-festival",
  "festivalName": "Sweden Rock Festival",
  "year": 2026,
  "dates": {
    "start": "2026-06-03",
    "end": "2026-06-06"
  },
  "bands": [
    {
      "key": "iron-maiden",
      "name": "Iron Maiden",
      "size": 0
    },
    {
      "key": "volbeat",
      "name": "Volbeat",
      "size": 0
    }
  ],
  "ticketPrice": 2450.00,
  "currency": "SEK",
  "status": "confirmed",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z",
  "GSI1PK": "EDITIONS_BY_DATE",
  "GSI1SK": "2026-06-03#sweden-rock-festival#2026"
}
```

### 3. Festival Metadata Entity (Aggregated)

Stores denormalized data for efficient querying.

**Keys**:

- `PK`: `METADATA#FESTIVALS`
- `SK`: `FESTIVAL#<festival-key>`

**Attributes**:

```json
{
  "PK": "METADATA#FESTIVALS",
  "SK": "FESTIVAL#sweden-rock-festival",
  "EntityType": "FESTIVAL_METADATA",
  "festivalKey": "sweden-rock-festival",
  "festivalName": "Sweden Rock Festival",
  "location": "Sölvesborg, Sweden",
  "coordinates": {
    "lat": 56.0515,
    "lng": 14.5683
  },
  "website": "https://swedenrock.com",
  "poster": "https://play-lh.googleusercontent.com/...",
  "latestEdition": {
    "year": 2026,
    "dates": {
      "start": "2026-06-03",
      "end": "2026-06-06"
    },
    "bandCount": 50,
    "ticketPrice": 2450.00,
    "currency": "SEK"
  },
  "editions": [2024, 2025, 2026],
  "totalEditions": 3,
  "updatedAt": "2025-01-15T10:00:00Z",
  "GSI1PK": "UPCOMING_FESTIVALS",
  "GSI1SK": "2026-06-03#sweden-rock-festival"
}
```

## Query Patterns

### 1. Get All Festivals with Latest Edition (Timeline/Map View)

**Query**: Scan or Query on `METADATA#FESTIVALS` partition

```text
PK = "METADATA#FESTIVALS"
```

**Alternative with GSI1**: Get upcoming festivals sorted by date

```text
GSI1PK = "UPCOMING_FESTIVALS"
GSI1SK >= current_date
```

**Result**: Returns all festivals with their latest edition information, sorted by date.

**Go Code Example**:

```go
import (
    "context"
    "fmt"
    "time"

    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

// FestivalMetadata represents the metadata entity
type FestivalMetadata struct {
    PK              string                 `dynamodbav:"PK"`
    SK              string                 `dynamodbav:"SK"`
    EntityType      string                 `dynamodbav:"EntityType"`
    FestivalKey     string                 `dynamodbav:"festivalKey"`
    FestivalName    string                 `dynamodbav:"festivalName"`
    Location        string                 `dynamodbav:"location"`
    Coordinates     Coordinates            `dynamodbav:"coordinates"`
    Website         string                 `dynamodbav:"website"`
    Poster          string                 `dynamodbav:"poster"`
    LatestEdition   LatestEditionInfo      `dynamodbav:"latestEdition"`
    Editions        []int                  `dynamodbav:"editions"`
    TotalEditions   int                    `dynamodbav:"totalEditions"`
    UpdatedAt       string                 `dynamodbav:"updatedAt"`
    GSI1PK          string                 `dynamodbav:"GSI1PK"`
    GSI1SK          string                 `dynamodbav:"GSI1SK"`
}

// GetAllFestivalsWithLatestEdition retrieves all festivals with their latest edition info
func GetAllFestivalsWithLatestEdition(ctx context.Context, client *dynamodb.Client, tableName string) ([]FestivalMetadata, error) {
    input := &dynamodb.QueryInput{
        TableName:              aws.String(tableName),
        KeyConditionExpression: aws.String("PK = :pk"),
        ExpressionAttributeValues: map[string]types.AttributeValue{
            ":pk": &types.AttributeValueMemberS{Value: "METADATA#FESTIVALS"},
        },
    }

    result, err := client.Query(ctx, input)
    if err != nil {
        return nil, fmt.Errorf("failed to query festivals: %w", err)
    }

    var festivals []FestivalMetadata
    err = attributevalue.UnmarshalListOfMaps(result.Items, &festivals)
    if err != nil {
        return nil, fmt.Errorf("failed to unmarshal festivals: %w", err)
    }

    return festivals, nil
}

// GetUpcomingFestivals retrieves upcoming festivals from current date using GSI1
func GetUpcomingFestivals(ctx context.Context, client *dynamodb.Client, tableName string) ([]FestivalMetadata, error) {
    currentDate := time.Now().Format("2006-01-02")

    input := &dynamodb.QueryInput{
        TableName:              aws.String(tableName),
        IndexName:              aws.String("GSI1"),
        KeyConditionExpression: aws.String("GSI1PK = :gsi1pk AND GSI1SK >= :currentDate"),
        ExpressionAttributeValues: map[string]types.AttributeValue{
            ":gsi1pk":     &types.AttributeValueMemberS{Value: "UPCOMING_FESTIVALS"},
            ":currentDate": &types.AttributeValueMemberS{Value: currentDate},
        },
    }

    result, err := client.Query(ctx, input)
    if err != nil {
        return nil, fmt.Errorf("failed to query upcoming festivals: %w", err)
    }

    var festivals []FestivalMetadata
    err = attributevalue.UnmarshalListOfMaps(result.Items, &festivals)
    if err != nil {
        return nil, fmt.Errorf("failed to unmarshal festivals: %w", err)
    }

    return festivals, nil
}
```

### 2. Get Festival Details with All Editions

**Query**: Get items for a specific festival

```text
PK = "FESTIVAL#<festival-key>"
```

**Result**: Returns festival metadata and all editions.

**Go Code Example**:

```go
// Festival represents the general festival entity
type Festival struct {
    PK          string      `dynamodbav:"PK"`
    SK          string      `dynamodbav:"SK"`
    EntityType  string      `dynamodbav:"EntityType"`
    Key         string      `dynamodbav:"key"`
    Name        string      `dynamodbav:"name"`
    Location    string      `dynamodbav:"location"`
    Coordinates Coordinates `dynamodbav:"coordinates"`
    Website     string      `dynamodbav:"website"`
    Poster      string      `dynamodbav:"poster"`
    Description string      `dynamodbav:"description,omitempty"`
    CreatedAt   string      `dynamodbav:"createdAt"`
    UpdatedAt   string      `dynamodbav:"updatedAt"`
}

// Edition represents a festival edition entity
type Edition struct {
    PK           string    `dynamodbav:"PK"`
    SK           string    `dynamodbav:"SK"`
    EntityType   string    `dynamodbav:"EntityType"`
    FestivalKey  string    `dynamodbav:"festivalKey"`
    FestivalName string    `dynamodbav:"festivalName"`
    Year         int       `dynamodbav:"year"`
    Dates        Dates     `dynamodbav:"dates"`
    Bands        []BandRef `dynamodbav:"bands"`
    TicketPrice  float64   `dynamodbav:"ticketPrice"`
    Currency     string    `dynamodbav:"currency"`
    Status       string    `dynamodbav:"status"`
    CreatedAt    string    `dynamodbav:"createdAt"`
    UpdatedAt    string    `dynamodbav:"updatedAt"`
    GSI1PK       string    `dynamodbav:"GSI1PK"`
    GSI1SK       string    `dynamodbav:"GSI1SK"`
}

// FestivalWithEditions contains festival info and all its editions
type FestivalWithEditions struct {
    Festival Festival
    Editions []Edition
}

// GetFestivalWithAllEditions retrieves festival metadata and all editions
func GetFestivalWithAllEditions(ctx context.Context, client *dynamodb.Client, tableName, festivalKey string) (*FestivalWithEditions, error) {
    pk := fmt.Sprintf("FESTIVAL#%s", festivalKey)

    input := &dynamodb.QueryInput{
        TableName:              aws.String(tableName),
        KeyConditionExpression: aws.String("PK = :pk"),
        ExpressionAttributeValues: map[string]types.AttributeValue{
            ":pk": &types.AttributeValueMemberS{Value: pk},
        },
    }

    result, err := client.Query(ctx, input)
    if err != nil {
        return nil, fmt.Errorf("failed to query festival: %w", err)
    }

    if len(result.Items) == 0 {
        return nil, fmt.Errorf("festival not found")
    }

    response := &FestivalWithEditions{
        Editions: make([]Edition, 0),
    }

    // Unmarshal items based on EntityType
    for _, item := range result.Items {
        entityType := item["EntityType"].(*types.AttributeValueMemberS).Value

        switch entityType {
        case "FESTIVAL":
            var festival Festival
            err = attributevalue.UnmarshalMap(item, &festival)
            if err != nil {
                return nil, fmt.Errorf("failed to unmarshal festival: %w", err)
            }
            response.Festival = festival

        case "EDITION":
            var edition Edition
            err = attributevalue.UnmarshalMap(item, &edition)
            if err != nil {
                return nil, fmt.Errorf("failed to unmarshal edition: %w", err)
            }
            response.Editions = append(response.Editions, edition)
        }
    }

    return response, nil
}
```

### 3. Get Specific Festival Edition

**Query**: Get specific edition

```text
PK = "FESTIVAL#<festival-key>"
SK = "EDITION#<year>"
```

**Result**: Returns details for a specific festival edition.

**Go Code Example**:

```go
// GetFestivalEdition retrieves a specific festival edition by year
func GetFestivalEdition(ctx context.Context, client *dynamodb.Client, tableName, festivalKey string, year int) (*Edition, error) {
    pk := fmt.Sprintf("FESTIVAL#%s", festivalKey)
    sk := fmt.Sprintf("EDITION#%d", year)

    input := &dynamodb.GetItemInput{
        TableName: aws.String(tableName),
        Key: map[string]types.AttributeValue{
            "PK": &types.AttributeValueMemberS{Value: pk},
            "SK": &types.AttributeValueMemberS{Value: sk},
        },
    }

    result, err := client.GetItem(ctx, input)
    if err != nil {
        return nil, fmt.Errorf("failed to get edition: %w", err)
    }

    if result.Item == nil {
        return nil, fmt.Errorf("edition not found")
    }

    var edition Edition
    err = attributevalue.UnmarshalMap(result.Item, &edition)
    if err != nil {
        return nil, fmt.Errorf("failed to unmarshal edition: %w", err)
    }

    return &edition, nil
}
```

### 4. Get Upcoming Festivals from Current Date

**Query**: Query GSI1

```text
GSI1PK = "UPCOMING_FESTIVALS"
GSI1SK >= current_date
```

**Result**: Returns festivals sorted by start date from current date onwards.

**Note**: See code example in Query Pattern #1 (`GetUpcomingFestivals` function).

### 5. Get Festivals by Location

**Query**: Query GSI2

```text
GSI2PK = "LOCATION#<country-code>"
```

**Result**: Returns all festivals in a specific location.

**Go Code Example**:

```go
// GetFestivalsByLocation retrieves all festivals in a specific location using GSI2
func GetFestivalsByLocation(ctx context.Context, client *dynamodb.Client, tableName, countryCode string) ([]Festival, error) {
    locationKey := fmt.Sprintf("LOCATION#%s", countryCode)

    input := &dynamodb.QueryInput{
        TableName:              aws.String(tableName),
        IndexName:              aws.String("GSI2"),
        KeyConditionExpression: aws.String("GSI2PK = :gsi2pk"),
        ExpressionAttributeValues: map[string]types.AttributeValue{
            ":gsi2pk": &types.AttributeValueMemberS{Value: locationKey},
        },
    }

    result, err := client.Query(ctx, input)
    if err != nil {
        return nil, fmt.Errorf("failed to query festivals by location: %w", err)
    }

    var festivals []Festival
    err = attributevalue.UnmarshalListOfMaps(result.Items, &festivals)
    if err != nil {
        return nil, fmt.Errorf("failed to unmarshal festivals: %w", err)
    }

    return festivals, nil
}
```

### 6. Update Festival Information

**Update**: Update festival metadata

```text
PK = "FESTIVAL#<festival-key>"
SK = "METADATA"
```

**Go Code Example**:

```go
// UpdateFestivalInfo updates the general festival information
func UpdateFestivalInfo(ctx context.Context, client *dynamodb.Client, tableName string, festival Festival) error {
    festival.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

    item, err := attributevalue.MarshalMap(festival)
    if err != nil {
        return fmt.Errorf("failed to marshal festival: %w", err)
    }

    input := &dynamodb.PutItemInput{
        TableName: aws.String(tableName),
        Item:      item,
    }

    _, err = client.PutItem(ctx, input)
    if err != nil {
        return fmt.Errorf("failed to update festival: %w", err)
    }

    // Also update the metadata entity to keep denormalized data in sync
    err = updateFestivalMetadata(ctx, client, tableName, festival)
    if err != nil {
        return fmt.Errorf("failed to update festival metadata: %w", err)
    }

    return nil
}

// UpdateFestivalAttributes updates specific attributes of a festival using UpdateItem
func UpdateFestivalAttributes(ctx context.Context, client *dynamodb.Client, tableName, festivalKey string, updates map[string]interface{}) error {
    pk := fmt.Sprintf("FESTIVAL#%s", festivalKey)

    // Build update expression
    updateExpr := "SET "
    exprAttrNames := make(map[string]string)
    exprAttrValues := make(map[string]types.AttributeValue)

    i := 0
    for key, value := range updates {
        if i > 0 {
            updateExpr += ", "
        }
        attrName := fmt.Sprintf("#attr%d", i)
        attrValue := fmt.Sprintf(":val%d", i)

        updateExpr += fmt.Sprintf("%s = %s", attrName, attrValue)
        exprAttrNames[attrName] = key

        av, err := attributevalue.Marshal(value)
        if err != nil {
            return fmt.Errorf("failed to marshal value: %w", err)
        }
        exprAttrValues[attrValue] = av
        i++
    }

    // Always update the updatedAt timestamp
    updateExpr += ", #updatedAt = :updatedAt"
    exprAttrNames["#updatedAt"] = "updatedAt"
    exprAttrValues[":updatedAt"] = &types.AttributeValueMemberS{
        Value: time.Now().UTC().Format(time.RFC3339),
    }

    input := &dynamodb.UpdateItemInput{
        TableName: aws.String(tableName),
        Key: map[string]types.AttributeValue{
            "PK": &types.AttributeValueMemberS{Value: pk},
            "SK": &types.AttributeValueMemberS{Value: "METADATA"},
        },
        UpdateExpression:          aws.String(updateExpr),
        ExpressionAttributeNames:  exprAttrNames,
        ExpressionAttributeValues: exprAttrValues,
    }

    _, err := client.UpdateItem(ctx, input)
    if err != nil {
        return fmt.Errorf("failed to update festival attributes: %w", err)
    }

    return nil
}
```

### 7. Add/Update Festival Edition

**Put/Update**: Add or update edition

```text
PK = "FESTIVAL#<festival-key>"
SK = "EDITION#<year>"
```

**Additional**: Update metadata entity to keep denormalized data in sync.

**Go Code Example**:

```go
// CreateOrUpdateEdition creates or updates a festival edition
func CreateOrUpdateEdition(ctx context.Context, client *dynamodb.Client, tableName string, edition Edition) error {
    edition.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
    if edition.CreatedAt == "" {
        edition.CreatedAt = edition.UpdatedAt
    }

    // Set GSI1 keys for date-based queries
    edition.GSI1PK = "EDITIONS_BY_DATE"
    edition.GSI1SK = fmt.Sprintf("%s#%s#%d", edition.Dates.Start, edition.FestivalKey, edition.Year)

    item, err := attributevalue.MarshalMap(edition)
    if err != nil {
        return fmt.Errorf("failed to marshal edition: %w", err)
    }

    input := &dynamodb.PutItemInput{
        TableName: aws.String(tableName),
        Item:      item,
    }

    _, err = client.PutItem(ctx, input)
    if err != nil {
        return fmt.Errorf("failed to put edition: %w", err)
    }

    // Update the metadata entity to sync denormalized data
    err = updateMetadataAfterEditionChange(ctx, client, tableName, edition)
    if err != nil {
        return fmt.Errorf("failed to update metadata: %w", err)
    }

    return nil
}

// updateMetadataAfterEditionChange updates the FESTIVAL_METADATA entity after an edition is added/updated
func updateMetadataAfterEditionChange(ctx context.Context, client *dynamodb.Client, tableName string, edition Edition) error {
    // Get current metadata
    metadataPK := "METADATA#FESTIVALS"
    metadataSK := fmt.Sprintf("FESTIVAL#%s", edition.FestivalKey)

    getInput := &dynamodb.GetItemInput{
        TableName: aws.String(tableName),
        Key: map[string]types.AttributeValue{
            "PK": &types.AttributeValueMemberS{Value: metadataPK},
            "SK": &types.AttributeValueMemberS{Value: metadataSK},
        },
    }

    result, err := client.GetItem(ctx, getInput)
    if err != nil {
        return fmt.Errorf("failed to get metadata: %w", err)
    }

    var metadata FestivalMetadata
    if result.Item != nil {
        err = attributevalue.UnmarshalMap(result.Item, &metadata)
        if err != nil {
            return fmt.Errorf("failed to unmarshal metadata: %w", err)
        }
    }

    // Update latest edition if this edition is newer
    if metadata.LatestEdition.Year < edition.Year {
        metadata.LatestEdition = LatestEditionInfo{
            Year: edition.Year,
            Dates: edition.Dates,
            BandCount: len(edition.Bands),
            TicketPrice: edition.TicketPrice,
            Currency: edition.Currency,
        }
        metadata.GSI1SK = fmt.Sprintf("%s#%s", edition.Dates.Start, edition.FestivalKey)
    }

    // Add year to editions list if not present
    yearExists := false
    for _, y := range metadata.Editions {
        if y == edition.Year {
            yearExists = true
            break
        }
    }
    if !yearExists {
        metadata.Editions = append(metadata.Editions, edition.Year)
        metadata.TotalEditions = len(metadata.Editions)
    }

    metadata.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

    // Put updated metadata
    item, err := attributevalue.MarshalMap(metadata)
    if err != nil {
        return fmt.Errorf("failed to marshal updated metadata: %w", err)
    }

    putInput := &dynamodb.PutItemInput{
        TableName: aws.String(tableName),
        Item:      item,
    }

    _, err = client.PutItem(ctx, putInput)
    if err != nil {
        return fmt.Errorf("failed to put updated metadata: %w", err)
    }

    return nil
}

// DeleteEdition deletes a specific festival edition
func DeleteEdition(ctx context.Context, client *dynamodb.Client, tableName, festivalKey string, year int) error {
    pk := fmt.Sprintf("FESTIVAL#%s", festivalKey)
    sk := fmt.Sprintf("EDITION#%d", year)

    input := &dynamodb.DeleteItemInput{
        TableName: aws.String(tableName),
        Key: map[string]types.AttributeValue{
            "PK": &types.AttributeValueMemberS{Value: pk},
            "SK": &types.AttributeValueMemberS{Value: sk},
        },
    }

    _, err := client.DeleteItem(ctx, input)
    if err != nil {
        return fmt.Errorf("failed to delete edition: %w", err)
    }

    // Note: Should also update metadata to remove year from editions list
    // and recalculate latest edition if needed

    return nil
}
```

### 8. Batch Operations

For efficient bulk operations, use BatchGetItem and BatchWriteItem.

**Go Code Example**:

```go
// BatchGetFestivalEditions retrieves multiple editions in a single batch request
func BatchGetFestivalEditions(ctx context.Context, client *dynamodb.Client, tableName string, requests []struct {
    FestivalKey string
    Year        int
}) ([]Edition, error) {
    if len(requests) == 0 {
        return nil, nil
    }

    // DynamoDB limits batch get to 100 items
    if len(requests) > 100 {
        return nil, fmt.Errorf("batch get limited to 100 items")
    }

    keys := make([]map[string]types.AttributeValue, 0, len(requests))
    for _, req := range requests {
        pk := fmt.Sprintf("FESTIVAL#%s", req.FestivalKey)
        sk := fmt.Sprintf("EDITION#%d", req.Year)

        keys = append(keys, map[string]types.AttributeValue{
            "PK": &types.AttributeValueMemberS{Value: pk},
            "SK": &types.AttributeValueMemberS{Value: sk},
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
        return nil, fmt.Errorf("failed to batch get editions: %w", err)
    }

    var editions []Edition
    if items, ok := result.Responses[tableName]; ok {
        err = attributevalue.UnmarshalListOfMaps(items, &editions)
        if err != nil {
            return nil, fmt.Errorf("failed to unmarshal editions: %w", err)
        }
    }

    return editions, nil
}

// BatchCreateEditions creates multiple editions in a single batch request
func BatchCreateEditions(ctx context.Context, client *dynamodb.Client, tableName string, editions []Edition) error {
    if len(editions) == 0 {
        return nil
    }

    // DynamoDB limits batch write to 25 items
    const batchSize = 25

    for i := 0; i < len(editions); i += batchSize {
        end := i + batchSize
        if end > len(editions) {
            end = len(editions)
        }

        batch := editions[i:end]
        writeRequests := make([]types.WriteRequest, 0, len(batch))

        for _, edition := range batch {
            edition.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
            if edition.CreatedAt == "" {
                edition.CreatedAt = edition.UpdatedAt
            }
            edition.GSI1PK = "EDITIONS_BY_DATE"
            edition.GSI1SK = fmt.Sprintf("%s#%s#%d", edition.Dates.Start, edition.FestivalKey, edition.Year)

            item, err := attributevalue.MarshalMap(edition)
            if err != nil {
                return fmt.Errorf("failed to marshal edition: %w", err)
            }

            writeRequests = append(writeRequests, types.WriteRequest{
                PutRequest: &types.PutRequest{
                    Item: item,
                },
            })
        }

        input := &dynamodb.BatchWriteItemInput{
            RequestItems: map[string][]types.WriteRequest{
                tableName: writeRequests,
            },
        }

        _, err := client.BatchWriteItem(ctx, input)
        if err != nil {
            return fmt.Errorf("failed to batch write editions: %w", err)
        }
    }

    return nil
}
```

### Supporting Types

**Go Code Example**:

```go
// Supporting types used across all operations

type Coordinates struct {
    Lat float64 `dynamodbav:"lat" json:"lat"`
    Lng float64 `dynamodbav:"lng" json:"lng"`
}

type Dates struct {
    Start string `dynamodbav:"start" json:"start"` // Format: YYYY-MM-DD
    End   string `dynamodbav:"end" json:"end"`     // Format: YYYY-MM-DD
}

type BandRef struct {
    Key  string `dynamodbav:"key" json:"key"`   // MUST match BAND entity key
    Name string `dynamodbav:"name" json:"name"` // Denormalized for display
    Size int    `dynamodbav:"size" json:"size"` // 0-3, determines tier
}

type LatestEditionInfo struct {
    Year        int     `dynamodbav:"year" json:"year"`
    Dates       Dates   `dynamodbav:"dates" json:"dates"`
    BandCount   int     `dynamodbav:"bandCount" json:"bandCount"`
    TicketPrice float64 `dynamodbav:"ticketPrice" json:"ticketPrice"`
    Currency    string  `dynamodbav:"currency" json:"currency"`
}

// Initialize DynamoDB client
func NewDynamoDBClient(ctx context.Context, region string) (*dynamodb.Client, error) {
    cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
    if err != nil {
        return nil, fmt.Errorf("failed to load config: %w", err)
    }

    return dynamodb.NewFromConfig(cfg), nil
}
```

## Data Examples

### Example 1: Hellfest (Multiple Editions)

**Festival Metadata**:

```json
{
  "PK": "FESTIVAL#hellfest",
  "SK": "METADATA",
  "EntityType": "FESTIVAL",
  "key": "hellfest",
  "name": "Hellfest",
  "location": "Clisson, France",
  "coordinates": {
    "lat": 47.0889,
    "lng": -1.2806
  },
  "website": "https://www.hellfest.fr",
  "poster": "https://example.com/hellfest-logo.jpg",
  "GSI2PK": "LOCATION#france",
  "GSI2SK": "FESTIVAL#hellfest"
}
```

**Edition 2025**:

```json
{
  "PK": "FESTIVAL#hellfest",
  "SK": "EDITION#2025",
  "EntityType": "EDITION",
  "festivalKey": "hellfest",
  "festivalName": "Hellfest",
  "year": 2025,
  "dates": {
    "start": "2025-06-19",
    "end": "2025-06-22"
  },
  "bands": [
    {
      "key": "metallica",
      "name": "Metallica",
      "size": 0
    },
    {
      "key": "slipknot",
      "name": "Slipknot",
      "size": 0
    }
  ],
  "ticketPrice": 249.00,
  "currency": "EUR",
  "status": "confirmed",
  "GSI1PK": "EDITIONS_BY_DATE",
  "GSI1SK": "2025-06-19#hellfest#2025"
}
```

**Edition 2026**:

```json
{
  "PK": "FESTIVAL#hellfest",
  "SK": "EDITION#2026",
  "EntityType": "EDITION",
  "festivalKey": "hellfest",
  "festivalName": "Hellfest",
  "year": 2026,
  "dates": {
    "start": "2026-06-18",
    "end": "2026-06-21"
  },
  "bands": [
    {
      "key": "iron-maiden",
      "name": "Iron Maiden",
      "size": 0
    }
  ],
  "ticketPrice": 259.00,
  "currency": "EUR",
  "status": "announced",
  "GSI1PK": "EDITIONS_BY_DATE",
  "GSI1SK": "2026-06-18#hellfest#2026"
}
```

**Metadata Entry**:

```json
{
  "PK": "METADATA#FESTIVALS",
  "SK": "FESTIVAL#hellfest",
  "EntityType": "FESTIVAL_METADATA",
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
  "totalEditions": 3,
  "updatedAt": "2025-01-15T10:00:00Z",
  "GSI1PK": "UPCOMING_FESTIVALS",
  "GSI1SK": "2026-06-18#hellfest"
}
```

### Example 2: Wacken Open Air (Historical and Future Editions)

**Festival Metadata**:

```json
{
  "PK": "FESTIVAL#wacken-open-air",
  "SK": "METADATA",
  "EntityType": "FESTIVAL",
  "key": "wacken-open-air",
  "name": "Wacken Open Air",
  "location": "Wacken, Germany",
  "coordinates": {
    "lat": 53.9667,
    "lng": 9.3833
  },
  "website": "https://www.wacken.com",
  "poster": "https://example.com/wacken-logo.jpg",
  "GSI2PK": "LOCATION#germany",
  "GSI2SK": "FESTIVAL#wacken-open-air"
}
```

**Edition 2024 (Past)**:

```json
{
  "PK": "FESTIVAL#wacken-open-air",
  "SK": "EDITION#2024",
  "EntityType": "EDITION",
  "festivalKey": "wacken-open-air",
  "festivalName": "Wacken Open Air",
  "year": 2024,
  "dates": {
    "start": "2024-08-01",
    "end": "2024-08-03"
  },
  "bands": [
    {
      "key": "scorpions",
      "name": "Scorpions",
      "size": 0
    }
  ],
  "ticketPrice": 275.00,
  "currency": "EUR",
  "status": "completed",
  "GSI1PK": "EDITIONS_BY_DATE",
  "GSI1SK": "2024-08-01#wacken-open-air#2024"
}
```

**Edition 2026 (Future)**:

```json
{
  "PK": "FESTIVAL#wacken-open-air",
  "SK": "EDITION#2026",
  "EntityType": "EDITION",
  "festivalKey": "wacken-open-air",
  "festivalName": "Wacken Open Air",
  "year": 2026,
  "dates": {
    "start": "2026-07-30",
    "end": "2026-08-01"
  },
  "bands": [
    {
      "key": "judas-priest",
      "name": "Judas Priest",
      "size": 0
    }
  ],
  "ticketPrice": 299.00,
  "currency": "EUR",
  "status": "announced",
  "GSI1PK": "EDITIONS_BY_DATE",
  "GSI1SK": "2026-07-30#wacken-open-air#2026"
}
```

**Metadata Entry**:

```json
{
  "PK": "METADATA#FESTIVALS",
  "SK": "FESTIVAL#wacken-open-air",
  "EntityType": "FESTIVAL_METADATA",
  "festivalKey": "wacken-open-air",
  "festivalName": "Wacken Open Air",
  "location": "Wacken, Germany",
  "coordinates": {
    "lat": 53.9667,
    "lng": 9.3833
  },
  "website": "https://www.wacken.com",
  "poster": "https://example.com/wacken-logo.jpg",
  "latestEdition": {
    "year": 2026,
    "dates": {
      "start": "2026-07-30",
      "end": "2026-08-01"
    },
    "bandCount": 180,
    "ticketPrice": 299.00,
    "currency": "EUR"
  },
  "editions": [2022, 2023, 2024, 2025, 2026],
  "totalEditions": 5,
  "updatedAt": "2025-01-15T10:00:00Z",
  "GSI1PK": "UPCOMING_FESTIVALS",
  "GSI1SK": "2026-07-30#wacken-open-air"
}
```

## Referential Integrity with Bands

### Band References in Festival Editions

Festival editions reference bands through the `BandRef` structure. The `key` field in `BandRef` MUST match a valid `BAND` entity key in the same table.

**Validation Pattern**:

```go
// ValidateBandReferences ensures all band references point to valid bands
func ValidateBandReferences(ctx context.Context, client *dynamodb.Client, tableName string, bandRefs []BandRef) error {
    bandKeys := make([]string, len(bandRefs))
    for i, ref := range bandRefs {
        bandKeys[i] = ref.Key
    }

    // Batch get all bands to verify they exist
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

**Best Practice**: Always validate band references before creating or updating festival editions. See the [Bands Data Model](DYNAMODB_BANDS_DATA_MODEL.md) document for complete band entity details and additional referential integrity patterns.

## Design Considerations

### 1. Denormalization Strategy

The design uses controlled denormalization:

- **FESTIVAL_METADATA** entity stores aggregated data to avoid complex joins
- Latest edition information is duplicated for fast access
- Updates require maintaining consistency across entities

### 2. Date-Based Queries

The GSI1SK uses a composite key format: `YYYY-MM-DD#<festival-key>#<year>` to enable:

- Efficient range queries by date
- Unique sort keys per edition
- Easy filtering for upcoming festivals

### 3. Location-Based Queries

GSI2 enables location-based filtering:

- Useful for map view filtering by region
- Can be extended to support country-level queries
- Coordinates are stored but not indexed (filtering done client-side)

### 4. Client-Side vs Server-Side Filtering

Current implementation does heavy client-side filtering. With DynamoDB:

- **Server-side**: Date-based filtering, location-based filtering
- **Client-side**: Search by name/bands/genres, favorites, band filtering

This maintains the current user experience while enabling more efficient data loading.

### 5. Migration Strategy

When migrating from current db.json:

1. Create FESTIVAL entity for each unique festival (extract general info)
2. Create EDITION entity for each festival with year from date
3. Create FESTIVAL_METADATA for efficient querying
4. Update frontend to query from DynamoDB instead of db.json
5. Maintain backward compatibility during transition

### 6. Consistency Patterns

When updating data:

- **Single Edition Update**: Update EDITION item + update FESTIVAL_METADATA if it's the latest + validate band references
- **Festival Info Update**: Update FESTIVAL item + update FESTIVAL_METADATA
- **New Edition**: Create EDITION item + validate band references + update FESTIVAL_METADATA (add to editions list, update latest if needed) + update band festival counts

### 7. Capacity Planning

Estimated item sizes:

- FESTIVAL: ~1KB
- EDITION: ~10-50KB (depending on band count)
- FESTIVAL_METADATA: ~2KB

For 100 festivals with 3 editions each:

- Total items: ~400 items
- Storage: ~500KB - 5MB (very small)
- Read patterns: Mostly Query operations on GSI1
- Write patterns: Low frequency (updates when festival data changes)

## API Adaptations

### Current API

```text
GET /db.json - Returns all festivals
PUT /api/festivals/{key} - Updates festival
```

### Proposed API with DynamoDB

For complete API specifications, see:

- **[Public API Design](API_DESIGN.md)**: Public read-only endpoints (GET operations)
- **[Admin API Design](ADMIN_API_DESIGN.md)**: Admin endpoints (POST, PUT, DELETE operations) with Cognito + SAML authentication

#### Public API Endpoints (Read-Only)

```text
GET /api/festivals - Returns all festivals with latest editions
GET /api/festivals/upcoming - Returns upcoming festivals from current date
GET /api/festivals/{key} - Returns festival details with all editions
GET /api/festivals/{key}/editions - Returns all editions for a festival
GET /api/festivals/{key}/editions/{year} - Returns specific edition
```

#### Admin API Endpoints (Authentication Required)

```text
POST /api/admin/festivals - Creates new festival
PUT /api/admin/festivals/{key} - Updates festival general information
PUT /api/admin/festivals/{key}/editions/{year} - Updates or creates edition
DELETE /api/admin/festivals/{key}/editions/{year} - Deletes specific edition
```

See **[Admin API Design](ADMIN_API_DESIGN.md)** for authentication flow, permission models, and detailed specifications.

## Benefits of This Design

1. **Scalability**: Can handle unlimited festival editions without schema changes
2. **Performance**: GSI enables efficient date-based and location-based queries
3. **Flexibility**: Easy to add new attributes without affecting existing data
4. **Historical Data**: Preserves past editions while showing current/upcoming ones
5. **Single-Table Pattern**: Reduces complexity and costs with one table + GSIs (shared with bands)
6. **Efficient Queries**: Most common access patterns require single query operation
7. **Consistency**: Denormalized metadata ensures fast reads while maintaining consistency
8. **Data Integrity**: Strong referential integrity with band entities (see [Bands Data Model](DYNAMODB_BANDS_DATA_MODEL.md))

## Related Documentation

- **[Bands Data Model](DYNAMODB_BANDS_DATA_MODEL.md)**: Complete bands schema and referential integrity patterns
- **[Public API Design](API_DESIGN.md)**: Public read-only API specifications
- **[Admin API Design](ADMIN_API_DESIGN.md)**: Admin API with Cognito + SAML authentication

## Future Enhancements

1. **Streaming**: Use DynamoDB Streams to update search indexes (OpenSearch/Algolia)
2. **Caching**: Add ElastiCache/CloudFront for frequently accessed data
3. **Real-time Updates**: Use WebSockets/AppSync for live festival updates
4. **Analytics**: Track which festivals/editions are most viewed
5. **Geographic Queries**: Implement radius-based searches using coordinates
6. **Band Sync**: Automatic sync of band metadata when festival editions change
