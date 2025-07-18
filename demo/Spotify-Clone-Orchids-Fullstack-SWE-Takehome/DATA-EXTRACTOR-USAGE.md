# 🎵 Component Data Extractor - Usage Guide

The ComponentDataExtractor is a powerful utility that automatically extracts data arrays from React components and transforms them for database population.

## 📋 Implementation Status

✅ **Phase 1: Component Data Extractor** - COMPLETED
- Automatically extracts data arrays from React components
- Matches user queries to appropriate data arrays
- Transforms data for database insertion
- Supports schema inference and validation

✅ **Phase 2: Enhanced Database Agent Integration** - COMPLETED
- Seamlessly integrates ComponentDataExtractor with DatabaseAgent
- Automatically populates tables with realistic data from React components
- Generates idempotent SQL with embedded component data
- Smart query analysis with automatic data population detection
- **Focus**: Database and API layer only (component updates moved to separate phase)
- **Preserved**: Existing React components remain unchanged

## 🚀 Features

### 1. **Automatic Data Array Detection**
Detects and extracts the following arrays from `spotify-main-content.tsx`:
- `recentlyPlayed` (6 records)
- `madeForYou` (6 records)
- `popularAlbums` (8 records)

### 2. **Query Pattern Matching**
Smart query analysis to match user intents:
- "recently played" → `recentlyPlayed` array
- "made for you" → `madeForYou` array
- "popular albums" → `popularAlbums` array

### 3. **Database Schema Transformation**
Automatically transforms React data to database-ready format:
- Adds database-specific fields (`id`, `created_at`, `updated_at`)
- Maps React properties to database columns
- Handles different data types and structures

## 🔧 Usage Examples

### Basic Usage

```typescript
import { ComponentDataExtractor } from './utils/component-data-extractor';

const extractor = new ComponentDataExtractor();

// Extract all data arrays
const arrays = await extractor.extractDataArrays('src/components/spotify-main-content.tsx');
console.log(`Found ${arrays.length} data arrays`);

// Match query to data array
const matchedArray = await extractor.matchQueryToDataArray('recently played songs');
if (matchedArray) {
  console.log(`Matched: ${matchedArray.name} with ${matchedArray.totalRecords} records`);
}

// Transform for database
const transformedData = await extractor.transformDataForDatabase(matchedArray, 'recently_played');
console.log(`Transformed ${transformedData.length} records for database`);
```

### Query Matching Examples

```typescript
// These queries will match to data arrays:
const queries = [
  'Can you store the recently played songs in a table',           // → recentlyPlayed
  'Create a table for Made for you playlists',                   // → madeForYou
  'Store the popular albums in the database',                    // → popularAlbums
  'Add recently played functionality',                           // → recentlyPlayed
  'Show me the recommendations',                                 // → madeForYou
];

for (const query of queries) {
  const array = await extractor.matchQueryToDataArray(query);
  if (array) {
    console.log(`"${query}" → ${array.name} (${array.totalRecords} records)`);
  }
}
```

### Data Transformation Examples

#### Recently Played Transformation
```typescript
// Input (from React component):
{
  id: "1",
  title: "Liked Songs",
  artist: "320 songs",
  album: "Your Music",
  image: "https://example.com/image.png",
  duration: 180
}

// Output (database ready):
{
  id: "1",
  track_id: "1",
      title: "Liked Songs",
    artist: "320 songs",
    album: "Your Music",
    image: "https://example.com/image.png",
  duration: 180,
  played_at: "2023-07-17T22:32:58.783Z",
  created_at: "2023-07-17T22:32:58.783Z",
  updated_at: "2023-07-17T22:32:58.783Z"
}
```

#### Made For You Transformation
```typescript
// Input (from React component):
{
  id: "7",
  title: "Discover Weekly",
  artist: "Your weekly mixtape of fresh music",
  album: "Weekly Discovery",
  image: "https://example.com/image.png",
  duration: 210
}

// Output (database ready):
{
  id: "7",
  playlist_id: "7",
  title: "Discover Weekly",
  description: "Your weekly mixtape of fresh music",
  image: "https://example.com/image.png",
  playlist_type: "made_for_you",
  duration: 210,
  created_at: "2023-07-17T22:32:58.783Z",
  updated_at: "2023-07-17T22:32:58.783Z"
}
```

#### Popular Albums Transformation
```typescript
// Input (from React component):
{
  id: "13",
  title: "Midnights",
  artist: "Taylor Swift",
  album: "Midnights",
  image: "https://example.com/image.png",
  duration: 275
}

// Output (database ready):
{
  id: "13",
  album_id: "13",
  title: "Midnights",
  artist: "Taylor Swift",
  image: "https://example.com/image.png",
  duration: 275,
  popularity_score: 95, // Auto-generated realistic score
  created_at: "2023-07-17T22:32:58.783Z",
  updated_at: "2023-07-17T22:32:58.783Z"
}
```

## 🧪 Testing

### Run the Test Suite
```bash
npm run db-agent:test-extractor
```

### Expected Test Results
```
🧪 Testing Component Data Extractor

Test 1: Extract All Data Arrays
✅ Found recentlyPlayed: 6 records
   Schema: id, title, artist, album, image, duration
   Sample: Liked Songs
✅ Found madeForYou: 6 records  
   Schema: id, title, artist, album, image, duration
   Sample: Discover Weekly
✅ Found popularAlbums: 8 records
   Schema: id, title, artist, album, image, duration
   Sample: Midnights

Test 2: Query Matching
Query: "Can you store the recently played songs in a table"
  ✅ Matched: recentlyPlayed (6 records)
Query: "Create a table for Made for you playlists"
  ✅ Matched: madeForYou (6 records)
Query: "Store the popular albums in the database"
  ✅ Matched: popularAlbums (8 records)
Query: "Add a search functionality"
  ❌ No match found

Test 3: Data Transformation
✅ Transformed 6 records for recently_played table
Sample transformed record:
  id: 1
  track_id: 1
  title: Liked Songs
artist: 320 songs
album: Your Music
image: https://example.com/image.png
  duration: 180
  played_at: 2023-07-17T22:32:58.783Z
  created_at: 2023-07-17T22:32:58.783Z
  updated_at: 2023-07-17T22:32:58.783Z

Test 4: Data Summary
🎵 Data Arrays Summary for src/components/spotify-main-content.tsx:

📊 recentlyPlayed:
  - Records: 6
  - Fields: id, title, artist, album, image, duration
  - Sample: Liked Songs

📊 madeForYou:
  - Records: 6
  - Fields: id, title, artist, album, image, duration
  - Sample: Discover Weekly

📊 popularAlbums:
  - Records: 8
  - Fields: id, title, artist, album, image, duration
  - Sample: Midnights

🎉 All tests passed!
```

## 📊 Data Arrays Summary

### Available Data Arrays
| Array Name | Records | Source | Schema |
|------------|---------|---------|--------|
| `recentlyPlayed` | 6 | `spotify-main-content.tsx` | id, title, artist, album, image, duration |
| `madeForYou` | 6 | `spotify-main-content.tsx` | id, title, artist, album, image, duration |
| `popularAlbums` | 8 | `spotify-main-content.tsx` | id, title, artist, album, image, duration |

### Sample Data Preview

#### Recently Played (6 records)
1. Liked Songs (320 songs)
2. Discover Weekly (Spotify)
3. Release Radar (Spotify)
4. Daily Mix 1 (Spotify)
5. Chill Hits (Spotify)
6. Top 50 - Global (Spotify)

#### Made For You (6 records)
1. Discover Weekly (Your weekly mixtape of fresh music)
2. Release Radar (Catch all the latest music from artists you follow)
3. Daily Mix 1 (Billie Eilish, Lorde, Clairo and more)
4. Daily Mix 2 (Arctic Monkeys, The Strokes, Tame Impala and more)
5. Daily Mix 3 (Taylor Swift, Olivia Rodrigo, Gracie Abrams and more)
6. On Repeat (The songs you can't get enough of)

#### Popular Albums (8 records)
1. Midnights (Taylor Swift)
2. Harry's House (Harry Styles)
3. Un Verano Sin Ti (Bad Bunny)
4. Renaissance (Beyoncé)
5. SOUR (Olivia Rodrigo)
6. Folklore (Taylor Swift)
7. Fine Line (Harry Styles)
8. After Hours (The Weeknd)

## 🔮 Next Steps: Phase 2

## 🧪 Testing

### Test the Component Data Extractor (Phase 1)
```bash
npm run db-agent:test-extractor
```

This will:
1. Extract all data arrays from `spotify-main-content.tsx`
2. Test query matching with sample queries
3. Transform data for database insertion
4. Show expected results and performance metrics

### Test the Enhanced Database Agent Integration (Phase 2)
```bash
npm run db-agent:test-phase2
```

This comprehensive test will:
1. **Component Data Extraction** - Test data array extraction from React components
2. **Query Matching** - Test smart query analysis and data array matching
3. **Data Transformation** - Test data transformation for database insertion
4. **Project Analysis** - Test project context analysis
5. **Enhanced Database Agent** - Test full database agent with automatic data population
6. **SQL Generation** - Test enhanced SQL generation with component data
7. **Validation** - Test idempotency validation
8. **Performance Metrics** - Test performance across multiple operations

## 🎉 Phase 2 Benefits

### Automatic Data Population
- **Zero Manual Work**: No need to manually create seed data
- **Realistic Data**: Uses actual data from your React components
- **Consistent Schema**: Automatically transforms data to match database schema
- **Idempotent Operations**: Safe to run multiple times without duplicates

### Smart Query Processing
- **Intent Recognition**: Automatically detects what data you want to store
- **Component Matching**: Finds the right data array for your query
- **Schema Inference**: Generates appropriate database schema from component data
- **Performance Optimized**: Efficient data extraction and transformation

### Enhanced Developer Experience
- **One Command**: `npm run db-agent:interactive` handles database and API layer
- **Immediate Results**: Tables populated with realistic data instantly
- **Visual Feedback**: Clear logging of what data is being populated
- **Error Handling**: Graceful handling of data transformation issues
- **Component Safety**: Existing React components remain unchanged
- **Focused Workflow**: Clean separation between database/API and component layers

## 🤝 Contributing

To extend the ComponentDataExtractor:

1. Add new data arrays to the `extractArrayFromContent` method
2. Update the `matchQueryToDataArray` method with new query patterns
3. Add transformation logic in `transformDataForDatabase`
4. Update the test suite with new test cases

## 📄 API Reference

### ComponentDataExtractor Class

#### Methods
- `extractDataArrays(componentPath: string): Promise<DataArray[]>`
- `matchQueryToDataArray(query: string): Promise<DataArray | null>`
- `transformDataForDatabase(dataArray: DataArray, tableName: string): Promise<any[]>`
- `getAvailableDataArrays(componentPath: string): Promise<string[]>`
- `getDataArrayInfo(arrayName: string, componentPath: string): Promise<DataArray | null>`
- `generateDataSummary(componentPath: string): Promise<string>`

#### Interfaces
- `DataArray` - Represents an extracted data array
- `ExtractedData` - Represents processed data ready for database insertion 