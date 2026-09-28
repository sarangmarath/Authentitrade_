import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  const [status, setStatus] = useState('Checking connection...')

  useEffect(() => {
    supabase
      .from('listings')
      .select('*')
      .then(({ data, error }) => {
        if (error) setStatus('Error: ' + error.message)
        else setStatus('Connected to Supabase. Listings found: ' + data.length)
      })
  }, [])

  return (
    <div style={{ padding: 40 }}>
      <h1>AuthentiTrade</h1>
      <p>{status}</p>
    </div>
  )
}