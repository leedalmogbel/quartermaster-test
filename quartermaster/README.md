# Quartermaster — Practice Notes Feature

Test task submission by **Leed Almogbel** — adds a **Practice Notes** feature to the Quartermaster CFO platform, plus several bonus fixes to existing code.

See [`WRITEUP.md`](./WRITEUP.md) for a full description of decisions, trade-offs, and improvements.

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
