import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Supabase URL loaded:', supabaseUrl ? 'Yes' : 'No')
console.log('Supabase Anon Key loaded:', supabaseAnonKey ? 'Yes' : 'No')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing! Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
