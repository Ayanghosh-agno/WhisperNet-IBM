import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info'
};
// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const TWILIO_SID = Deno.env.get('TWILIO_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TWILIO_SID || !TWILIO_AUTH_TOKEN) {
  throw new Error('Missing required environment variables');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
serve(async (req)=>{
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({
        error: 'Session ID is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    // Get the call SID from the sos_sessions table
    const { data: session, error: sessionError } = await supabase.from('sos_sessions').select('callSID, callStatus').eq('session_id', session_id).single();
    if (sessionError || !session) {
      return new Response(JSON.stringify({
        error: 'Session not found'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    if (!session.callSID) {
      return new Response(JSON.stringify({
        error: 'No active call found for this session'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    // Check if call is already completed
    if (session.callStatus === 'completed') {
      return new Response(JSON.stringify({
        success: true,
        message: 'Call was already completed',
        callStatus: 'completed'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    // Hang up the call using Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Calls/${session.callSID}.json`;
    const formData = new URLSearchParams();
    formData.append('Status', 'completed');
    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${TWILIO_SID}:${TWILIO_AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });
    if (!twilioResponse.ok) {
      const twilioError = await twilioResponse.text();
      return new Response(JSON.stringify({
        error: 'Failed to hang up call',
        details: twilioError
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    // Update the call status in our database
    const { error: updateError } = await supabase.from('sos_sessions').update({
      callStatus: 'completed'
    }).eq('session_id', session_id);
    if (updateError) {
      console.error('Failed to update call status in database:', updateError);
    // Don't fail the request since Twilio call was successfully hung up
    }
    // Add a system message to indicate the call was ended by user
    await supabase.from('sos_messages').insert({
      session_id,
      sender: 'system',
      source_type: 'system',
      message: 'Emergency call ended by user',
      created_at: new Date().toISOString()
    });
    return new Response(JSON.stringify({
      success: true,
      message: 'Call hung up successfully',
      callStatus: 'completed'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error in hangup-call function:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});
