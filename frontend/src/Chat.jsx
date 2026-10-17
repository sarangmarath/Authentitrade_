import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import { NewDispute } from './Disputes'

/* List of the signed-in user's conversations (as buyer or seller) */
export function Inbox({ me, onPick, onClose }) {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    supabase.from('conversations')
      .select('id,buyer_id,seller_id,created_at,listings(title)')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRows(data || []))
  }, [])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-[#F3EEE8] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#17352B]">Your chats</h2>
          <button onClick={onClose} className="text-2xl leading-none text-[#6B6B62]" aria-label="Close">×</button>
        </div>
        {rows === null ? (
          <p className="text-sm text-[#6B6B62]">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[#6B6B62]">No chats yet. Open a listing and click “Chat with seller” to start one.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id}>
                <button onClick={() => onPick({ id: r.id, title: r.listings?.title || 'Listing' })}
                  className="w-full rounded-xl border border-[#E4DED4] bg-white p-3 text-left transition hover:shadow">
                  <p className="text-sm font-semibold text-[#17352B]">{r.listings?.title || 'Listing'}</p>
                  <p className="text-xs text-[#8A8A80]">{r.buyer_id === me ? 'You are the buyer' : 'You are the seller'}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/* One conversation, updates live */
export default function Chat({ conversationId, title, me, onClose }) {
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [reporting, setReporting] = useState(false)
  const end = useRef(null)
  const add = (m) => setMsgs((x) => (x.some((y) => y.id === m.id) ? x : [...x, m]))

  useEffect(() => {
    let live = true
    supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at')
      .then(({ data }) => {
        if (live && data) setMsgs((prev) => [...data, ...prev.filter((p) => !data.some((d) => d.id === p.id))])
      })
    const ch = supabase.channel(`conv-${conversationId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (p) => add(p.new))
      .subscribe()
    return () => { live = false; supabase.removeChannel(ch) }
  }, [conversationId])

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  async function send(e) {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setText(''); setErr('')
    const { data, error } = await supabase.from('messages')
      .insert({ conversation_id: conversationId, sender_id: me, body }).select().single()
    if (error) { setErr(error.message); setText(body) } else add(data)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose}>
      <aside onClick={(e) => e.stopPropagation()}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-[#F3EEE8] shadow-2xl">
        <header className="flex items-center justify-between gap-2 border-b border-[#E4DED4] bg-white px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-[#8A8A80]">Chat about</p>
            <h2 className="truncate text-sm font-bold text-[#17352B]">{title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button onClick={() => setReporting(true)} className="text-xs font-semibold text-[#256B4F] hover:underline">Report a problem</button>
            <button onClick={onClose} className="text-2xl leading-none text-[#6B6B62]" aria-label="Close chat">×</button>
          </div>
        </header>

        <p className="bg-[#E4EFE8] px-4 py-2 text-xs text-[#3D5A4D]">
          Inspect the item before you pay, and never share your login codes with anyone.
        </p>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {msgs.length === 0 && <p className="text-center text-sm text-[#8A8A80]">Say hello and ask about the item.</p>}
          {msgs.map((m) => {
            const mine = m.sender_id === me
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-[#256B4F] text-white' : 'border border-[#E4DED4] bg-white text-[#17352B]'}`}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-[#8A8A80]'}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={end} />
        </div>

        {err && <p role="alert" className="px-4 text-xs text-red-600">{err}</p>}
        <form onSubmit={send} className="flex gap-2 border-t border-[#E4DED4] bg-white p-3">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Write a message…"
            className="min-w-0 flex-1 rounded-xl border border-[#E4DED4] bg-[#FDFBF6] px-3 py-2.5 text-sm focus:border-[#256B4F] focus:outline-none focus:ring-2 focus:ring-[#256B4F]/25" />
          <button className="rounded-xl bg-[#256B4F] px-4 text-sm font-semibold text-white hover:bg-[#1E5A42]">Send</button>
        </form>
      </aside>
      {reporting && <NewDispute conversationId={conversationId} me={me} onClose={() => setReporting(false)} />}
    </div>
  )
}