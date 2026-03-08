import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DEFAULT_SYSTEM_INSTRUCTION = "You are a warm, caring voice narrator for a memory care application called NeuroVoice. Narrate the following story in a calm, soothing, and engaging voice. Speak slowly and clearly. Add natural pauses. Make the listener feel safe and comforted. Do not add any meta-commentary — just narrate the story naturally as if telling it to someone you care about.";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const { storyContent, systemInstruction } = await req.json();

    if (!storyContent) {
      throw new Error('storyContent is required');
    }

    // Simply return the API key and config for the client to establish a Live API WebSocket.
    // No server-side Gemini call needed — the client connects directly via WebSocket.
    return new Response(
      JSON.stringify({
        apiKey: GEMINI_API_KEY,
        model: 'gemini-2.0-flash-live-001',
        systemInstruction: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-token:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
