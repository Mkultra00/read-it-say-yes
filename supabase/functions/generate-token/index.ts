import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    // Use the Gemini API to create an ephemeral token with locked config
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-live-001:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: storyContent }]
          }],
          systemInstruction: {
            parts: [{
              text: systemInstruction || "You are a warm, caring voice narrator for a memory care application called NeuroVoice. Narrate the following story in a calm, soothing, and engaging voice. Speak slowly and clearly. Add natural pauses. Make the listener feel safe and comforted. Do not add any meta-commentary — just narrate the story naturally as if telling it to someone you care about."
            }]
          },
          generationConfig: {
            responseMimeType: "text/plain",
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();

    // Return the API key and config so the client can establish a Live API WebSocket connection
    // The client will use the Gemini Live API directly for streaming audio
    return new Response(
      JSON.stringify({
        apiKey: GEMINI_API_KEY,
        model: 'gemini-2.0-flash-live-001',
        systemInstruction: systemInstruction || "You are a warm, caring voice narrator for a memory care application called NeuroVoice. Narrate the following story in a calm, soothing, and engaging voice. Speak slowly and clearly. Add natural pauses. Make the listener feel safe and comforted. Do not add any meta-commentary — just narrate the story naturally as if telling it to someone you care about.",
        // Also return a text preview from the non-live model
        textPreview: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
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
