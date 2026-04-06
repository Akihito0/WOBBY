import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// This creates the "Client" that the rest of your app will use
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);