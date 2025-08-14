import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import axios from 'npm:axios';
// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info'
};
// Environment variables with validation
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const IBM_STT_API_KEY = Deno.env.get('IBM_STT_API_KEY');
const IBM_STT_URL = Deno.env.get('IBM_STT_URL');
const WATSONX_API_KEY = Deno.env.get('WATSONX_API_KEY');
const WATSONX_PROJECT_ID = Deno.env.get('WATSONX_PROJECT_ID');
const WATSONX_IAM_URL = 'https://iam.cloud.ibm.com/identity/token';
const WATSONX_URL = 'https://us-south.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29';
const TWILIO_SID = Deno.env.get('TWILIO_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_FROM = Deno.env.get('TWILIO_FROM');
// const TO_NUMBER = Deno.env.get('TO_NUMBER');
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
async function downloadTwilioAudio(url, retries = 3, delayMs = 3000) {
  for(let i = 0; i < retries; i++){
    const res = await fetch(url, {
      method: 'GET'
    });
    if (res.ok) {
      return new Uint8Array(await res.arrayBuffer());
    }
    await new Promise((resolve)=>setTimeout(resolve, delayMs));
  }
  throw new Error(`Recording not ready after ${retries} retries`);
}
serve(async (req)=>{
  const url = new URL(req.url);
  // Handle CORS preflight requests first
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  // 1. Initial Emergency Submission
  if (req.method === 'POST' && (url.pathname === '/SOS/' || url.pathname.endsWith('/SOS'))) {
    const { session_id, situation, location, number_of_threat, call_number, emergency_contact_1, emergency_contact_2, location_lat, location_long } = await req.json();
    const { data: existing } = await supabase.from('sos_sessions').select('*').eq('session_id', session_id).maybeSingle();
    if (!existing) {
      const watsonToken = await getWatsonXAccessToken();
      const prompt = `You are WhisprNet, a voice assistant conveying an urgent emergency message on behalf of a user in distress.\n\nYour task is to generate a short, factual, and calm message starting with:\n"I am WhisprNet, a voice assistant conveying an urgent message from a user in need."\n\nThen summarize the emergency using ONLY the data provided below. Do NOT add any suggestions, warnings, emotional tone, or extra details. Use exact values.\n\nSituation: "${situation}"\nLocation: "${location}"\nNumber of threats reported: ${number_of_threat}\n\nRespond in a single paragraph.`;
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
              content: prompt
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
      const summary = watsonJson.choices?.[0]?.message?.content.trim() || 'This is an emergency. Please send help.';
      const params = new URLSearchParams();
      params.append('Url', `https://rlkfxbvsnbazdzgrlbiu.supabase.co/functions/v1/SOS/twiml-voice?msg=${encodeURIComponent(summary)}&session_id=${session_id}`);
      params.append('To', call_number);
      params.append('From', TWILIO_FROM);
      params.append('StatusCallback', 'https://rlkfxbvsnbazdzgrlbiu.supabase.co/functions/v1/SOS/call-status');
      params.append('StatusCallbackEvent', 'initiated');
      params.append('StatusCallbackEvent', 'ringing');
      params.append('StatusCallbackEvent', 'answered');
      params.append('StatusCallbackEvent', 'completed');
      params.append('StatusCallbackMethod', 'POST');
      const response = await axios.post(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Calls.json`, params, {
        auth: {
          username: TWILIO_SID,
          password: TWILIO_AUTH_TOKEN
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      const callSID = response.data.sid;
      const emergencyContacts = [
        emergency_contact_1,
        emergency_contact_2
      ].filter(Boolean).join(';');
      await supabase.from('sos_sessions').insert({
        session_id,
        situation,
        location,
        location_long,
        location_lat,
        number_of_threat,
        callSID,
        emergency_contacts: emergencyContacts,
        created_at: new Date().toISOString()
      });
      await supabase.from('sos_messages').insert({
        session_id,
        sender: 'user',
        source_type: 'user',
        sent_to_responder: true,
        message: situation,
        created_at: new Date().toISOString()
      });
      await supabase.from('sos_messages').insert({
        session_id,
        sender: 'user',
        source_type: 'ai',
        message: summary,
        created_at: new Date().toISOString()
      });
      if (emergencyContacts && emergencyContacts.trim() !== '') {
        // Fire-and-forget initial emergency sms
        fetch('https://rlkfxbvsnbazdzgrlbiu.supabase.co/functions/v1/escalate-alert/initial', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session_id
          })
        }).catch((err)=>{
          console.error('Error triggering initial sms:', err);
        });
      }
    }
    return new Response(JSON.stringify({
      success: true
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  // 2. TwiML Voice XML Response
  if (req.method === 'POST' && url.pathname === '/SOS/twiml-voice') {
    const msg = url.searchParams.get('msg') || 'This is an emergency. Please send help.';
    const session_id = url.searchParams.get('session_id') || '';
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="Polly.Joanna">${msg}</Say>
        <Record timeout="10" maxLength="60" action="https://rlkfxbvsnbazdzgrlbiu.supabase.co/functions/v1/SOS/handle-recording?session_id=${session_id}" />
      </Response>`, {
      headers: {
        'Content-Type': 'text/xml'
      }
    });
  }
  // 3. Handle Responder Recording.
  if (req.method === 'POST' && url.pathname === '/SOS/handle-recording') {
    const session_id = url.searchParams.get('session_id') || '';
    const { data: session, error } = await supabase.from('sos_sessions').select('*').eq('session_id', session_id).maybeSingle();
    const formData = await req.formData();
    const callSat = formData.get('CallStatus')?.toString();
    if (error || !session || session.callStatus !== 'in-progress' || callSat == 'completed') {
      return new Response('<Response><Say>Call is not active. Cannot process recording.</Say></Response>', {
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    }
    await supabase.from('sos_sessions').update({
      responder_processing_status: 'processing_audio'
    }).eq('session_id', session_id);
    const recordingUrl = formData.get('RecordingUrl')?.toString() + '.mp3';
    const audioBuffer = await downloadTwilioAudio(recordingUrl);
    const sttRes = await fetch(`${IBM_STT_URL}`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`apikey:${IBM_STT_API_KEY}`),
        'Content-Type': 'audio/mp3'
      },
      body: audioBuffer
    });
    const sttJson = await sttRes.json();
    const transcript = sttJson.results?.map((r)=>r.alternatives[0].transcript).join(' ') || '';
    await supabase.from('sos_messages').insert({
      session_id,
      sender: 'responder',
      source_type: 'responder',
      message: transcript,
      created_at: new Date().toISOString()
    });
    if (session.ai_guide_enabled != false) {
      await supabase.from('sos_sessions').update({
        responder_processing_status: 'generating_response'
      }).eq('session_id', session_id);
      const { data: userMessages } = await supabase.from('sos_messages').select('message').eq('session_id', session_id).eq('sender', 'user');
      const context = userMessages?.map((m)=>m.message).join('\n') || '';
      const followupPrompt = `You are simulating the user's voice only. Responder asked: \"${transcript}\". Based strictly on the user's past messages below, reply in first person as the user. Do not guess, invent, or add details. Only respond with information clearly present in the user messages. If you cannot infer the response confidently or there is no context in the past user message, reply exactly with: 'User input required.'\\n---\\nUser Messages:\\n${context}\\n---`;
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
              content: followupPrompt
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
      const aiData = await aiRes.json();
      const answer = aiData.choices?.[0]?.message?.content.trim() || 'User input required.';
      const isFallback = answer.includes('User input required');
      if (!isFallback) {
        await supabase.from('sos_messages').insert({
          session_id,
          sender: 'user',
          source_type: 'ai',
          message: answer,
          created_at: new Date().toISOString()
        });
      }
      await supabase.from('sos_sessions').update({
        responder_processing_status: 'idle'
      }).eq('session_id', session_id);
      const responseXml = isFallback ? `
        <Response>
          <Say voice="Polly.Joanna">Waiting for user input.</Say>
          <Pause length="5" />
          <Redirect>https://rlkfxbvsnbazdzgrlbiu.supabase.co/functions/v1/SOS/check-response?session_id=${session_id}</Redirect>
        </Response>
      ` : `
        <Response>
          <Say voice="Polly.Joanna">${answer}</Say>
          <Record timeout="10" maxLength="60" action="https://rlkfxbvsnbazdzgrlbiu.supabase.co/functions/v1/SOS/handle-recording?session_id=${session_id}" />
        </Response>
      `;
      return new Response(responseXml, {
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    }
    await supabase.from('sos_sessions').update({
      responder_processing_status: 'idle'
    }).eq('session_id', session_id);
    const responseXml = `
        <Response>
          <Say voice="Polly.Joanna">Waiting for user input.</Say>
          <Pause length="5" />
          <Redirect>https://rlkfxbvsnbazdzgrlbiu.supabase.co/functions/v1/SOS/check-response?session_id=${session_id}</Redirect>
        </Response>`;
    return new Response(responseXml, {
      headers: {
        'Content-Type': 'text/xml'
      }
    });
  }
  // 4. Handle User follow up Input.
  if (req.method === 'POST' && url.pathname === '/SOS/check-response') {
    const session_id = url.searchParams.get('session_id');
    if (!session_id) {
      return new Response('<Response><Say>Missing session ID.</Say></Response>', {
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    }
    // Fetch latest user message not yet sent to responder
    const { data: latestUserMessage } = await supabase.from('sos_messages').select('id, message').eq('session_id', session_id).eq('source_type', 'user').eq('sent_to_responder', false).order('created_at', {
      ascending: true
    }).limit(1).maybeSingle();
    if (latestUserMessage) {
      const { data: session, error } = await supabase.from('sos_sessions').select('*').eq('session_id', session_id).maybeSingle();
      if (session?.emergency_contacts && session.emergency_contacts.trim() !== '' && !session.final_sms_sent) {
        // Fire-and-forget escalation SMS
        fetch('https://rlkfxbvsnbazdzgrlbiu.supabase.co/functions/v1/escalate-alert/contextual', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session_id
          })
        }).catch((err)=>{
          console.error('Error triggering escalation:', err);
        });
      }
      // Mark message as sent
      await supabase.from('sos_messages').update({
        sent_to_responder: true
      }).eq('id', latestUserMessage.id);
      // Say the message and record the next input
      return new Response(`
        <Response>
          <Say voice="Polly.Joanna">${latestUserMessage.message}</Say>
          <Record timeout="10" maxLength="60" action="https://rlkfxbvsnbazdzgrlbiu.supabase.co/functions/v1/SOS/handle-recording?session_id=${session_id}" />
        </Response>
      `, {
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    } else {
      // No new user message yet
      return new Response(`
        <Response>
          <Say>No response yet. Please wait.</Say>
          <Pause length="5" />
          <Redirect>https://rlkfxbvsnbazdzgrlbiu.supabase.co/functions/v1/SOS/check-response?session_id=${session_id}</Redirect>
        </Response>
      `, {
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    }
  }
  // 5. Hanlde Call Status per sos session
  if (req.method === 'POST' && url.pathname === '/SOS/call-status') {
    const formData = await req.formData();
    const callSid = formData.get('CallSid');
    const callStatus = formData.get('CallStatus');
    if (callSid && callStatus) {
      const { error } = await supabase.from('sos_sessions').update({
        callStatus: callStatus.toString()
      }).eq('callSID', callSid);
    }
    return new Response('OK', {
      status: 200
    });
  }
  return new Response('Not Found', {
    status: 404
  });
});
