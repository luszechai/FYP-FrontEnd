import React, { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, History, Play, Trash2, User } from 'lucide-react'

function formatTs(iso) {
  if (!iso) return ''
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return String(iso)
  return new Date(ms).toLocaleString()
}

export default function HistoryView({
  conversations = [],
  selectedConversationId,
  onResumeConversation,
  onDeleteConversation,
}) {
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    setSelectedId(String(selectedConversationId || '').trim())
  }, [selectedConversationId])

  const selected = useMemo(() => {
    if (!selectedId) return null
    return conversations.find((c) => c.id === selectedId) || null
  }, [conversations, selectedId])

  return (
    <div className="h-full bg-slate-50 p-6 sm:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <History className="w-5 h-5 text-indigo-600 shrink-0" />
            <h1 className="text-2xl font-bold text-slate-900 truncate">Conversation History</h1>
            {conversations.length > 0 && <span className="text-sm text-slate-500">({conversations.length})</span>}
          </div>
        </div>

        {conversations.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">No archived conversations yet.</p>
            <p className="text-sm text-slate-500 mt-1">
              Start chatting. When you want a fresh thread, click <span className="font-semibold">New Chat</span> in the sidebar.
            </p>
          </div>
        ) : (
          <div className="flex h-[calc(100vh-14rem)] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="w-96 border-r border-slate-200 bg-white flex flex-col shrink-0">
              <div className="flex-1 overflow-y-auto">
                {conversations.map((c) => {
                  const isActive = c.id === selectedId
                  const last = Array.isArray(c.messages) ? c.messages[c.messages.length - 1] : null
                  const preview =
                    (last?.content && String(last.content).slice(0, 100)) ||
                    (Array.isArray(c.messages) ? `${c.messages.length} messages` : '')
                  return (
                    <div
                      key={c.id}
                      className={`w-full text-left p-4 border-b border-slate-100 transition-all ${
                        isActive ? 'bg-indigo-50/50 ring-1 ring-inset ring-indigo-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className="w-full text-left"
                      >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{c.title || 'Conversation'}</h4>
                        <span className="text-[10px] font-bold text-slate-400 shrink-0">
                          {formatTs(c.updatedAt || c.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{preview}</p>
                      </button>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onResumeConversation?.(c.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          Resume
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteConversation?.(c.id)
                            if (selectedId === c.id) setSelectedId('')
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex-1 bg-white overflow-hidden">
              {selected ? (
                <div className="h-full overflow-y-auto p-6 sm:p-8">
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold text-slate-900 truncate">{selected.title || 'Conversation'}</h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Created: {formatTs(selected.createdAt)} · Updated: {formatTs(selected.updatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onResumeConversation?.(selected.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Resume chat
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteConversation?.(selected.id)
                          setSelectedId('')
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {(selected.messages || []).map((m) => (
                      <div key={m.id} className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                            m.role === 'user' ? 'bg-indigo-600' : 'bg-slate-900'
                          }`}
                        >
                          {m.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                            {m.role === 'user' ? 'User' : 'Assistant'}
                          </div>
                          {m.role === 'assistant' ? (
                            <div className="inline-block max-w-[85%] rounded-2xl rounded-tl-none bg-slate-50 text-slate-900 border border-slate-200 ring-1 ring-inset ring-slate-200/60 px-4 py-3 shadow-sm">
                              <div className="prose prose-sm max-w-none text-slate-800 break-words">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || ''}</ReactMarkdown>
                              </div>
                            </div>
                          ) : (
                            <div className="inline-block max-w-[85%] rounded-2xl rounded-tr-none bg-indigo-600 text-white px-4 py-3 shadow-sm">
                              <p className="whitespace-pre-wrap break-words">{m.content || ''}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 bg-white">
                  <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium tracking-tight text-slate-400">Select a conversation to view</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

