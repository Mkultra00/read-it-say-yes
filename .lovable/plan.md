

## NeuroVoice — Gemini Live API Voice Agent Plan

### Overview

Build a simplified NeuroVoice app where users define stories/topics, and a voice agent (powered by Gemini Live API) narrates them in real-time conversation. No authentication. No user audio recording. Simple story management stored in Lovable Cloud database.

### Architecture

```text
┌─────────────────────────────────────────────┐
│  Browser (React)                            │
│                                             │
│  Stories CRUD ←→ Supabase DB (via REST)     │
│                                             │
│  Voice Session:                             │
│   1. Request ephemeral token from edge fn   │
│   2. Connect WebSocket to Gemini Live API   │
│   3. Receive audio stream, play via Web     │
│      Audio API                              │
│   4. Loop/schedule based on user settings   │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌──────────────────────────┐
│  Edge Function:          │
│  generate-token          │
│  - Uses GEMINI_API_KEY   │
│  - Returns ephemeral     │
│    token with locked     │
│    config (system prompt │
│    includes stories)     │
└──────────────────────────┘
```

### Key Requirement: GEMINI_API_KEY

The Lovable AI Gateway does **not** support the Gemini Live WebSocket protocol — it only handles chat completions. We need a direct Google Gemini API key stored as a Lovable Cloud secret. I will walk you through obtaining one from [Google AI Studio](https://aistudio.google.com/apikey) before implementation.

### What Gets Built

**1. Database (Lovable Cloud)**
- `stories` table: id, title, content (the story/topic text), category (optional), loop_enabled, schedule_time, created_at

**2. Edge Function: `generate-token`**
- Accepts story content + voice config
- Uses `@google/genai` SDK (npm) to create an ephemeral token with locked config:
  - Model: `gemini-2.5-flash-native-audio-preview-12-2025`
  - System instruction: narrate the provided story naturally, in a warm caregiving voice
  - Response modality: AUDIO
- Returns the ephemeral token to the client

**3. Frontend Pages**

- **Home / Dashboard**: List of stories with status, quick-start voice session button
- **Story Manager**: Add/edit/delete stories (title + content textarea), toggle loop, set optional schedule time
- **Voice Session Page**: 
  - Connects to Gemini Live API via WebSocket using ephemeral token
  - Plays audio response through Web Audio API (speaker output)
  - Shows live transcript (text side-channel from Gemini)
  - Loop mode: automatically restarts with next story when current one ends
  - Schedule mode: shows countdown timer, auto-starts at scheduled time
  - Stop/pause controls

**4. Client-side Gemini Live Connection**
- Uses `@google/genai` JS SDK in the browser
- `ai.live.connect()` with the ephemeral token
- Sends story text as user message, receives audio narration
- Handles session resumption for sessions > 10 minutes
- Loop logic: on session end, pick next story and reconnect

### Design
- NeuroVoice color palette: Deep Teal (#1A5F6B), Warm Amber (#F4A535), Cream (#FFF8F0)
- Clean, calming UI with large touch targets
- Bottom tab navigation: Home, Stories, Voice Session

### Implementation Order
1. Request GEMINI_API_KEY secret from user
2. Create `stories` table in Lovable Cloud
3. Build the `generate-token` edge function
4. Build Stories CRUD UI
5. Build Voice Session page with Gemini Live WebSocket connection
6. Add loop and schedule functionality

### Technical Notes
- The `@google/genai` SDK works in the browser for the Live API client connection
- Ephemeral tokens keep the real API key server-side only
- No user microphone needed — we only send text (stories) and receive audio
- Web Audio API or `<audio>` element for playback of PCM/audio chunks

