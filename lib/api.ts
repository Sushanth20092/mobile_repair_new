import { createClient } from '@supabase/supabase-js'

// Make sure to create a 'booking-images' storage bucket in Supabase for image uploads to work.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

export async function apiGet<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.headers || {}),
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function apiPost<T>(endpoint: string, data: any, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    method: 'POST',
    credentials: 'include',
    headers: {
      ...(options.headers || {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
} 