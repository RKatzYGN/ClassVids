// js/supabaseClient.js
const SUPABASE_URL = 'https://qvdcddcuscqooydyahba.supabase.co/rest/v1/';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2ZGNkZGN1c2Nxb295ZHlhaGJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MzExMzksImV4cCI6MjEwNDMwNzEzOX0.eJVbWtp011v4jA_gkW_aj0TMj9Z5ewuujh4pVmK5ieQ';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
