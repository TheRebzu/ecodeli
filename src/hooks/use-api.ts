import { useState } from 'react'
import axios from 'axios'

export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const request = async (url: string, options?: any) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await axios(url, options)
      return response.data
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }
  
  return { request, loading, error }
}
