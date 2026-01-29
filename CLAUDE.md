# Second Brain - AI Agent Spec

## Project Overview

This is a personal "second brain" system accessed via SMS. The user texts a Telnyx phone number, and an AI agent processes the message, categorizes it, stores it appropriately, and makes it retrievable via a web dashboard.

### Overarching Goals
1. **Boost productivity** - Capture thoughts instantly without friction
2. **Increase efficiency** - Auto-categorize and organize without manual effort
3. **Improve ease of life** - Surface information when needed, reduce cognitive load

### Interaction Model
- **Input**: SMS to Telnyx phone number (natural language, no special syntax)
- **Processing**: AI agent classifies intent, extracts metadata, routes to appropriate database
- **Output**: Web dashboard for browsing, searching, editing, deleting

---

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   User (SMS)    │────▶│  Telnyx Webhook │────▶│   AI Classifier │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                                    ┌────────────────────┴────────────────────┐
                                    ▼                                         ▼
                           ┌─────────────────┐                       ┌─────────────────┐
                           │  Notes Database │                       │ Rolodex Database│
                           └─────────────────┘                       └─────────────────┘
                                    │                                         │
                                    └────────────────────┬────────────────────┘
                                                         ▼
                                                ┌─────────────────┐
                                                │   Web Dashboard │
                                                └─────────────────┘
```

### Tech Stack
- **Framework**: Next.js (App Router)
- **Database**: Supabase (PostgreSQL)
- **AI**: Claude API for classification and extraction
- **SMS**: Telnyx API (inbound webhook + outbound for Build 3)
- **Hosting**: Vercel (all-in-one)
- **Cron (Build 3)**: Vercel Cron or external trigger (Trigger.dev / GitHub Actions) if execution time exceeds Vercel limits

---

## Build 1: Personal Note Capture

### Purpose
Capture fleeting thoughts, reminders, recommendations, and ideas via text message. Store them in a searchable, categorized database accessible through a dashboard.

### User Flow
1. User texts Telnyx number: "Watch Oppenheimer - heard it's amazing"
2. Agent receives message, classifies as **note**
3. Agent auto-categorizes: `movie`
4. Agent extracts metadata: title = "Oppenheimer", context = "heard it's amazing"
5. Stores in Notes database with timestamp
6. User views/searches/edits via dashboard

### Classification Logic
A message is a **note** if it does NOT match the person/Rolodex pattern (see Build 2).

Notes should be auto-categorized into types such as:
- `movie` - Films to watch
- `book` - Books to read
- `idea` - Random thoughts, concepts
- `task` - Things to do (non-time-specific)
- `plan` - Future intentions, commitments
- `recommendation` - Restaurants, products, etc.
- `quote` - Something someone said
- `other` - Fallback category

The AI should infer the category from context. No user input required.

### Data Model: Notes

```
notes
├── id (uuid, primary key)
├── content (text) - Original message
├── category (text) - Auto-assigned category
├── extracted_title (text, nullable) - e.g., "Oppenheimer"
├── extracted_context (text, nullable) - Additional details
├── created_at (timestamp)
├── updated_at (timestamp)
```

### Dashboard Requirements (Notes)
- **View**: List of all notes, most recent first
- **Search**: Full-text search across content, title, context
- **Filter**: By category
- **Edit**: Inline or modal editing of any note
- **Delete**: Delete with confirmation

---

## Build 2: Personal Rolodex / Name Directory

### Purpose
Remember names of people you meet by storing them with descriptive context. Retrieve names by searching descriptions ("who sits next to me in macro?").

### User Flow
1. User texts: "Sarah - sits next to me in macroeconomics, blonde hair, from Chicago"
2. Agent detects **person entry** pattern (Name + description)
3. Stores in Rolodex database
4. Later, user searches dashboard: "macroeconomics" → returns "Sarah"

### Classification Logic
A message is a **person entry** if it matches the pattern:
- Starts with a name (capitalized word or two)
- Followed by a separator (dash, colon, comma, or "is" / "from" / "works at")
- Followed by descriptive context

Examples that ARE person entries:
- "Sarah - macro class, blonde"
- "John: met at the conference, works at Google"
- "Mike from the gym, tall guy, lifts heavy"

Examples that are NOT person entries:
- "Watch Oppenheimer"
- "Remember to call mom"
- "Great idea for the app"

### Appending Behavior
If user texts about an existing person:
- "Sarah - also in my study group now"
- Agent recognizes "Sarah" exists in Rolodex
- Appends new info to her description (does not overwrite)
- Updates `updated_at` timestamp

### Duplicate Handling
If user texts a name that already exists but context seems unrelated:
- Agent sends SMS back: "I already have a Sarah (macro class, blonde, Chicago). Is this the same person or someone new?"
- User responds "same" → append
- User responds "new" or provides differentiator → create new entry

### Data Model: Rolodex

```
rolodex
├── id (uuid, primary key)
├── name (text) - Person's name
├── description (text) - Accumulated context about them
├── tags (text[], nullable) - e.g., ["classmate", "copenhagen"]
├── created_at (timestamp)
├── updated_at (timestamp)
```

### Dashboard Requirements (Rolodex)
- **View**: List of all people, sorted by recency (most recently added/updated first)
- **Search**: Search by name OR by description content
- **Edit**: Modify name or description
- **Delete**: Delete with confirmation
- Separate section/tab from Notes

---

## AI Classification Prompt

When a message comes in, use this logic:

```
You are a classification agent for a personal second brain system.

Given an incoming SMS message, determine:
1. Is this a PERSON entry (for Rolodex) or a general NOTE?
2. If NOTE: what category? (movie, book, idea, task, plan, recommendation, quote, other)
3. Extract any relevant metadata (title, name, context)

PERSON entry pattern:
- Starts with a name (1-3 capitalized words)
- Followed by descriptive context about who they are, where you met them, identifying details
- Examples: "Sarah - macro class", "John from the conference, works at Google"

NOTE pattern:
- Everything else: reminders, recommendations, ideas, things to watch/read/do

Respond in JSON:
{
  "type": "person" | "note",
  "category": "movie" | "book" | "idea" | "task" | "plan" | "recommendation" | "quote" | "other" | null,
  "name": "extracted name if person" | null,
  "title": "extracted title if applicable" | null,
  "description": "extracted context/description",
  "original_content": "full original message"
}
```

---

## API Endpoints

### Telnyx Webhook
- `POST /api/webhook/telnyx` - Receives incoming SMS, triggers classification and storage

### Notes
- `GET /api/notes` - List all notes (with optional search/filter query params)
- `GET /api/notes/:id` - Get single note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

### Rolodex
- `GET /api/rolodex` - List all people (sorted by recency)
- `GET /api/rolodex/:id` - Get single person
- `GET /api/rolodex/search?q=` - Search by name or description
- `PUT /api/rolodex/:id` - Update person
- `DELETE /api/rolodex/:id` - Delete person

### SMS Response (for duplicate handling)
- `POST /api/webhook/telnyx` should also handle user responses to clarification questions
- Need to track conversation state (expecting response about duplicate)

---

## Out of Scope (Future Builds)

*Build 3 is specced below but should not be built until Builds 1 and 2 are complete and working.*

---

## Build 3: Daily Podcast Digest (FUTURE)

### Purpose
Stay on top of 10+ tech/investing/venture podcasts without listening to all of them. Get a daily synthesized briefing with structured insights.

### Context
All podcasts focus on: tech, investing, venture capital, private markets, overall tech sentiment and opinions.

### User Flow
1. System fetches transcripts for configured podcast list daily
2. AI processes and extracts insights across defined dimensions
3. Cron job triggers at ~11 AM (after morning podcasts are released)
4. User receives SMS: "Your podcast digest is ready"
5. User views full digest on dashboard

### Insight Dimensions

For each daily digest, extract and synthesize:

**1. Topic of the Day**
- What is everyone talking about?
- Common themes across multiple podcasts

**2. Unique Takes**
- What's a view that only one or a few podcasters are expressing?
- Differentiated perspectives worth noting

**3. Top 3-5 Developments**
- Biggest news, updates, or events of the day
- What actually happened vs. what's just commentary

**4. Strongest Opinions & Narratives**
- What are people pushing hard on?
- Emerging or dominant narratives in the space

**5. People & Power**
- Which founders, CEOs, investors were discussed?
- Notable quotes or takes attributed to specific people

**6. Contrarian Radar**
- Where do podcasters disagree with each other?
- What's being called overrated or underrated?
- Counter-consensus views

**7. Forward-Looking**
- Predictions made
- Events, launches, or announcements people are watching for
- What's coming next

**8. Actionable Intel**
- Books, articles, papers, threads recommended
- Companies or funds to research further
- Specific data points or metrics cited

**9. Vibe Check**
- Overall sentiment: optimistic, cautious, bearish, uncertain?
- Is there fear or greed in the air?
- General mood of the tech/venture ecosystem

### Data Model: Podcast Digest

```
digests
├── id (uuid, primary key)
├── date (date) - The day this digest covers
├── topic_of_day (text)
├── unique_takes (text)
├── top_developments (text) - 3-5 bullet points
├── strong_opinions (text)
├── people_power (text)
├── contrarian_radar (text)
├── forward_looking (text)
├── actionable_intel (text)
├── vibe_check (text)
├── podcasts_included (text[]) - List of podcast names processed
├── created_at (timestamp)
```

### Data Model: Podcasts (Config)

```
podcasts
├── id (uuid, primary key)
├── name (text) - e.g., "All-In Podcast"
├── feed_url (text) - RSS feed or API endpoint
├── active (boolean) - Whether to include in daily digest
├── created_at (timestamp)
```

### Dashboard Requirements (Digest)
- Separate page: `/digest`
- Today's digest prominently displayed
- Historical digests browsable by date
- Each dimension as its own section/card
- Same terminal aesthetic as Notes and Rolodex pages

### Technical Components
- Transcript fetching (API TBD—explore: Podchaser, Listen Notes, Transistor, or RSS + Whisper)
- Cron job (11 AM daily, timezone-aware)
- Claude API for synthesis across all dimensions
- Outbound SMS via Telnyx

### Podcast List (Configured)

Using **Podscan API** for transcript fetching.

| Podcast | Podscan ID |
|---------|------------|
| Dwarkesh | pd_6kewm9dweb3ja847 |
| Cheeky Pint | pd_qazg9yo3yv35r6w4 |
| Lex Fridman | pd_4evzb9qlg2ej873g |
| Training Data | pd_xk67jgp633rjm8lr |
| Conversations with Tyler | pd_n3ymxjx6nkpjb8v6 |
| In Good Company | pd_ndbka52pa7mj2gez |
| Invest Like the Best | pd_dpmk29nmper5ev8n |
| BG Squared | pd_dpmk29nnxba9ev8n |
| Call Me Back | pd_exk67jgpzwbjm8lr |
| No Priors | pd_k2a645prlkvjqpln |
| a16z | pd_k2a645pmq2q5qpln |
| 20VC | pd_mqazg9y3rn5r6w48 |
| Uncapped | pd_3ymxjxoer3vjb8v6 |
| David Senra | pd_gokljvxpky4937ma |

### Transcript API

- **Provider**: Podscan (https://podscan.fm)
- **Auth**: API key required
- **Endpoint**: Fetch transcripts by podcast ID
- **Add to env**: `PODSCAN_API_KEY=`

---

## Revised Out of Scope

Build 3 is fully specced but **do not build until Builds 1 and 2 are complete**. It requires additional infrastructure (cron jobs, transcript APIs, outbound SMS) that should not complicate the initial build.

---

## Dashboard UI Guidelines

### Overall Aesthetic
- **Terminal/code-inspired** look and feel
- Dark, minimal, functional

### Page Structure
- Each build gets its own page (e.g., `/notes`, `/rolodex`, `/digest` later)
- Consistent styling across all pages
- Navigation between pages (sidebar or top nav)

### Colors
- **Background**: Pure black (`#000000`) or near-black (`#0a0a0a`)
- **Text**: White (`#ffffff`) or off-white (`#e0e0e0`)
- **Boxes/Cards**: Transparent with visible borders, slight color tint
  - Use translucent accent colors: `rgba(color, 0.1)` for fills, `rgba(color, 0.4)` for borders
- **Accent colors** (for categories, highlights, buttons):
  - Cyan/teal: `#00ffff` or `#14b8a6`
  - Green: `#22c55e`
  - Purple: `#a855f7`
  - Orange: `#f97316`
  - Pink: `#ec4899`
  - Use these to differentiate note categories and add visual interest

### Typography
- **Font**: Monospace / code font throughout
  - Primary: `JetBrains Mono`, `Fira Code`, or `IBM Plex Mono`
  - Fallback: `Consolas`, `Monaco`, `monospace`
- **Hierarchy**: Use font weight and size, not font family changes
- Text should feel like reading a terminal but remain highly legible

### Components
- **Cards/Boxes**:
  - Slightly rounded corners (`border-radius: 6px` or `8px`)
  - Transparent background with subtle accent color tint
  - Thin border in accent color (1px, semi-transparent)
  - Example: `background: rgba(20, 184, 166, 0.08); border: 1px solid rgba(20, 184, 166, 0.3);`
- **Buttons**:
  - Accent color background (solid or semi-transparent)
  - White text
  - Slight hover glow effect
- **Search bar**:
  - Dark input field with accent border on focus
  - Placeholder text in muted gray
- **Category tags**:
  - Small pills with accent colors
  - Each category gets a consistent color

### Responsiveness
- Mobile-friendly (user may check on phone)
- Cards stack vertically on mobile
- Search bar always accessible at top

---

## Environment Variables Required

```
TELNYX_API_KEY=
TELNYX_PHONE_NUMBER=
ANTHROPIC_API_KEY=
DATABASE_URL=
PODSCAN_API_KEY=
```

---

## Development Priorities

1. Set up Telnyx webhook endpoint (receive SMS)
2. Implement AI classification logic
3. Set up database schema (Notes + Rolodex tables)
4. Build storage logic with routing
5. Build basic dashboard with list views
6. Add search functionality
7. Add edit/delete functionality
8. Implement Rolodex duplicate detection + SMS response flow
9. Polish UI

---

## Success Criteria

- User can text any thought and it gets correctly categorized and stored
- User can find any note or person via dashboard search within 5 seconds
- System correctly distinguishes between notes and people entries >95% of the time
- Duplicate name detection works and conversation flow handles it gracefully
