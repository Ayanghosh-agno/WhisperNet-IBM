import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types based on your schema
export interface SOSSession {
  session_id: string;
  situation: string;
  location: string;
  number_of_threat: number;
  created_at?: string;
  location_lat?: number;
  location_long?: number;
  callSID?: string;
  callStatus?: string;
  ai_guide_enabled: boolean;
}

export interface SOSMessage {
  id: string;
  session_id?: string;
  sender: 'user' | 'responder' | 'system';
  source_type?: 'user' | 'ai' | 'responder' | 'system';
  message: string;
  created_at?: string;
  sent_to_responder?: boolean;