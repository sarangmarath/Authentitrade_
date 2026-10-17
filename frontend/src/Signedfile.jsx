import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

/* Shows a private storage file through a short-lived signed link (2 minutes). */
export default function SignedFile({ bucket, path, label }) {
  const [url, setUrl] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let live = true
    setUrl(null); setErr('')
    if (!path) return
    supabase.storage.from(bucket).createSignedUrl(path, 120).then(({ data, error }) => {
      if (!live) return
      if (error) setErr(error.message); else setUrl(data.signedUrl)
    })
    return () => { live = false }
  }, [bucket, path])

  if (!path) return null
  const isImg = /\.(png|jpe?g|webp|gif)$/i.test(path)
  return (
    <figure className="rounded-xl border border-[#E4DED4] bg-[#FDFBF6] p-2">
      <figcaption className="mb-1 text-xs font-semibold text-[#17352B]">{label}</figcaption>
      {err ? <p className="text-xs text-red-600">{err}</p>
        : !url ? <p className="text-xs text-[#8A8A80]">Loading…</p>
        : isImg ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={label} className="max-h-72 w-full rounded-lg object-contain" /></a>
        : <a href={url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#256B4F] hover:underline">Open document ↗</a>}
    </figure>
  )
}