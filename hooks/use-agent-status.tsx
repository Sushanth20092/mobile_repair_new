import { useEffect, useState } from 'react'
import { supabase } from '@/lib/api'

export function useAgentStatus(userId?: string) {
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setStatus(null)
      setLoading(false)
      return
    }
    setLoading(true)
    supabase
      .from('agents')
      .select('status')
      .eq('user_id', userId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setStatus(null)
        } else {
          setStatus(data.status)
        }
        setLoading(false)
      })
  }, [userId])

  return { status, loading }
} 