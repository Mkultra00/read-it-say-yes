import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `You are a creative writer for Voice of Love, a memory care application. 
You generate warm, comforting, and vivid stories for patients with memory conditions.

Given patient context (name, family members, city, and important memories/objects), generate exactly 5 unique stories.

Each story should:
- Be 150-250 words
- Reference the patient's real memories, family, and places naturally
- Be warm, sensory-rich, and calming
- Cover different themes: childhood, family gatherings, nature, daily routines, celebrations
- Use the patient's name and family members' names naturally
- Include familiar places and objects
- Be written in third person

Return a JSON array using this tool.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const { patientName, familyMembers, city, memories } = await req.json();
    if (!patientName) throw new Error('patientName is required');

    const userPrompt = `Generate stories for this patient:
- Patient name: ${patientName}
- Family members: ${familyMembers || 'Not specified'}
- City/Place: ${city || 'Not specified'}
- Important memories & objects: ${memories || 'Not specified'}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'save_stories',
            description: 'Save the generated stories',
            parameters: {
              type: 'object',
              properties: {
                stories: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string', description: 'A warm, descriptive title' },
                      content: { type: 'string', description: 'The full story text, 150-250 words' },
                      category: { type: 'string', enum: ['childhood', 'family', 'nature', 'daily life', 'celebrations'] },
                    },
                    required: ['title', 'content', 'category'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['stories'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'save_stories' } },
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
        return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('No stories generated');
    }

    const { stories } = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ stories }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-stories:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
