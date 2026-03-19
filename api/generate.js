export const config = { runtime: 'edge' };

export default async function handler(req) {
  if(req.method === 'OPTIONS'){
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
  if(req.method !== 'POST'){
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }
  try {
    const { idea, stage, audience } = await req.json();
    if(!idea || idea.length < 20){
      return new Response(JSON.stringify({ error: 'Idea too short' }), { status: 400 });
    }
    const apiKey = process.env.GROQ_API_KEY;
    if(!apiKey){ return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 }); }

    const prompt = `You are a world-class startup pitch deck consultant who has helped companies raise millions. Create a compelling 10-slide pitch deck for this startup idea.

Respond ONLY in valid JSON, no markdown, no backticks, no extra text:

{
  "startup_name": "<catchy startup name>",
  "tagline": "<one punchy line, max 8 words>",
  "slides": [
    {
      "number": 1,
      "title": "Problem",
      "emoji": "<relevant emoji>",
      "headline": "<bold problem statement>",
      "points": ["<point 1>", "<point 2>", "<point 3>"],
      "speaker_note": "<what to say when presenting this slide, 2-3 sentences>"
    },
    {
      "number": 2,
      "title": "Solution",
      "emoji": "<relevant emoji>",
      "headline": "<your solution in one line>",
      "points": ["<point 1>", "<point 2>", "<point 3>"],
      "speaker_note": "<what to say, 2-3 sentences>"
    },
    {
      "number": 3,
      "title": "Market Size",
      "emoji": "<relevant emoji>",
      "headline": "<market opportunity statement>",
      "points": ["<TAM with real numbers>", "<SAM>", "<SOM>"],
      "speaker_note": "<what to say, 2-3 sentences>"
    },
    {
      "number": 4,
      "title": "Product",
      "emoji": "<relevant emoji>",
      "headline": "<what you built>",
      "points": ["<feature 1>", "<feature 2>", "<feature 3>"],
      "speaker_note": "<what to say, 2-3 sentences>"
    },
    {
      "number": 5,
      "title": "Traction",
      "emoji": "<relevant emoji>",
      "headline": "<traction or early signals>",
      "points": ["<metric or signal 1>", "<metric 2>", "<metric 3>"],
      "speaker_note": "<what to say, 2-3 sentences>"
    },
    {
      "number": 6,
      "title": "Business Model",
      "emoji": "<relevant emoji>",
      "headline": "<how you make money>",
      "points": ["<revenue stream 1>", "<pricing model>", "<unit economics>"],
      "speaker_note": "<what to say, 2-3 sentences>"
    },
    {
      "number": 7,
      "title": "Competition",
      "emoji": "<relevant emoji>",
      "headline": "<your competitive edge>",
      "points": ["<competitor 1 and weakness>", "<competitor 2 and weakness>", "<your unfair advantage>"],
      "speaker_note": "<what to say, 2-3 sentences>"
    },
    {
      "number": 8,
      "title": "Go-to-Market",
      "emoji": "<relevant emoji>",
      "headline": "<how you acquire customers>",
      "points": ["<channel 1>", "<channel 2>", "<growth strategy>"],
      "speaker_note": "<what to say, 2-3 sentences>"
    },
    {
      "number": 9,
      "title": "Team",
      "emoji": "<relevant emoji>",
      "headline": "<why your team wins>",
      "points": ["<founder strength 1>", "<founder strength 2>", "<key hire needed>"],
      "speaker_note": "<what to say, 2-3 sentences>"
    },
    {
      "number": 10,
      "title": "The Ask",
      "emoji": "<relevant emoji>",
      "headline": "<what you're raising and why>",
      "points": ["<funding amount>", "<use of funds breakdown>", "<18 month milestone>"],
      "speaker_note": "<what to say, 2-3 sentences>"
    }
  ]
}

Startup idea: ${idea}
Stage: ${stage || 'idea'}
Target investors: ${audience || 'general'}
Be specific, use real market data where possible, make it compelling and investor-ready.`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2048,
        temperature: 0.8,
        messages: [
          { role: 'system', content: 'You are a world-class pitch deck consultant. Always respond with valid JSON only. No markdown, no backticks, no extra text.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await groqRes.json();
    if(data.error){ return new Response(JSON.stringify({ error: data.error.message }), { status: 500 }); }
    const raw = data.choices[0].message.content;
    const clean = raw.replace(/```json|```/g,'').trim();
    const parsed = JSON.parse(clean);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message || 'Something went wrong' }), { status: 500 });
  }
}
