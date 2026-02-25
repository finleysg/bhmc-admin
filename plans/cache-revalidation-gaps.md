# Cache Revalidation Gap Analysis

## Overview

Three layers of caching exist across the system with **zero coordination between them**. No write operation in Django, NestJS, or the admin dashboard triggers invalidation of any other layer's cache.

---

## Current Caching Layers

### 1. Django Backend — Redis `cache_page`

All caching is applied to ViewSet `list()` methods via `cache_page` decorators. No `cache.delete()` or `cache.clear()` calls exist anywhere in the Django backend. Stale data persists until TTL expires.

| Endpoint                       | TTL                  | File                             |
| ------------------------------ | -------------------- | -------------------------------- |
| `CourseViewSet.list()`         | 24 hours             | `backend/courses/views.py:14`    |
| `HoleViewSet.list()`           | 24 hours             | `backend/courses/views.py:24`    |
| `TeeViewSet.list()`            | 24 hours             | `backend/courses/views.py:40`    |
| `PolicyViewSet.list()`         | 4 hours              | `backend/policies/views.py:19`   |
| `PageContentViewSet.list()`    | 4 hours              | `backend/content/views.py:23`    |
| `PhotoViewSet.list()`          | 4 hours (file cache) | `backend/documents/views.py:71`  |
| `StaticDocumentViewSet.list()` | 2 hours              | `backend/documents/views.py:110` |
| `BoardMemberViewSet.list()`    | 4 hours              | `backend/core/views.py:44`       |
| `MajorChampionViewSet.list()`  | 4 hours              | `backend/core/views.py:68`       |
| `LowScoreViewSet.list()`       | 1 hour               | `backend/core/views.py:85`       |
| `AceViewSet.list()`            | 4 hours              | `backend/core/views.py:106`      |

No Django signal handlers are active — `post_delete.connect()` in `backend/documents/models.py:69` is commented out.

### 2. Next.js public-next — Fetch-level Caching

`fetchDjango()` in `apps/public-next/lib/fetchers.ts` defaults to **3600s** revalidation via `next: { revalidate }`. Authenticated fetches use `cache: "no-store"` (always fresh).

**Tag usage:** Only one tag exists — `"events"`. Used in 6 locations with 300s revalidation:

| Location                                        | Revalidate | Tag      |
| ----------------------------------------------- | ---------- | -------- |
| `app/page.tsx:50`                               | 300s       | `events` |
| `app/membership/page.tsx:14`                    | 3600s      | `events` |
| `lib/event-utils.ts:233`                        | 300s       | `events` |
| `app/calendar/[year]/[month]/page.tsx:25`       | 300s       | `events` |
| `app/match-play/page.tsx:11`                    | 300s       | `events` |
| `app/event/[eventDate]/[eventName]/page.tsx:28` | 300s       | `events` |

**Untagged fetches (time-based only):**

| Location                                     | Revalidate      | Data           |
| -------------------------------------------- | --------------- | -------------- |
| `app/champions/[season]/page.tsx:16`         | 3600s           | Champions      |
| `app/dam-cup/page.tsx:17`                    | 3600s           | Dam Cup scores |
| `app/points/page.tsx:15`                     | 3600s           | Season points  |
| `app/event/.../registrations/page.tsx:83,91` | 60s             | Registrations  |
| All other `fetchDjango()` calls              | 3600s (default) | Various        |

10 pages export `force-dynamic` — these are always server-rendered but still respect fetch-level `revalidate` for data.

### 3. Revalidation Endpoint

`apps/public-next/app/api/revalidate/route.ts`:

```typescript
export async function POST(request: NextRequest) {
	const { tag } = (await request.json()) as { tag: unknown }
	if (!tag || typeof tag !== "string") {
		return NextResponse.json({ error: "tag is required" }, { status: 400 })
	}
	revalidateTag(tag, "max")
	return NextResponse.json({ revalidated: true, tag })
}
```

- **Completely unauthenticated** — no shared secret, API key, or token validation
- **Nobody calls it** — no Django view, NestJS endpoint, or admin action triggers it

---

## Identified Gaps

### High Severity

| Gap                                              | Detail                                                                                                                                                                                                                                 |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Django never invalidates its own Redis cache** | Admin edits a board member, policy, page content, or course — the cached `list()` response stays stale for 1–24 hours. No `cache.delete()` exists after any write operation.                                                           |
| **NestJS API never triggers revalidation**       | Golf Genius sync (`apps/api/src/golfgenius/services/event-sync.service.ts`) imports scores, champions, low scores, and points via bulk DB writes. None of these trigger revalidation of the public-next cache or Django's Redis cache. |
| **Django admin never triggers revalidation**     | Django views handle CRUD for events, announcements, documents, policies, photos, scores. None call the public-next `/api/revalidate` endpoint or clear their own Redis cache.                                                          |
| **Revalidation endpoint has no auth**            | Anyone can POST to `/api/revalidate` and purge cache tags at will.                                                                                                                                                                     |

### Medium Severity

| Gap                                                      | Detail                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Only one Next.js cache tag exists**                    | Only `"events"` is tagged. Announcements, policies, page content, photos, documents, scores, champions, dam cup, points — none have tags, so they can't be selectively revalidated.                                                                                        |
| **Stripe webhooks don't trigger revalidation**           | Payment confirmation changes slot status (P→R) in `apps/api/src/registration/services/payments.service.ts:298,349`. The SSE broadcast notifies connected clients, but the Next.js server-side cache for registration data (`60s` TTL) is not invalidated.                  |
| **No coordination between NestJS SSE and Next.js cache** | `RegistrationBroadcastService` (`apps/api/src/registration/services/registration-broadcast.service.ts`) notifies connected SSE clients about registration changes, but doesn't invalidate the Next.js server-side cache. New visitors see stale data for up to 60 seconds. |

### Low Severity

| Gap                                                    | Detail                                                                                                                                                                                                                |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`force-dynamic` pages bypass page caching entirely** | Most pages export `force-dynamic`, meaning `fetch`-level `revalidate` still controls data freshness, but the page itself is always SSR'd. The Django Redis cache is the real bottleneck for staleness on these pages. |

---

## Data Flows with No Revalidation

| Trigger                                            | What Goes Stale                               | Max Staleness             |
| -------------------------------------------------- | --------------------------------------------- | ------------------------- |
| Admin edits event (Django)                         | Django Redis cache + Next.js `"events"` tag   | Django: 24h, Next.js: 5m  |
| Admin edits announcement/policy/content (Django)   | Django Redis cache + Next.js time-based cache | Django: 4h, Next.js: 1h   |
| Golf Genius sync imports scores/champions (NestJS) | Next.js cache for scores/champions pages      | 1h                        |
| Admin uploads document/photo (Django)              | Django file/Redis cache + Next.js cache       | Django: 2–4h, Next.js: 1h |
| Stripe payment completes (NestJS webhook)          | Next.js registration data                     | 60s                       |
| Admin updates player/board member (Django)         | Django Redis cache + Next.js cache            | Django: 4h, Next.js: 1h   |

---

## Recommendations

### 1. Secure the revalidation endpoint

Add a shared secret (environment variable) validated on every request:

```typescript
const REVALIDATION_SECRET = process.env.REVALIDATION_SECRET
if (request.headers.get("x-revalidation-secret") !== REVALIDATION_SECRET) {
	return NextResponse.json({ error: "unauthorized" }, { status: 401 })
}
```

### 2. Add cache tags to all data types

Expand `fetchDjango()` calls to use granular tags:

| Tag             | Pages                                                |
| --------------- | ---------------------------------------------------- |
| `events`        | Home, calendar, event detail, membership, match play |
| `announcements` | Home (current announcements)                         |
| `policies`      | Policies pages                                       |
| `page-content`  | About, contact, membership info                      |
| `champions`     | Champions page                                       |
| `dam-cup`       | Dam Cup page                                         |
| `points`        | Points page                                          |
| `photos`        | Photo gallery                                        |
| `documents`     | Documents listing                                    |
| `board`         | About page (board members)                           |
| `courses`       | Event detail (course info)                           |
| `registrations` | Event registrations                                  |

### 3. Trigger revalidation from NestJS after Golf Genius sync

After `EventSyncService` completes, call the revalidation endpoint for affected tags (`events`, `champions`, `points`, etc.).

### 4. Trigger revalidation from Django after admin writes

Options:

- **Django signals**: Add `post_save`/`post_delete` handlers to models that call the revalidation endpoint
- **DRF view hooks**: Override `perform_create`/`perform_update`/`perform_destroy` on ViewSets to clear Redis cache and call the revalidation endpoint
- **Django middleware**: Intercept write responses and trigger revalidation based on URL patterns

### 5. Clear Django Redis cache on writes

Add `cache.delete()` calls in ViewSet write methods or via signals. The cache key format for `cache_page` is based on the request URL, so targeted invalidation requires knowing the cached URL patterns.

### 6. Have SSE broadcast service also trigger Next.js revalidation

When `RegistrationBroadcastService.notifyChange()` fires, also call the revalidation endpoint with a `registrations` tag so new SSR requests get fresh data immediately.
