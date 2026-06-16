# TriageWorkflow — Crisis Triage System

An AI-powered triage workflow for emergency volunteer command centers, built with **LangGraph** and **Claude**.  
The system receives incident reports, classifies them in real time, routes them to the right handler, and logs everything automatically to Google Sheets.

---

## How It Works

Every incident goes through a multi-step graph:

```
Input → preprocess → classify (Claude AI) → router
                                              ├─ auto_dispatch  ──────────────────────→ END
                                              └─ request_info (human interrupt)
                                                   ├─ escalate  → Google Sheets → END
                                                   └─ manual    → Google Sheets → END
```

1. **Preprocess** — Cleans and normalizes the raw text, collapses extra whitespace and punctuation, and extracts Israeli phone numbers automatically.
2. **Classify** — Sends the text to Claude, which returns structured output: incident category, urgency level, any missing information, a short summary, and the caller's name if mentioned.
3. **Route** — Decides what happens next based on the classification:
   - Urgency is `critical` → escalate to a human commander
   - Missing address or phone → escalate to a human commander
   - Everything looks complete → auto-dispatch a volunteer
4. **Human approval** — When escalation is triggered, the graph pauses using LangGraph's `interrupt()` and prompts the duty officer via the CLI. If approved, the incident is logged to Google Sheets as escalated. If rejected, it goes to the manual handling log instead.

---

## AI Classification

Claude returns a structured Zod-validated response for every incident:

- **category** — `logistics` / `medical` / `rescue` / `unknown`
- **urgency** — `low` / `medium` / `critical`
- **missing_info** — which fields are absent: `address`, `phone`, or empty if complete
- **summary** — a one-sentence English summary of the incident
- **user_name** — the caller's name if explicitly mentioned, otherwise `null`

---

## Google Sheets Integration

Every incident that reaches a resolution is automatically logged to Google Sheets with the columns:  
**Name | Phone | Summary | Escalated**

Requires a `credentials.json` service account file with access to the Google Sheets API.

---

## Logging

Every run produces color-coded structured logs in the terminal, organized by level:  
`STEP` · `INFO` · `WARN` · `ERR` · `STRM` · `⏸ INTERRUPT`

Logs are also saved to a daily file at `logs/triage-YYYY-MM-DD.log`, with ANSI codes stripped.

---

## Screenshots

**Google Sheets — automatic incident logging:**  
![Google Sheets](screenshots/google_sheets.png)

**Terminal — escalation to human commander (rejected → manual logbook):**  
![Terminal escalate](screenshots/terminal-escalate.png)

**Terminal — auto-dispatch flow:**  
![Terminal dispatch](screenshots/terminal-dispatch.png)

---

## Test Coverage — 100%

The project is fully tested with **Vitest**, covering all nodes, routing logic, Zod schemas, and the logger:

![Coverage](screenshots/coverage.png)

---

## Setup

```bash
npm install
cp .env.example .env
```

Add your credentials to `.env`:
```
ANTHROPIC_API_KEY=your_key_here
MODEL_NAME=claude-sonnet-4-6   # optional, this is the default
```

Place your Google service account file as `credentials.json` in the project root.

---

## Run

```bash
npm run dev
```

Choose from the interactive menu:
1. Run built-in sample incidents
2. Enter a custom incident
3. Both

---

## Test

```bash
npm test                   # run all tests
npm test -- --coverage     # with full coverage report
```
