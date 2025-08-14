import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info'
};
// Environment variables with validation
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const WATSONX_API_KEY = Deno.env.get('WATSONX_API_KEY');
const WATSONX_PROJECT_ID = Deno.env.get('WATSONX_PROJECT_ID');
const WATSONX_IAM_URL = 'https://iam.cloud.ibm.com/identity/token';
const WATSONX_URL = 'https://us-south.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
async function getWatsonXAccessToken() {
  const body = new URLSearchParams();
  body.append('grant_type', 'urn:ibm:params:oauth:grant-type:apikey');
  body.append('apikey', WATSONX_API_KEY);
  const res = await fetch(WATSONX_IAM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });
  const json = await res.json();
  console.log(json);
  return json.access_token;
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  const { session_id, question } = await req.json();
  const { data: messages, error } = await supabase.from('sos_messages').select('sender, message, source_type, created_at').eq('session_id', session_id).order('created_at', {
    ascending: true
  });
  if (error || !messages || messages.length === 0) {
    return new Response(JSON.stringify({
      error: 'Session or messages not found'
    }), {
      status: 404
    });
  }
  const userContext = messages.map((m)=>m.message).join('\n');
  const prompt = `You are WhisprNet AI assisting a concerned emergency contact. Based on the messages from the user in this emergency session, answer the contact's question factually. Do not guess, invent, or provide suggestions. Only respond with clearly known facts.\n\nSession ID: ${session_id}\nUser Messages:\n${userContext}\nContact Question: "${question}"\nAnswer:`;
  const watsonToken = await getWatsonXAccessToken();
  const aiRes = await fetch(WATSONX_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${watsonToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model_id: 'ibm/granite-3-3-8b-instruct',
      project_id: WATSONX_PROJECT_ID,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      parameters: {
        max_tokens: 200,
        temperature: 0,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      }
    })
  });
  const watsonJson = await aiRes.json();
  const answer = watsonJson.choices?.[0]?.message?.content.trim() || 'No clear answer found.';
  return new Response(JSON.stringify({
    answer
  }), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
});
