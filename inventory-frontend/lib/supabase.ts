import { createClient } from "@supabase/supabase-js"

// Use fallback values for development/demo purposes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://demo.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "demo-key"

// Create a mock client if environment variables are not set
export const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: () => Promise.resolve({ error: new Error("Demo mode - Supabase not configured") }),
        signUp: () => Promise.resolve({ error: new Error("Demo mode - Supabase not configured") }),
        signOut: () => Promise.resolve({ error: null }),
      },
    }

export type UserRole = "admin" | "staff"

export interface User {
  id: string
  email: string
  role: UserRole
  name: string
  created_at: string
}
