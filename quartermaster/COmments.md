# Quartermaster Test Task — comments

## 1. What did you build?

A **Practice Notes** feature that lets advisors record free-text notes about a practice (e.g. "Dr. Chen prefers email contact. Renewal due June 2026.").

**Task A — Database Schema**
- Added a `practice_notes` table to `shared/schema.ts` with fields: `id`, `practice_id`, `note_text`, `created_by`, `created_at`
- Added a `CREATE TABLE IF NOT EXISTS` bootstrap in `server/storage.ts` so the table is created on first run
- Exported `insertPracticeNoteSchema`, `PracticeNote`, and `InsertPracticeNote` types

**Task B — Backend API**
- Added `getPracticeNotes(practiceId)` — returns notes newest first via `orderBy(desc(createdAt))`
- Added `createPracticeNote(data)` — synchronous Drizzle, `.returning().get()`
- Added `GET /api/practices/:id/notes` and `POST /api/practices/:id/notes` endpoints
- Server sets the `createdAt` timestamp (not the client) for data integrity

**Task C — Frontend Page**
- Created `client/src/pages/practice-notes.tsx`
- Textarea for the note, optional name/email input, Save Note button
- Notes list showing text (with line-break preservation), creator, and a formatted timestamp
- Uses `apiRequest` for all HTTP calls, TanStack Query v5 object syntax, `useMutation` with cache invalidation and toast feedback
- Loading skeletons, empty state, disabled-button state while saving

**Task D — Wiring**
- Added the `/notes` route in `App.tsx`
- Added "Practice Notes" to the sidebar with the `StickyNote` icon from lucide-react

## 2. What decisions did you make and why?

- **Server-side `createdAt`** — I set the ISO timestamp in the route handler rather than trusting the client clock. Client clocks drift, can be spoofed, and may be in the wrong timezone. The server is the single source of truth.
- **No pagination** — Matches the existing pattern (`action-items.tsx` loads all items at once). Adding pagination would have been inconsistent with the rest of the app; I noted it as a future improvement instead.
- **`createdBy` as free-text input** — The task spec describes it as "advisor name or email". Pulling from an auth context would have been cleaner, but the app's auth middleware isn't actually applied to any data endpoints yet, so there's no authenticated user to pull from. I went with the spec.
- **queryKey structure `["/api/practices", practiceId, "notes"]`** — Matches the pattern used elsewhere in the codebase and works with the default `queryFn` in `queryClient.ts`, which joins the key parts into a URL. It also scopes the cache by `practiceId` so switching practices in the sidebar correctly refetches.
- **Validation: reject empty/whitespace-only notes** — Added server-side validation on the POST endpoint, plus the client disables the Save button when the textarea is empty. Defense in depth.
- **Trim `noteText` before saving** — Prevents leading/trailing whitespace from corrupting the stored value.

## 3. Did you notice anything in the existing code you'd want to fix?

Yes — I fixed several of these as bonus work:

**Fixed in this submission:**

1. **Sidebar navigation was broken for all pages** — The `<Router hook={useHashLocation}>` in `App.tsx` only wrapped the `<Switch>` inside `<main>`. The sidebar's `<Link>` components were outside that Router context.

2. **Raw `fetch()` inconsistency** — The instructions said to always use `apiRequest`, but five existing pages (`dashboard.tsx`, `action-items.tsx`, `perfect-pnl.tsx`, `forecasting.tsx`, `cfo-script.tsx`) used raw `fetch()` inside their `queryFn`. This skips the centralized error handling in `throwIfResNotOk()`. Replaced all of them.

3. **PATCH `/api/actions/:id` accepted any string as status** — The body was passed through without validation and cast with `as any` in storage. Added an enum check for `open`, `in_progress`, `completed`.

4. **`parseInt(req.params.id)` returned NaN silently** — Every data endpoint called `parseInt` without checking the result. Passing `/api/practices/abc/reports` would silently return empty data. Added a `parseId()` helper that returns `null` for invalid input and made every endpoint return 400 with a clear error.

5. **No validation on new POST endpoint** — Added a check for empty/whitespace-only `noteText` with a 400 response.

**TODO:**
- No error states on most pages — only `isLoading` is handled, not `isError`.
