# SocietyDesk - Architecture & Plan

## Architecture
- **Frontend**: React + Vite + Tailwind CSS. Hosted on localhost for development.
- **Backend**: Node.js + Express.js.
- **Database**: SQLite (using `better-sqlite3` or similar for synchronous, easy querying).
- **AI**: Gemini API via `@google/genai` SDK.

## Data Model

**1. `complaints`**
- `id` (PK, string/uuid)
- `flat_number` (string)
- `name` (string)
- `phone` (string, nullable)
- `description` (text)
- `photo_url` (string, nullable)
- `status` (New, Assigned, In Progress, Resolved)
- `created_at` (timestamp)
- `issue_id` (FK to issues.id, nullable)
- `category` (Water, Lift, Parking, Noise, Cleaning, Security, Other)
- `urgency` (Critical, High, Medium, Low)
- `summary` (string)
- `language_detected` (en, hi, hinglish)
- `embedding` (blob/text - JSON array of floats)

**2. `issues`**
- `id` (PK, string/uuid)
- `category` (string)
- `urgency` (string - highest of clustered)
- `status` (New, Assigned, In Progress, Resolved)
- `assignee` (string, nullable)
- `internal_notes` (text, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**3. `replies`**
- `id` (PK, string/uuid)
- `complaint_id` (FK to complaints.id)
- `issue_id` (FK to issues.id)
- `message` (text)
- `sent_at` (timestamp)

**4. `members` (Committee)**
- `id` (PK)
- `name` (string)

## API Routes
- `POST /api/complaints` - Submit a new complaint (triggers Gemini tagging & clustering).
- `GET /api/complaints/:id` - Resident views their complaint status.
- `GET /api/issues` - Committee dashboard view (filters, sorting).
- `GET /api/issues/:id` - Issue details (including all grouped complaints).
- `PATCH /api/issues/:id` - Update status, assignee, internal notes.
- `POST /api/issues/:id/draft-reply` - Generate AI reply for an issue.
- `POST /api/issues/:id/send-reply` - Send reply to all complaints in the issue.

## AI Integration (Gemini)

**1. Tagging (Structured Output)**
- Model: `gemini-2.5-flash`
- Prompt: Analyze the complaint (mixed English/Hindi/Hinglish). Extract category, urgency, 15-word summary, and detected language.
- Rules: Critical = safety risk/total loss of essential service. High = essential service degraded. Medium = inconvenience. Low = cosmetic.

**2. Clustering (Embeddings + Similarity)**
- Model: `text-embedding-004`
- Flow: 
  1. Generate embedding for the new complaint's text.
  2. Fetch open issues/complaints of the *same category* within the last *48 hours*.
  3. Calculate cosine similarity.
  4. If similarity > threshold (e.g., 0.85), group into existing Issue. Otherwise, create a new Issue.
  5. Update Issue urgency if count increases or if new complaint has higher urgency.

**3. Reply Drafting**
- Model: `gemini-2.5-flash`
- Prompt: Write a short, polite reply to the resident in the language they used (`language_detected`). Consider the issue category, current status, and internal notes.

## Execution Order
1. Setup Node backend + SQLite.
2. Implement Gemini API wrappers.
3. Build Seed Script with 40-60 complaints.
4. Run seed script, verify tagging and clustering.
5. Setup React frontend.
6. Build Resident form & Status page.
7. Build Committee Dashboard.
8. Wire up Reply system.
9. End-to-End Test.
