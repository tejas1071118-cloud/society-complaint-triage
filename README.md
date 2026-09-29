# Society Complaint Triage
> Built for **Vibe Coding Event 2026 — Day 1 (29th)**
> **Problem Statement #2:** Society Complaint Triage
> **Target Persona:** Housing Society Committee Volunteers (~100 flats)

## Problem & Solution
**How might we help housing society volunteers quickly categorize and prioritize daily resident complaints (which are often vague, multi-lingual, and duplicate) so that emergencies and SLA breaches are addressed immediately?**

### Constraint Addressed
Volunteers in a typical Indian housing society (~100 flats) have only a few minutes a day to review complaints. They receive everything from life-threatening elevator malfunctions to minor cosmetic requests. Most complaints come in a mix of English and Hindi (Hinglish), and when a common issue occurs (e.g., "no water"), multiple residents file duplicate complaints, clogging the system.

### Our Solution
SocietyDesk is an AI-powered triage system that instantly processes incoming complaints, merges duplicates, and ranks them by urgency.
- **Resident App**: A frictionless mobile-first form supporting photo/video uploads and voice-to-text dictation.
- **Smart Triage Dashboard**: A Kanban-style view that automatically bubbles up "Critical" and "Overdue" issues so volunteers know exactly what to do first.
- **AI Auto-Tagging**: Gemini evaluates each issue and sets Categories (Water, Lift, Parking, etc.), Urgency Levels (Critical, High, Medium, Low), and extracts a one-line summary.
- **Smart Clustering**: Merges duplicate complaints from multiple residents into a single actionable "Issue".
- **Intelligent Ranking**: Priority scores (0-100) are assigned based on safety risk, service impact, resident vulnerability, and duplicate volume.
- **Automated Communication**: The AI drafts contextual replies in the resident's language (English or Hinglish) for one-click approval.
- **Daily Digest**: A 1-click generated 120-word summary of the day's events.



## Core AI Architecture

*   **Model / Service**: Uses `gemini-3.8-flash` via the `@google/genai` Node SDK for complaint processing and response generation. Also utilizes rule-based NLP fallbacks (Jaccard token similarity) for local duplicate clustering.
*   **Workflow**:
    1. Resident submits a complaint (with text, voice, and media).
    2. Backend receives it and queues a single Gemini call.
    3. Gemini returns a structured JSON assessing: category, urgency, safety score (0-10), service impact (0-10), vulnerable residents flag, and a 15-word summary.
    4. Local matching checks for existing open issues with the same category and high semantic overlap. If found, it attaches the new complaint to the existing issue.
    5. A priority score is calculated: `(safety * 40%) + (impact * 30%) + (vulnerable_bonus * 10%) + (time_scaling * 10%) + (duplicate_multiplier * 10%)`.
    6. The dashboard ranks issues by score and automatically escalates those that breach SLA.
    7. Committee members click "Resolve", where the AI drafts a response (in the resident's language) for review and one-click dispatch.
*   **Error Handling**:
    *   **Unclear Input / Mixed Language**: Gemini seamlessly parses Hinglish, Hindi, and English.
    *   **API Failures (429 Rate Limits)**: Incorporates exponential backoff and retries.
    *   **Invalid JSON**: Employs tolerant parsing (extracting the JSON from markdown blocks and stripping bad characters).
    *   **Missing API Key**: Fully functional offline fallback! If no API key is provided, the system gracefully degrades to a fast Regex and Rule-Based engine to tag and rank urgency.
    *   **Human Override**: Volunteers can manually override AI priorities using the side-drawer.

## Prerequisites & Installation

Prerequisites:
- Node.js (>=20.0.0)
- Git

```bash
git clone https://github.com/tejas1071118-cloud/society-complaint-triage.git && cd society-complaint-triage
npm install
# Add API_KEY to .env.local
npm run dev
```

Open http://localhost:3000 in your browser.

**Notes for Judges:**
*   **Environment Variables**: Create a `.env.local` file at the root. You can copy the template by running `cp .env.local.example .env.local`. Set `API_KEY=your_key_here`. 
*   **Getting a Key**: Free Gemini API keys are available at [Google AI Studio](https://aistudio.google.com/).
*   **Offline Mode**: The app works flawlessly WITHOUT an API key using our built-in rule-based fallback mode.
*   **Demo Login**: Use password **admin123** to access the Committee Dashboard.
*   **Demo Data**: 35 realistic Hinglish complaints (including duplicates) are auto-seeded on the first run. To reset the DB, run `npm run reset-db`.

## Participant Info

Name: [Tejas Sawant]
College ID: [E250186]
Day: Day 1 (29th)
