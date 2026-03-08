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
};

function getSystemPrompt(language: string, patientName?: string) {
  const langName = LANGUAGE_MAP[language] || "English";
  const nameInstruction = patientName
    ? `- CRITICAL: You are speaking directly TO the patient named "${patientName}". Address them by name frequently throughout the narration (e.g. "Remember, ${patientName}...", "You know, ${patientName}...", "${patientName}, can you picture..."). Use their name at least 3-4 times naturally woven into the narration.
- Use second person ("you") to speak directly to ${patientName}`
    : `- Speak in second person or third person as appropriate`;
  return `You are a warm, caring voice narrator for a memory care application called NeuroVoice. 
Rewrite the following story as a gentle, soothing narration spoken directly to the patient.
- IMPORTANT: Write the entire narration in ${langName}. Every word must be in ${langName}.
${nameInstruction}
- Add natural pauses indicated by "..."
- Keep sentences short and calming
- Add sensory details (sounds, smells, warmth)
- Make the listener feel safe and comforted
- Do NOT add meta-commentary, just narrate
- Keep roughly the same length as the original`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { storyContent, language, patientName } = await req.json();
    if (!storyContent) {
      throw new Error('storyContent is required');
    }

    const systemPrompt = getSystemPrompt(language || 'english', patientName);

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
          { role: 'user', content: `Please narrate this story:\n\n${storyContent}` },
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
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const narration = data.choices?.[0]?.message?.content;

    if (!narration) {
      throw new Error('No narration generated');
    }

    return new Response(
      JSON.stringify({ narration }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-token:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
