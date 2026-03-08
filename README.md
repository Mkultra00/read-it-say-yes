# 🐼 Voice of Love

**An AI-powered storytelling companion for dementia and elderly care.**

Voice of Love helps caregivers create personalized, comforting stories for patients with memory conditions. By combining patient context — names, family members, cherished memories, and familiar places — with generative AI, the app produces warm narrations that can soothe, engage, and spark recognition.

---

## 🎯 Use Case

Dementia and memory-care patients often find comfort in familiar stories, voices, and sensory details. Voice of Love enables caregivers to:

1. **Build a patient profile** with their name, family members, city, and important memories/objects.
2. **Generate personalized stories** using AI (Google Gemini) that weave in real names, places, and experiences.
3. **Listen to narrated stories** with natural-sounding AI voices (ElevenLabs TTS) in multiple languages.
4. **Run an infinite story mode** that continuously generates and narrates fresh stories — perfect for extended comfort sessions.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| **Personalized Story Generation** | AI creates unique stories based on the patient's real memories, family, and places |
| **AI Voice Narration** | Stories are read aloud using warm, natural ElevenLabs TTS voices |
| **Multi-Language Support** | English, Mandarin Chinese, Mexican Spanish, and Hindi |
| **Voice Selection** | Choose from multiple voice profiles to find the most comforting tone |
| **Infinite Mode** | Continuous story generation and narration for extended listening sessions |
| **Story Management** | Create, edit, delete, and organize stories with categories |
| **Patient Profiles** | Save and manage patient context for consistent, personalized content |

---

## 🛠 Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Lovable Cloud (Supabase) — database, edge functions, storage
- **AI Story Generation:** Google Gemini 2.5 Flash via Lovable AI Gateway
- **Text-to-Speech:** ElevenLabs Multilingual v2
- **State Management:** Zustand, TanStack React Query

---

## 🚀 Getting Started

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start the development server
npm run dev
```

---

## 👥 Team Members

- Frank Yu
- Forrest Pan
- Wun Kuen Ng
- Jin Thakur
