import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LANGUAGE_MAP: Record<string, string> = {
  english: "English",
  mandarin: "Mandarin Chinese (简体中文)",
  "spanish-mx": "Mexican Spanish (Español de México)",
  hindi: "Hindi (हिन्दी)",
  tagalog: "Tagalog (Filipino)",
};

const THEMES = [
  "a warm childhood memory",
  "a family gathering or celebration",
  "a peaceful moment in nature",
  "a comforting daily routine",
  "a special holiday or birthday",
  "a walk through a familiar neighborhood",
  "cooking or sharing a favorite meal",
  "a moment with a beloved pet",
  "a rainy day spent indoors with loved ones",
  "a trip to a favorite place",
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const { patientName, familyMembers, city, memories, language, previousTitles } = await req.json();
    if (!patientName) throw new Error('patientName is required');

    const langName = LANGUAGE_MAP[language] || "English";
    const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
    const avoidList = previousTitles?.length
      ? `\nDo NOT repeat these story themes or titles: ${previousTitles.join(", ")}`
      : "";

    const systemPrompt = `You are a creative, warm storyteller for a memory care application.
Write ONE unique, comforting story (150-250 words) in ${langName}.
The story should be about: ${theme}.

Rules:
- Write entirely in ${langName}
- Address the patient "${patientName}" directly by name, using "you" (second person)
- Use ${patientName}'s name at least 3 times naturally
- Reference their real family, places, and memories naturally
- Be warm, sensory-rich, calming, and vivid
- Include sounds, smells, textures, and warmth
- Do NOT add meta-commentary${avoidList}

Return ONLY a JSON object with "title" and "content" fields. No markdown, no code blocks.`;

    const userPrompt = `Patient: ${patientName}
Family: ${familyMembers || 'Not specified'}
City: ${city || 'Not specified'}
Memories & objects: ${memories || 'Not specified'}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI gateway error:', response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response, stripping markdown code blocks if present
    let cleaned = raw.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    // Extract the JSON object (in case of leading/trailing prose)
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
    // Escape raw control characters that appear INSIDE string literals only.
    // Control chars outside strings (whitespace between tokens) are left alone.
    let story: { title: string; content: string };
    try {
      story = JSON.parse(cleaned);
    } catch (e1) {
      let inString = false;
      let escape = false;
      let out = "";
      for (let i = 0; i < cleaned.length; i++) {
        const ch = cleaned[i];
        const code = ch.charCodeAt(0);
        if (escape) {
          out += ch;
          escape = false;
          continue;
        }
        if (ch === "\\" && inString) {
          out += ch;
          escape = true;
          continue;
        }
        if (ch === '"') {
          inString = !inString;
          out += ch;
          continue;
        }
        if (inString && code < 0x20) {
          if (ch === "\n") out += "\\n";
          else if (ch === "\r") out += "\\r";
          else if (ch === "\t") out += "\\t";
          else if (ch === "\b") out += "\\b";
          else if (ch === "\f") out += "\\f";
          else out += "\\u" + code.toString(16).padStart(4, "0");
          continue;
        }
        out += ch;
      }
      try {
        story = JSON.parse(out);
      } catch (e2) {
        console.error("JSON parse failed. Raw:", raw);
        console.error("Cleaned:", cleaned);
        throw new Error(`Failed to parse story JSON: ${(e2 as Error).message}`);
      }
    }

    return new Response(
      JSON.stringify({ story: { title: story.title, content: story.content } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-single-story:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
