# Quartermaster — Practice Notes Feature

Test task submission by **Leed Almogbel** — adds a **Practice Notes** feature to the Quartermaster CFO platform, plus several bonus fixes to existing code.

**Jump to:**
[Setup](#setup) · [How to Test](#how-to-test-the-practice-notes-feature) · [Write-up](#write-up)

---

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS + shadcn/ui + TanStack Query v5 + wouter (hash routing)
- **Backend:** Express.js + Node.js
- **Database:** SQLite + Drizzle ORM (synchronous via `better-sqlite3`)
- **Build:** Vite

---

## Setup

```bash
# From the project root
npm install
npm run dev
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

**Login:** `admin@quartermaster.com` / `admin123`

> Note: The app uses hash routing — URLs look like `http://localhost:5000/#/notes`.

---

## How to Test the Practice Notes Feature

### 1. Navigate to Practice Notes

- Click **Practice Notes** in the sidebar (sticky-note icon, below Action Items)
- You should land on the Practice Notes page

### 2. Add a note

- Enter your name or email in the **Your Name or Email** field (optional)
- Type a note in the textarea — e.g. `Dr. Chen prefers email contact. Renewal due June 2026.`
- Click **Save Note**
- A toast appears confirming the save
- The note appears immediately in the "All Notes" list below with creator and timestamp

### 3. Verify persistence

- **Refresh the page (F5)** — the note should still be there (it's stored in SQLite)
- Switch to a different practice in the sidebar selector — you should see that practice's notes (each practice has its own notes)
- Switch back — your note is still there

### 4. Verify validation

- Try clicking **Save Note** with an empty textarea — the button is disabled
- Try typing only spaces — the button stays disabled (client-side check)
- Server also rejects empty/whitespace-only notes with a 400

### 5. Verify ordering

- Add a second note — it appears at the top of the list (newest first)

---

## How to Test the Bonus Fixes

### Hash routing fix

The sidebar `Link` components were previously outside the hash Router context, so navigating to any page except Dashboard was broken. Test it:

- Click **Dashboard** → URL becomes `.../#/`
- Click **Perfect P&L** → URL becomes `.../#/ppl`, page renders
- Click **Action Items** → URL becomes `.../#/actions`, page renders
- Click **Practice Notes** → URL becomes `.../#/notes`, page renders
- Click **All Clients** → URL becomes `.../#/admin`, page renders

All sidebar links should now work, not just Dashboard.

### Input validation

Open DevTools → Network tab, or use curl:

```bash
# Invalid practice ID → 400, not silent empty response
curl http://localhost:5000/api/practices/abc/notes
# → { "error": "Invalid practice ID" }

# Empty note → 400
curl -X POST http://localhost:5000/api/practices/1/notes \
  -H "Content-Type: application/json" \
  -d '{"noteText": ""}'
# → { "error": "noteText is required" }

# Invalid action status → 400
curl -X PATCH http://localhost:5000/api/actions/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "foo"}'
# → { "error": "Invalid status. Must be: open, in_progress, or completed" }
```

### Consistent HTTP wrapper

All pages (`dashboard`, `action-items`, `perfect-pnl`, `forecasting`, `cfo-script`, `practice-notes`) now use `apiRequest()` from `@/lib/queryClient` instead of raw `fetch()`. Errors are handled consistently.

---

## Files Changed

### Core feature
- `shared/schema.ts` — added `practiceNotes` table + insert schema + types
- `server/storage.ts` — added `CREATE TABLE`, `getPracticeNotes`, `createPracticeNote`
- `server/routes.ts` — added `GET` and `POST /api/practices/:id/notes`
- `client/src/pages/practice-notes.tsx` — new page
- `client/src/App.tsx` — added `/notes` route + Router fix
- `client/src/components/app-sidebar.tsx` — added nav item

### Bonus fixes
- `client/src/pages/dashboard.tsx` — replaced 5 raw `fetch()` calls with `apiRequest`
- `client/src/pages/action-items.tsx` — replaced raw `fetch()`
- `client/src/pages/perfect-pnl.tsx` — replaced 2 raw `fetch()` calls
- `client/src/pages/forecasting.tsx` — replaced raw `fetch()`
- `client/src/pages/cfo-script.tsx` — replaced raw `fetch()`
- `server/routes.ts` — added `parseId()` helper, status enum validation, noteText validation

---

## API Reference — Practice Notes

### `GET /api/practices/:id/notes`
Returns all notes for a practice, newest first.

**Response:**
```json
[
  {
    "id": 1,
    "practiceId": 1,
    "noteText": "Dr. Chen prefers email contact.",
    "createdBy": "advisor@quartermastertax.com",
    "createdAt": "2026-04-14T10:30:00.000Z"
  }
]
```

### `POST /api/practices/:id/notes`
Creates a new note. Server sets `createdAt`.

**Request body:**
```json
{
  "noteText": "Dr. Chen prefers email contact.",
  "createdBy": "advisor@quartermastertax.com"
}
```

**Response:** the created `PracticeNote` object.

---

## Write-up

### 1. What did you build?

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

### 2. What decisions did you make and why?

- **Server-side `createdAt`** — I set the ISO timestamp in the route handler rather than trusting the client clock. Client clocks drift, can be spoofed, and may be in the wrong timezone. The server is the single source of truth.
- **No pagination** — Matches the existing pattern (`action-items.tsx` loads all items at once). Adding pagination would have been inconsistent with the rest of the app; I noted it as a future improvement instead.
- **`createdBy` as free-text input** — The task spec describes it as "advisor name or email". Pulling from an auth context would have been cleaner, but the app's auth middleware isn't actually applied to any data endpoints yet, so there's no authenticated user to pull from. I went with the spec.
- **queryKey structure `["/api/practices", practiceId, "notes"]`** — Matches the pattern used elsewhere in the codebase and works with the default `queryFn` in `queryClient.ts`, which joins the key parts into a URL. It also scopes the cache by `practiceId` so switching practices in the sidebar correctly refetches.
- **Validation: reject empty/whitespace-only notes** — Added server-side validation on the POST endpoint, plus the client disables the Save button when the textarea is empty. Defense in depth.
- **Trim `noteText` before saving** — Prevents leading/trailing whitespace from corrupting the stored value.

### 3. Did you notice anything in the existing code you'd want to fix?

Yes — I fixed several of these as bonus work:

**Fixed in this submission:**

1. **Sidebar navigation was broken for all pages** — The `<Router hook={useHashLocation}>` in `App.tsx` only wrapped the `<Switch>` inside `<main>`. The sidebar's `<Link>` components were outside that Router context, so clicking any nav item navigated the browser path (`/notes`) instead of the hash (`#/notes`) — meaning routes never matched. Moved the Router up to wrap both the sidebar and the routes. This fixes navigation for **every** page, not just Practice Notes.

2. **Raw `fetch()` inconsistency** — The instructions said to always use `apiRequest`, but five existing pages (`dashboard.tsx`, `action-items.tsx`, `perfect-pnl.tsx`, `forecasting.tsx`, `cfo-script.tsx`) used raw `fetch()` inside their `queryFn`. This skips the centralized error handling in `throwIfResNotOk()`. Replaced all of them.

3. **PATCH `/api/actions/:id` accepted any string as status** — The body was passed through without validation and cast with `as any` in storage. Added an enum check for `open`, `in_progress`, `completed`.

4. **`parseInt(req.params.id)` returned NaN silently** — Every data endpoint called `parseInt` without checking the result. Passing `/api/practices/abc/reports` would silently return empty data. Added a `parseId()` helper that returns `null` for invalid input and made every endpoint return 400 with a clear error.

5. **No validation on new POST endpoint** — Added a check for empty/whitespace-only `noteText` with a 400 response.

**TODO:**

- No error states on most pages — only `isLoading` is handled, not `isError`.
