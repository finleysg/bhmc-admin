## Final Implementation Plan - Reusing Export Progress Tracker

### Phase 1: Generalize the Progress Tracker

**Step 1.1: Rename and refactor the tracker**

- Rename `export-progress-tracker.ts` → `progress-tracker.ts`
- Rename `export-progress-tracker.types.ts` → `progress-tracker.types.ts`
- Rename class: `ExportProgressTracker` → `ProgressTracker`

**Step 1.2: Generalize the types**

- Keep `ExportResult` and `ExportError` (used by roster export)
- Add `ImportResult` and `ImportError` for import operations
- Make the tracker generic to handle both export and import actions

```typescript
// progress-tracker.types.ts
export interface ExportResult {
	eventId: number
	totalPlayers: number
	created: number
	updated: number
	skipped: number
	errors: ExportError[]
}

export interface ExportError {
	slotId?: number
	playerId?: number
	email?: string
	error: string
}

export interface ImportResult {
	eventId: number
	actionName: string
	totalProcessed: number
	created: number
	updated: number
	skipped: number
	errors: ImportError[]
}

export interface ImportError {
	itemId?: string
	itemName?: string
	error: string
}

export type OperationResult = ExportResult | ImportResult
```

**Step 1.3: Update the tracker service**

- Keep all existing methods (they work perfectly for imports too)
- The tracker is already generic - it tracks `eventId` and emits `ProgressEventDto`
- No logic changes needed, just rename the class

**Step 1.4: Update all imports** Files to update:

- `apps/api/src/golfgenius/services/roster-export.service.ts`
- `apps/api/src/golfgenius/golfgenius.module.ts`
- Any other files importing the old names

### Phase 2: Add Streaming to Scores Import Service

**File:** `apps/api/src/golfgenius/services/scores-import.service.ts`

1. Inject `ProgressTracker`

2. Add streaming method: `importScoresForEventStream(eventId)`

3. Track progress:
   - Start tracking with total = estimated player count
   - Emit progress after each player processed
   - Complete with `ImportResult` containing totals

4. Keep existing `importScoresForEvent()` - can call stream and return final result

**Progress tracking points:**

```typescript
// Start
tracker.startTracking(eventId, total)

// Per round
tracker.emitProgress(eventId, processed, `Processing round ${currentRound} of ${totalRounds}`)

// Per player in pairing
tracker.emitProgress(eventId, ++processed)

// Complete
tracker.completeImport(eventId, result)
```

### Phase 3: Add Streaming to Results Import Service

**File:** `apps/api/src/golfgenius/services/results-import.service.ts`

Add 4 streaming methods:

1. `importPointsResultsStream(eventId): Observable<ProgressEventDto>`
2. `importSkinsResultsStream(eventId): Observable<ProgressEventDto>`
3. `importProxyResultsStream(eventId): Observable<ProgressEventDto>`
4. `importStrokePlayResultsStream(eventId): Observable<ProgressEventDto>`

**Shared logic:**

- Extract common streaming wrapper from format-specific processors
- Each format emits progress per tournament and per player result
- Complete with `ImportResult` containing aggregated totals

**Progress tracking points:**

```typescript
// Start
tracker.startTracking(eventId, estimatedTotal)

// Per tournament
tracker.emitProgress(eventId, processed, `Processing tournament ${currentTournament.name}`)

// Per result
tracker.emitProgress(eventId, ++processed)

// Complete
tracker.completeImport(eventId, result)
```

### Phase 4: Update Controller with SSE Endpoints

**File:** `apps/api/src/golfgenius/golfgenius.controller.ts`

Add 5 new SSE endpoints:

```typescript
@Sse("/events/:id/import-scores")
importEventScoresStream(@Param("id") id: string): Observable<{ data: string }>

@Sse("/events/:id/import-points")
importPointsResultsStream(@Param("id") id: string): Observable<{ data: string }>

@Sse("/events/:id/import-skins")
importSkinsResultsStream(@Param("id") id: string): Observable<{ data: string }>

@Sse("/events/:id/import-proxies")
importProxyResultsStream(@Param("id") id: string): Observable<{ data: string }>

@Sse("/events/:id/import-results")
importStrokePlayResultsStream(@Param("id") id: string): Observable<{ data: string }>
```

Each endpoint follows the same pattern as `exportRoster`:

- Check for existing stream
- Start new stream if none exists
- Map progress to SSE format

### Phase 5: Update Module Providers

**File:** `apps/api/src/golfgenius/golfgenius.module.ts`

Update provider registration:

- Change `ExportProgressTracker` → `ProgressTracker`

### Phase 6: Frontend Integration

**Files to update:**

1. `apps/web/lib/integration-actions.ts` - Add streaming URLs for imports
2. `apps/web/app/api/golfgenius/events/[id]/import-*/route.ts` - Create 5 SSE route handlers
3. `apps/web/app/golf-genius/components/integration-orchestrator.tsx` - Handle import progress

## Summary of Changes

### Files to Rename

- ✏️ `export-progress-tracker.ts` → `progress-tracker.ts`
- ✏️ `export-progress-tracker.types.ts` → `progress-tracker.types.ts`

### Files to Modify

- 📝 `progress-tracker.ts` - Rename class, no logic changes
- 📝 `progress-tracker.types.ts` - Add ImportResult/ImportError types
- 📝 `scores-import.service.ts` - Add streaming method
- 📝 `results-import.service.ts` - Add 4 streaming methods
- 📝 `golfgenius.controller.ts` - Add 5 SSE endpoints
- 📝 `golfgenius.module.ts` - Update provider name
- 📝 `roster-export.service.ts` - Update import statement

### Files to Create

- 🆕 Frontend SSE route handlers (5 files)

## Benefits

✅ **Maximum code reuse** - Leverages existing progress tracker ✅ **Minimal changes** - Just rename + add streaming methods ✅ **Consistent pattern** - All integrations work the same way ✅ **Type safe** - Shares ProgressEventDto across export and imports ✅ **Clean architecture** - Single responsibility maintained
