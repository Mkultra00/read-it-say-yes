# Voice of Love — Complete Design Document

> **Purpose:** This document fully describes the Voice of Love application — architecture, data models, APIs, UI components, styling, and business logic — so it can be cloned onto any platform.

---

## 1. Product Overview

**Voice of Love** is an AI-powered storytelling companion designed for dementia and elderly care. Caregivers enter a patient's personal context (name, family members, city, cherished memories), and the app generates personalized, comforting stories that are narrated aloud using realistic AI voices.

### Use Case
A caregiver fills in details about their loved one — "Margaret, husband Tom, daughter Sarah, grandson Jake, Portland Oregon, loved baking apple pies, had a garden with roses." The AI generates warm stories woven with these real details, then narrates them in a soothing voice. The patient hears familiar names, places, and memories, providing comfort and cognitive stimulation.

### Key Features
1. **Patient Profile Management** — Store patient context (name, family, city, memories)
2. **AI Story Generation** — Generate 5 personalized stories at once from patient context
3. **Story CRUD** — Create, read, update, delete stories manually
4. **Voice Narration** — AI enhances stories into gentle narration, then speaks them via TTS
5. **Infinite Mode** — Continuously generates and narrates new stories in a loop
6. **Multi-language Support** — English, Mandarin, Spanish (Mexico), Hindi
7. **Voice Selection** — 8 ElevenLabs voices (4 female, 4 male)

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui components |
| State Management | Zustand (voice settings), TanStack React Query (server state) |
| Routing | React Router v6 |
| Backend | Supabase (PostgreSQL database + Edge Functions) |
| AI Story Generation | Google Gemini 2.5 Flash (via OpenAI-compatible API) |
| AI Narration Enhancement | Google Gemini 2.5 Flash |
| Text-to-Speech | ElevenLabs API (`eleven_multilingual_v2` model) |
| Notifications | Sonner (toast notifications) |

---

## 3. Database Schema

### Table: `patient_profiles`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `patient_name` | text | No | — |
| `family_members` | text | No | `''` |
| `city` | text | No | `''` |
| `memories` | text | No | `''` |
| `created_at` | timestamptz | No | `now()` |
| `updated_at` | timestamptz | No | `now()` |

**RLS:** All operations (SELECT, INSERT, UPDATE, DELETE) allowed for public. No authentication required.

**Notes:** Only one profile is used at a time (queried with `ORDER BY created_at DESC LIMIT 1`).

### Table: `stories`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `title` | text | No | — |
| `content` | text | No | — |
| `category` | text | Yes | `null` |
| `loop_enabled` | boolean | No | `false` |
| `schedule_time` | text | Yes | `null` |
| `created_at` | timestamptz | No | `now()` |
| `updated_at` | timestamptz | No | `now()` |

**RLS:** All operations allowed for public.

### Database Function

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
```

---

## 4. API / Edge Functions

All edge functions disable JWT verification (public access). All include CORS headers allowing `*` origin.

### 4.1 `generate-stories`

**Purpose:** Generate 5 personalized stories from patient context.

**Input (JSON body):**
```json
{
  "patientName": "Margaret",
  "familyMembers": "husband Tom, daughter Sarah",
  "city": "Portland, Oregon",
  "memories": "loved baking apple pies, had a garden with roses"
}
```

**AI Model:** `google/gemini-2.5-flash`

**System Prompt:**
```
You are a creative writer for Voice of Love, a memory care application.
You generate warm, comforting, and vivid stories for patients with memory conditions.

Given patient context, generate exactly 5 unique stories.

Each story should:
- Be 150-250 words
- Reference the patient's real memories, family, and places naturally
- Be warm, sensory-rich, and calming
- Cover different themes: childhood, family gatherings, nature, daily routines, celebrations
- Use the patient's name and family members' names naturally
- Include familiar places and objects
- Be written in third person
```

**AI Tool Call:** Uses function calling with a `save_stories` tool that enforces the schema:
```json
{
  "stories": [{
    "title": "string",
    "content": "string (150-250 words)",
    "category": "childhood | family | nature | daily life | celebrations"
  }]
}
```

**Output:**
```json
{
  "stories": [
    { "title": "...", "content": "...", "category": "..." },
    ...
  ]
}
```

### 4.2 `generate-single-story`

**Purpose:** Generate one unique story for infinite mode.

**Input:**
```json
{
  "patientName": "Margaret",
  "familyMembers": "husband Tom",
  "city": "Portland",
  "memories": "roses, apple pies",
  "language": "english",
  "previousTitles": ["Story A", "Story B"]
}
```

**Themes (randomly selected):**
- a warm childhood memory
- a family gathering or celebration
- a peaceful moment in nature
- a comforting daily routine
- a special holiday or birthday
- a walk through a familiar neighborhood
- cooking or sharing a favorite meal
- a moment with a beloved pet
- a rainy day spent indoors with loved ones
- a trip to a favorite place

**Key Prompt Rules:**
- Write entirely in the selected language
- Address patient by name using second person ("you")
- Use patient's name at least 3 times naturally
- Reference their real family, places, and memories
- Be warm, sensory-rich, calming, and vivid
- Avoids previously used titles/themes
- Returns JSON with `title` and `content` fields

**Output:**
```json
{
  "story": { "title": "...", "content": "..." }
}
```

### 4.3 `generate-token` (Narration Enhancement)

**Purpose:** Rewrite a story as a gentle, soothing narration suitable for TTS.

**Input:**
```json
{
  "storyContent": "Once upon a time...",
  "language": "english",
  "patientName": "Margaret"
}
```

**System Prompt:**
```
You are a warm, caring voice narrator for a memory care application.
Rewrite the following story as a gentle, soothing narration spoken directly to the patient.
- Write entirely in [language]
- Address patient by name frequently (3-4 times)
- Use second person ("you")
- Add natural pauses indicated by "..."
- Keep sentences short and calming
- Add sensory details (sounds, smells, warmth)
- Make the listener feel safe and comforted
- Keep roughly the same length as the original
```

**Output:**
```json
{
  "narration": "Remember, Margaret... the smell of warm apple pie..."
}
```

### 4.4 `elevenlabs-tts`

**Purpose:** Convert text to speech audio using ElevenLabs.

**Input:**
```json
{
  "text": "Remember, Margaret...",
  "voiceId": "EXAVITQu4vr4xnSDxMaL"
}
```

**ElevenLabs Configuration:**
- **Endpoint:** `https://api.elevenlabs.io/v1/text-to-speech/{voiceId}?output_format=mp3_44100_128`
- **Model:** `eleven_multilingual_v2`
- **Voice Settings:**
  - `stability`: 0.6
  - `similarity_boost`: 0.75
  - `style`: 0.4
  - `use_speaker_boost`: true
  - `speed`: 0.7 (slower for elderly listeners)

**Output:** Raw `audio/mpeg` binary data.

---

## 5. Required Secrets / Environment Variables

| Secret | Purpose |
|--------|---------|
| `GEMINI_API_KEY` | Google Gemini API access (alternative to gateway) |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS API |
| `LOVABLE_API_KEY` | AI gateway access (OpenAI-compatible proxy to Gemini) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key |

**Frontend env vars (Vite):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

---

## 6. Voice & Language Configuration

### Available Voices (ElevenLabs IDs)

| Name | ID | Description |
|------|----|-------------|
| Sarah | `EXAVITQu4vr4xnSDxMaL` | Warm & gentle female |
| Laura | `FGY2WhTYpPnrIDTdsKH5` | Calm & soothing female |
| Lily | `pFZP5JQG7iQjIQuC4Bku` | Soft & caring female |
| Matilda | `XrExE9yKIg1WjnnlVkGX` | Friendly & warm female |
| George | `JBFqnCBsd6RMkjVDRZzb` | Deep & reassuring male |
| Roger | `CwhRBWXzGAHq8TQ4Fs17` | Warm & steady male |
| Daniel | `onwK4e9ZLuTAKqWW03F9` | Gentle & composed male |
| Brian | `nPczCjzI2devNBz1zQrb` | Kind & comforting male |

**Default voice:** Sarah

### Supported Languages

| ID | Name | Flag |
|----|------|------|
| `english` | English | 🇺🇸 |
| `mandarin` | 中文 (Mandarin) | 🇨🇳 |
| `spanish-mx` | Español (México) | 🇲🇽 |
| `hindi` | हिन्दी (Hindi) | 🇮🇳 |

**Persistence:** Voice and language selections stored in `localStorage` under keys `neurovoice-selected-voice` and `neurovoice-selected-language`. Managed via Zustand store.

---

## 7. Application Routes & Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home (Index) | Hero banner, patient profile form, voice/language settings, recent stories |
| `/stories` | Stories | Full story CRUD with create/edit forms |
| `/voice` | Voice Session | Narration player with test/story/infinite modes |
| `*` | 404 Not Found | Fallback page |

---

## 8. Component Architecture

```
App
├── AppShell (layout wrapper)
│   ├── Header (panda mascot, animated emojis, gradient title)
│   ├── <main> (page content)
│   └── BottomNav (Home | Stories | Voice)
│
├── Pages
│   ├── Index
│   │   ├── Hero Card (welcome message + nav buttons)
│   │   ├── PatientContextForm (profile + AI story generation)
│   │   ├── VoiceSettings (language + voice selection)
│   │   └── Recent Stories (top 3 StoryCards)
│   │
│   ├── Stories
│   │   ├── StoryForm (create/edit form)
│   │   └── StoryCard[] (list of stories)
│   │
│   └── Voice
│       ├── Animated Orb (status indicator)
│       ├── Mode Selector (Test | Story | Infinite switches)
│       ├── Story Selector (dropdown, story mode only)
│       ├── Play/Stop Controls
│       └── Transcript Card
│
├── Hooks
│   ├── useStories (CRUD via React Query + Supabase)
│   ├── usePatientProfile (read/upsert via React Query + Supabase)
│   └── useVoiceStore (Zustand store for voice/language prefs)
│
└── UI Components (shadcn/ui)
    └── Button, Card, Input, Textarea, Select, Switch, Label,
        RadioGroup, Badge, Toast, etc.
```

---

## 9. Visual Design System

### Brand Identity
- **Name:** Voice of Love
- **Mascot:** Large panda making a heart symbol (centered in header, `h-96 w-96`)
- **Header Animation:** Floating hearts (❤️💕💗💖) and musical notes (🎵🎶♪♫) with CSS `float` keyframe animation

### Color Palette (HSL)

**Light Mode:**

| Token | HSL | Hex Approx | Usage |
|-------|-----|------------|-------|
| `--background` | `30 50% 97%` | #FFF8F0 (Cream) | Page background |
| `--foreground` | `187 60% 15%` | Dark teal | Body text |
| `--primary` | `187 60% 26%` | #1A5F6B (Deep Teal) | Buttons, links, accents |
| `--primary-foreground` | `30 50% 97%` | Cream | Text on primary |
| `--secondary` / `--accent` | `38 88% 58%` | #F4A535 (Warm Amber) | Secondary buttons, highlights |
| `--card` | `30 40% 95%` | Warm off-white | Card backgrounds |
| `--muted` | `30 20% 90%` | Light warm gray | Muted backgrounds |
| `--muted-foreground` | `187 20% 40%` | Medium teal-gray | Secondary text |
| `--border` | `30 20% 85%` | Warm border gray | Borders |
| `--destructive` | `0 84% 60%` | Red | Delete actions |
| `--success` | `160 60% 40%` | Green | Success states |
| `--radius` | `0.75rem` | — | Border radius |

**Dark Mode:**

| Token | HSL |
|-------|-----|
| `--background` | `187 60% 8%` |
| `--foreground` | `30 40% 92%` |
| `--primary` | `38 88% 58%` (Amber becomes primary) |
| `--primary-foreground` | `187 60% 10%` |
| `--card` | `187 50% 12%` |
| `--muted` | `187 30% 16%` |
| `--border` | `187 30% 18%` |

### Typography

| Usage | Font | Import |
|-------|------|--------|
| Headings (h1-h6) | DM Serif Display | Google Fonts |
| Body / UI | DM Sans | Google Fonts |

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
```

### Animations

**Float animation** (for header emojis):
```css
@keyframes float {
  0%   { transform: translateY(0) scale(1);      opacity: 0;   }
  10%  {                                           opacity: 0.8; }
  50%  { transform: translateY(-180px) scale(1.2); opacity: 0.6; }
  100% { transform: translateY(-350px) scale(0.8); opacity: 0;   }
}
```
Duration: 2.5–3.8s per item, infinite loop. 10 floating items with staggered delays.

### Layout
- **Max width:** `max-w-lg` (32rem / 512px) — mobile-first single-column layout
- **Bottom padding:** `pb-20` to account for fixed bottom nav
- **Header:** Sticky, `backdrop-blur-lg`, `bg-background/80`
- **Bottom nav:** Fixed, `backdrop-blur-lg`, `bg-card/80`

---

## 10. Detailed Page Behaviors

### 10.1 Home Page (`/`)

1. **Hero Card:** Teal background (`bg-primary`), serif heading "Welcome to Voice of Love", two buttons: "Manage Stories" → `/stories`, "Voice Session" → `/voice`

2. **PatientContextForm:**
   - Loads existing profile from DB on mount (most recent one)
   - Fields: Patient Name (required), Family Members, City/Place, Important Memories & Objects (textarea)
   - "Generate 5 Stories" button:
     1. Saves/updates the patient profile in DB
     2. Calls `generate-stories` edge function
     3. Saves each returned story to the `stories` table
     4. Shows toast with count: "5 stories created for Margaret!"

3. **VoiceSettings:**
   - Language selector: 2×2 grid of radio buttons with flag emojis
   - Voice selector: 2×2 grid of radio buttons with name + description
   - Selections persist to localStorage via Zustand

4. **Recent Stories:** Shows top 3 stories (newest first). Each StoryCard has Edit (→ `/stories`), Delete, and Play (→ `/voice`) actions.

### 10.2 Stories Page (`/stories`)

- Story list with full CRUD
- "New Story" button shows inline StoryForm
- StoryForm fields: Title, Content (textarea), Category (optional), Loop Narration (switch), Schedule Time (time input, optional)
- Edit replaces create form inline
- Delete removes from DB with toast confirmation

### 10.3 Voice Page (`/voice`)

**Three modes (mutually exclusive, selected via Switch toggles):**

1. **Test Mode:** Uses a hardcoded test story (~80 words about an old woman named Rose). Good for testing voice/narration pipeline.

2. **Story Mode:** Select a saved story from dropdown. Narrates that specific story.

3. **Infinite Mode:** Requires patient profile. Continuously:
   - Generates a new story via `generate-single-story`
   - Enhances it via `generate-token` (narration)
   - Speaks it via `elevenlabs-tts`
   - When audio ends, generates the next story
   - Tracks story count and avoids repeating themes (sends last 5 titles)
   - On error: waits 3s then retries

**Narration Pipeline (all modes):**
1. Story text → `generate-token` (Gemini rewrites as gentle narration) → enhanced narration text
2. Enhanced text → `elevenlabs-tts` → audio blob
3. Audio blob → `new Audio(URL.createObjectURL(blob))` → play

**Status States:** `idle` | `generating` | `playing` | `error`

**Visual Indicator:** 132×132px circle with:
- Idle: Mic icon
- Generating: spinning Loader2
- Playing: Volume2 icon (or Infinity icon in infinite mode) with pulsing ring
- Error: returns to idle with error toast

**Transcript:** Shows the enhanced narration text in a Card below controls.

---

## 11. Test Story (Hardcoded)

```
Once upon a time, in a cozy little house by the sea, there lived a kind old woman named Rose. Every morning she would walk along the shore, collecting smooth stones and listening to the waves. The seagulls knew her well and would circle above, calling out their greetings. One day, she found a beautiful shell that sang a gentle melody when held to her ear. She carried it home and placed it on her windowsill, where it hummed softly through the night, filling her dreams with warmth and peace.
```

---

## 12. State Management Summary

| State | Storage | Mechanism |
|-------|---------|-----------|
| Stories list | Supabase `stories` table | React Query (`queryKey: ["stories"]`) |
| Patient profile | Supabase `patient_profiles` table | React Query (`queryKey: ["patient-profile"]`) |
| Selected voice | localStorage `neurovoice-selected-voice` | Zustand |
| Selected language | localStorage `neurovoice-selected-language` | Zustand |
| Voice session state | Component local state | `useState` (status, transcript, mode, storyCount) |
| Infinite mode control | Component ref | `useRef` (infiniteActiveRef) |
| Audio element | Component ref | `useRef` (audioRef) |

---

## 13. NPM Dependencies

### Core
- `react` ^18.3.1, `react-dom` ^18.3.1
- `react-router-dom` ^6.30.1
- `typescript`, `vite`

### UI
- `tailwindcss`, `tailwindcss-animate`
- `@radix-ui/*` (full suite — dialog, select, switch, radio-group, etc.)
- `class-variance-authority`, `clsx`, `tailwind-merge`
- `lucide-react` ^0.462.0 (icons)
- `sonner` ^1.7.4 (toasts)
- `vaul` (drawer)
- `cmdk` (command palette)
- `embla-carousel-react` (carousel)
- `recharts` (charts — unused currently)

### State & Data
- `@tanstack/react-query` ^5.83.0
- `zustand` ^5.0.11
- `@supabase/supabase-js` ^2.98.0

### Forms
- `react-hook-form` ^7.61.1
- `@hookform/resolvers` ^3.10.0
- `zod` ^3.25.76

---

## 14. File Structure

```
src/
├── assets/
│   └── panda-avatar.png          # Panda mascot image
├── components/
│   ├── AppShell.tsx               # Layout wrapper with header + bottom nav
│   ├── BottomNav.tsx              # Fixed bottom tab bar
│   ├── NavLink.tsx                # React Router NavLink wrapper
│   ├── PatientContextForm.tsx     # Patient profile + story generation
│   ├── StoryCard.tsx              # Story list item card
│   ├── StoryForm.tsx              # Create/edit story form
│   ├── VoiceSettings.tsx          # Voice + language selection
│   └── ui/                        # shadcn/ui component library
├── hooks/
│   ├── useStories.ts              # Stories CRUD hook
│   ├── usePatientProfile.ts       # Patient profile hook
│   ├── useVoiceStore.ts           # Zustand voice/language store
│   ├── use-mobile.tsx             # Mobile detection
│   └── use-toast.ts               # Toast hook
├── integrations/supabase/
│   ├── client.ts                  # Auto-generated Supabase client
│   └── types.ts                   # Auto-generated DB types
├── lib/
│   └── utils.ts                   # cn() utility (clsx + tailwind-merge)
├── pages/
│   ├── Index.tsx                  # Home page
│   ├── Stories.tsx                # Stories CRUD page
│   ├── Voice.tsx                  # Voice narration session page
│   └── NotFound.tsx               # 404 page
├── App.tsx                        # Router + providers
├── main.tsx                       # Entry point
└── index.css                      # Tailwind + design tokens

supabase/functions/
├── generate-stories/index.ts      # Batch story generation (5 stories)
├── generate-single-story/index.ts # Single story generation (infinite mode)
├── generate-token/index.ts        # Narration enhancement via Gemini
└── elevenlabs-tts/index.ts        # Text-to-speech via ElevenLabs

public/
├── images/app-screenshot.png      # App screenshot
├── favicon.ico
└── robots.txt
```

---

## 15. Cloning Checklist

To recreate this app on another platform:

1. **Set up database** with `patient_profiles` and `stories` tables (schema in §3)
2. **Create 4 serverless functions** matching the edge function logic (§4)
3. **Get API keys:**
   - Google Gemini API key (or use any OpenAI-compatible API for `gemini-2.5-flash`)
   - ElevenLabs API key
4. **Set up frontend** with React + Vite + Tailwind + shadcn/ui
5. **Import fonts:** DM Serif Display + DM Sans from Google Fonts
6. **Apply color tokens** from §9 in your CSS
7. **Create the panda mascot** image asset (384×384px, panda making heart symbol)
8. **Implement the 3-step narration pipeline:** Story → Gemini enhancement → ElevenLabs TTS → Audio playback
9. **Wire up state management:** React Query for DB, Zustand for preferences, localStorage for persistence
10. **Test the full flow:** Profile → Generate Stories → Voice Session → Infinite Mode
