import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// createClient kaatuisi puuttuviin arvoihin joka tapauksessa — heitetään
// selkeä virhe, jotta syy näkyy konsolissa suoraan.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or Anon Key is missing! Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
