// /escalate-alert Supabase Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import axios from 'npm:axios';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const WATSONX_API_KEY = Deno.env.get('WATSONX_API_KEY');
const WATSONX_PROJECT_ID = Deno.env.get('WATSONX_PROJECT_ID');
const WATSONX_IAM_URL = 'https://iam.cloud.ibm.com/identity/token';
const WATSONX_URL = 'https://us-south.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29';
const TWILIO_SID = Deno.env.get('TWILIO_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_FROM = Deno.env.get('TWILIO_FROM');
const APP_URL = Deno.env.get('APP_URL');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
async function getWatsonXToken() {
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
  return json.access_token;
}
serve(async (req)=>{
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405
    });
  }
  const url = new URL(req.url);
  if (url.pathname === '/escalate-alert/initial') {
    try {
      const { session_id } = await req.json();
      const { data: session, error } = await supabase.from('sos_sessions').select('*').eq('session_id', session_id).maybeSingle();
      if (error || !session) {
        return new Response('Session not found', {
          status: 404
        });
      }
      // Check if emergency_contacts exist
      if (!session.emergency_contacts || session.emergency_contacts.trim() === '') {
        return new Response('No emergency contacts', {
          status: 200
        });
      }
      const { location, number_of_threat, emergency_contacts, situation } = session;
      // Compose the emergency alert message
      const message = `🚨 Emergency Alert 🚨\nA user you know has triggered a silent SOS from their device. A voice call has been placed to emergency services. You'll be notified with more details shortly.\n\nIncident Details:- \n\n\nLocation: ${location || 'Unknown'}\nThreats reported: ${number_of_threat || 'N/A'}\n\Situation reported: ${situation || 'N/A'}\n\n\nSee the Live Chat here - https://${APP_URL}?session=${session_id}`;
      // Split contacts separated by ";" or "," etc.
      const contacts = emergency_contacts.split(/[;,]/).map((c)=>c.trim()).filter(Boolean);
      // Send SMS to each contact via Twilio
      for (const contact of contacts){
        await axios.post(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, new URLSearchParams({
          To: contact,
          From: TWILIO_FROM,
          Body: message
        }), {
          auth: {
            username: TWILIO_SID,
            password: TWILIO_AUTH_TOKEN
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
      }
      return new Response('Initial alert sent successfully');
    } catch (err) {
      console.error('Error in /escalate-alert/initial:', err);
      return new Response('Internal server error', {
        status: 500
      });
    }
  }
  if (url.pathname === '/escalate-alert/contextual') {
    const { session_id } = await req.json();
    if (!session_id) {
      return new Response('Missing session_id', {
        status: 400
      });
    }
    // Get all messages for this session
    const { data: messages, error } = await supabase.from('sos_messages').select('message').eq('session_id', session_id).order('created_at', {
      ascending: true
    });
    if (error || !messages?.length) {
      return new Response('No messages found', {
        status: 404
      });
    }
    const { data, error: errorSess } = await supabase.from('sos_sessions').select('*').eq('session_id', session_id).maybeSingle();
    const fullChat = messages.map((m)=>m.message).join('\n');
    const watsonToken = await getWatsonXToken();
    const decisionPrompt = `Analyze the chat history below. Only return "valid": "Yes" if all three details are clearly and explicitly present in the user's messages: (1) the user's name, (2) the type of emergency or threat, and (3) a specific location. Do not infer or guess missing information. Also return a short emergency summary based only on the facts mentioned. If any one of the three is missing, return "valid": "No". Respond in this strict JSON format: {"valid": "...", "reason": "...", "summary": "..."}. Chat:\n${fullChat}\n\n Location:\n${data.location}`;
    const watsonRes = await fetch(WATSONX_URL, {
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
            content: decisionPrompt
          }
        ],
        parameters: {
          max_tokens: 2000,
          temperature: 0.7,
          top_p: 0.9
        }
      })
    });
    const watsonJson = await watsonRes.json();
    console.log(watsonJson);
    const summary = watsonJson.choices?.[0]?.message?.content.trim() || '';
    var watsonReponseJson = typeof summary === 'string' ? JSON.parse(summary) : summary;
    if (summary === '') {
      return new Response(JSON.stringify({
        success: true,
        skipped: true
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    if (watsonReponseJson.valid?.toLowerCase() != 'yes') {
      return new Response(JSON.stringify({
        success: true,
        summary,
        skipped: true
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const contacts = (data.emergency_contacts || '').split(';').map((c)=>c.trim()).filter(Boolean);
    if (!contacts.length) {
      return new Response('No emergency contacts found', {
        status: 404
      });
    }
    await supabase.from('sos_sessions').update({
      final_sms_sent: true
    }).eq('session_id', session_id);
    // Send SMS to each contact
    const chatLink = `https://${APP_URL}?session=${session_id}`;
    const smsBody = `${watsonReponseJson.summary?.trim()}\n\nView live chat: ${chatLink}`;
    for (const number of contacts){
      await axios.post(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, new URLSearchParams({
        From: TWILIO_FROM,
        To: number,
        Body: smsBody
      }), {
        auth: {
          username: TWILIO_SID,
          password: TWILIO_AUTH_TOKEN
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
    }
    return new Response(JSON.stringify({
      success: true,
      summary,
      sentTo: contacts
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  return new Response('Not Found', {
    status: 404
  });
});
