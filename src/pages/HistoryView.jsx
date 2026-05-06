import React, { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, History, MessageSquarePlus, User } from 'lucide-react'

function formatTs(iso) {
  if (!iso) return ''
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return String(iso)
  return new Date(ms).toLocaleString()
}

export default function HistoryView({ conversations = [], onStartNewConversation }) {
  const [selectedId, setSelectedId] = useState('')

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
          <button
            type="button"
            onClick={() => onStartNewConversation?.()}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
          >
            <MessageSquarePlus className="w-4 h-4" />
            New Conversation
          </button>
        </div>

        {conversations.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">No archived conversations yet.</p>
            <p className="text-sm text-slate-500 mt-1">
              Start a chat, then click <span className="font-semibold">New Conversation</span> to archive it here.
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
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left p-4 border-b border-slate-100 transition-all ${
                        isActive ? 'bg-indigo-50/50 ring-1 ring-inset ring-indigo-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{c.title || 'Conversation'}</h4>
                        <span className="text-[10px] font-bold text-slate-400 shrink-0">
                          {formatTs(c.updatedAt || c.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{preview}</p>
                    </button>
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
                            <div className="prose prose-sm max-w-none text-slate-800">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || ''}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-slate-800 whitespace-pre-wrap break-words">{m.content || ''}</p>
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

