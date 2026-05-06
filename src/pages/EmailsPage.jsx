import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, Loader2, Mail, Search } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getEmailHtml, getEmails } from '../services/api'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'scholarship', label: 'Scholarship' },
  { key: 'events', label: 'Events' },
  { key: 'Member Recruitment', label: 'Member Recruitment' },
  { key: 'Job Recruitment', label: 'Job Recruitment' },
  { key: 'workshop', label: 'Workshop' },
]

const BADGE_STYLES = {
  scholarship: 'bg-blue-100 text-blue-700 border-blue-200',
  events: 'bg-green-100 text-green-700 border-green-200',
  recruitment: 'bg-orange-100 text-orange-700 border-orange-200',
  'Member Recruitment': 'bg-amber-100 text-amber-700 border-amber-200',
  'Job Recruitment': 'bg-orange-100 text-orange-700 border-orange-200',
  workshop: 'bg-violet-100 text-violet-700 border-violet-200',
  other: 'bg-gray-100 text-gray-600 border-gray-200',
}

const BADGE_LABELS = {
  scholarship: 'Scholarship',
  events: 'Events',
  recruitment: 'Recruitment',
  'Member Recruitment': 'Member Recruitment',
  'Job Recruitment': 'Job Recruitment',
  workshop: 'Workshop',
  other: 'Other',
}

const CATEGORY_KEYS = new Set(Object.keys(BADGE_LABELS))
const CATEGORY_ORDER = TABS.map((t) => t.key)

function normalizeEmailTypes(values) {
  const deduped = []
  for (const value of values) {
    if (!value || value === 'all' || value === 'other' || !CATEGORY_KEYS.has(value)) continue
    if (!deduped.includes(value)) deduped.push(value)
  }
  return deduped.sort((a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b))
}

function getEmailBadgeTypes(email, fallbackType = 'other') {
  const rawTypes = Array.isArray(email?.types) ? email.types : []
  const types = normalizeEmailTypes([...rawTypes, email?.type, fallbackType])
  return types.length > 0 ? types : ['other']
}

function getEmailIdentity(email) {
  return email?.email_id || `${email?.subject || email?.name || 'untitled'}::${email?.date || ''}`
}

function getEmailSortTimestamp(email) {
  const raw = email?.date
  if (!raw || typeof raw !== 'string') return 0
  const ms = Date.parse(raw)
  return Number.isNaN(ms) ? 0 : ms
}

function decodeHtmlEntities(text) {
  if (typeof text !== 'string') return text
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function getEmailContentBodyOnly(content) {
  if (!content || typeof content !== 'string') return ''
  const sep = '\n\n---\n\n'
  const i = content.indexOf(sep)
  return i >= 0 ? content.slice(i + sep.length) : content
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true
    return window.matchMedia('(min-width: 1024px)').matches
  })

  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = () => setIsDesktop(mq.matches)
    handler()
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])

  return isDesktop
}

function EmailListItem({ email, isSelected, onClick }) {
  const badgeTypes = getEmailBadgeTypes(email, email.displayType)
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full text-left border rounded-xl px-4 py-3 transition-all flex items-start gap-3 group',
        isSelected
          ? 'border-blue-300 bg-blue-50/60 shadow-sm'
          : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300',
      ].join(' ')}
      aria-current={isSelected ? 'true' : 'false'}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {badgeTypes.map((t) => (
            <span
              key={t}
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                BADGE_STYLES[t] || BADGE_STYLES.other
              }`}
            >
              {BADGE_LABELS[t] || BADGE_LABELS.other}
            </span>
          ))}
          {email.date && <span className="text-[11px] text-gray-400 shrink-0">{email.date}</span>}
        </div>
        <h3 className="text-sm font-semibold text-gray-900 truncate">{email.name || email.subject || 'Untitled'}</h3>
        {(email.introduction || email.details) && (
          <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{email.introduction || email.details}</p>
        )}
      </div>
      <span className="text-xs text-gray-300 group-hover:text-gray-500 transition-colors mt-1" aria-hidden="true">
        ↵
      </span>
    </button>
  )
}

function OriginalHtmlViewer({ emailId }) {
  const [html, setHtml] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const iframeRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await getEmailHtml(emailId)
        if (!cancelled) setHtml(data)
      } catch (err) {
        console.error('Error loading HTML:', err)
        if (!cancelled) setError('Failed to load original HTML.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [emailId])

  const handleIframeLoad = () => {
    const iframe = iframeRef.current
    if (iframe?.contentDocument?.body) {
      const h = iframe.contentDocument.body.scrollHeight
      iframe.style.height = Math.min(h + 32, 700) + 'px'
    }
  }

  const renderedHtml = html ? `<base href="${API_BASE_URL}"><style>body{margin:12px;font-family:sans-serif;}</style>${html}` : ''

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-gray-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading original email...
      </div>
    )
  }
  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <iframe
        ref={iframeRef}
        srcDoc={renderedHtml}
        onLoad={handleIframeLoad}
        className="w-full border-0"
        style={{ minHeight: '260px', maxHeight: '700px' }}
        sandbox="allow-same-origin"
        title="Original email"
      />
    </div>
  )
}

function EmailDetail({ email, onBack }) {
  const badgeTypes = getEmailBadgeTypes(email, email.displayType)

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="shrink-0 border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 px-2 py-1.5 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
        <div>
          <div className="flex items-start gap-2 mb-2">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex-1 min-w-0 leading-snug">
              {email.name || email.subject || 'Untitled'}
            </h2>
            <div className="flex flex-wrap justify-end gap-1.5 shrink-0">
              {badgeTypes.map((t) => (
                <span
                  key={t}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                    BADGE_STYLES[t] || BADGE_STYLES.other
                  }`}
                >
                  {BADGE_LABELS[t] || BADGE_LABELS.other}
                </span>
              ))}
            </div>
          </div>
          {email.date && <p className="text-xs text-gray-400">{email.date}</p>}
        </div>

        {email.introduction && <p className="text-sm text-gray-700 leading-relaxed">{email.introduction}</p>}
        {email.details && <p className="text-sm text-gray-700 leading-relaxed">{email.details}</p>}

        {email.has_html && email.email_id ? (
          <OriginalHtmlViewer emailId={email.email_id} />
        ) : email.content ? (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Full Email Content</h4>
            <div className="bg-white border border-gray-200 rounded-xl p-4 max-h-[520px] overflow-y-auto text-sm text-gray-800 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-50 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-gray-200 [&_td]:px-2 [&_td]:py-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-blue-600 [&_a]:underline">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {decodeHtmlEntities(getEmailContentBodyOnly(email.content))}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No content available.</p>
        )}
      </div>
    </div>
  )
}

export default function EmailsPage() {
  const navigate = useNavigate()
  const { emailId: emailIdFromPath } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const isDesktop = useIsDesktop()

  const [emails, setEmails] = useState({})
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const activeTab = searchParams.get('tab') || 'all'
  const q = searchParams.get('q') || ''
  const openFromQuery = searchParams.get('open') || ''
  const selectedId = emailIdFromPath || openFromQuery || ''

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getEmails()
        setEmails(data.emails || {})
        setTotal(data.total || 0)
      } catch (err) {
        console.error('Error loading emails:', err)
        setError('Failed to load emails. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const mergedList = useMemo(() => {
    let list = []
    if (activeTab === 'all') {
      const unique = new Map()
      Object.entries(emails).forEach(([type, listPart]) => {
        listPart.forEach((email) => {
          const key = getEmailIdentity(email)
          const existing = unique.get(key)
          const displayType = getEmailBadgeTypes(email, type)[0]
          if (!existing) {
            unique.set(key, { ...email, displayType })
            return
          }
          unique.set(key, {
            ...existing,
            ...email,
            displayType: existing.displayType,
            types: normalizeEmailTypes([
              ...(Array.isArray(existing.types) ? existing.types : []),
              ...(Array.isArray(email.types) ? email.types : []),
              existing.type,
              email.type,
              existing.displayType,
              displayType,
            ]),
          })
        })
      })
      list = Array.from(unique.values())
    } else {
      list = (emails[activeTab] || []).map((e) => ({ ...e, displayType: activeTab }))
    }
    return list.sort((a, b) => getEmailSortTimestamp(b) - getEmailSortTimestamp(a))
  }, [emails, activeTab])

  const filteredList = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return mergedList
    return mergedList.filter((e) => {
      const hay = [
        e.name,
        e.subject,
        e.introduction,
        e.details,
        e.date,
        ...(Array.isArray(e.types) ? e.types : []),
        e.type,
        e.displayType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(query)
    })
  }, [mergedList, q])

  const selectedEmail = useMemo(() => {
    if (!selectedId) return null
    const found = mergedList.find(
      (e) => e.email_id === selectedId || e.source_id === selectedId || getEmailIdentity(e) === selectedId,
    )
    return found || null
  }, [mergedList, selectedId])

  useEffect(() => {
    if (!openFromQuery) return
    // normalize: once we successfully found, migrate to path on desktop for a cleaner URL
    if (!selectedEmail) return
    if (emailIdFromPath) return
    navigate(`/emails/${encodeURIComponent(selectedEmail.email_id || openFromQuery)}?${searchParams.toString()}`, {
      replace: true,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openFromQuery, selectedEmail])

  const setTab = (tabKey) => {
    const next = new URLSearchParams(searchParams)
    if (tabKey === 'all') next.delete('tab')
    else next.set('tab', tabKey)
    next.delete('open')
    setSearchParams(next, { replace: true })
    if (!isDesktop) navigate('/emails?' + next.toString(), { replace: true })
  }

  const setQuery = (value) => {
    const next = new URLSearchParams(searchParams)
    if (!value) next.delete('q')
    else next.set('q', value)
    setSearchParams(next, { replace: true })
  }

  const openEmail = (email) => {
    const id = email?.email_id || email?.source_id || getEmailIdentity(email)
    if (!id) return
    const next = new URLSearchParams(searchParams)
    next.delete('open')
    const url = `/emails/${encodeURIComponent(id)}?${next.toString()}`
    navigate(url)
  }

  const backToList = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('open')
    navigate(`/emails?${next.toString()}`, { replace: false })
  }

  const uniqueAllCount = useMemo(() => {
    const unique = new Set()
    Object.values(emails).forEach((listPart) => listPart.forEach((email) => unique.add(getEmailIdentity(email))))
    return unique.size || total
  }, [emails, total])

  const getTabCount = (key) => {
    if (key === 'all') return uniqueAllCount
    return (emails[key] || []).length
  }

  const showDetailOnlyMobile = !isDesktop && !!emailIdFromPath && selectedEmail

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="w-5 h-5 text-blue-600 shrink-0" />
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Emails</h1>
            {uniqueAllCount > 0 && <span className="text-sm text-gray-500">({uniqueAllCount})</span>}
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-sm font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
          >
            Back to Chat
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        {showDetailOnlyMobile ? (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[70vh]">
            <EmailDetail email={selectedEmail} onBack={backToList} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-4">
            <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[70vh] flex flex-col">
              <div className="shrink-0 border-b border-gray-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={q}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search emails…"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                      aria-label="Search emails"
                    />
                  </div>
                </div>
              </div>

              {!loading && !error && total > 0 && (
                <div className="shrink-0 border-b border-gray-200 px-2">
                  <div className="flex gap-1 overflow-x-auto -mb-px">
                    {TABS.map((tab) => {
                      const count = getTabCount(tab.key)
                      const isActive = activeTab === tab.key
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setTab(tab.key)}
                          className={[
                            'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                            isActive
                              ? 'border-blue-600 text-blue-700'
                              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300',
                          ].join(' ')}
                        >
                          {tab.label}
                          <span
                            className={[
                              'text-xs px-1.5 py-0.5 rounded-full',
                              isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600',
                            ].join(' ')}
                          >
                            {count}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div
                className="flex-1 overflow-y-auto p-3"
                role="listbox"
                aria-label="Email list"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (!filteredList.length) return
                  const currentIdx = Math.max(
                    0,
                    filteredList.findIndex((it) => getEmailIdentity(it) === getEmailIdentity(selectedEmail)),
                  )
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    const next = filteredList[Math.min(filteredList.length - 1, currentIdx + 1)]
                    if (next) openEmail(next)
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    const prev = filteredList[Math.max(0, currentIdx - 1)]
                    if (prev) openEmail(prev)
                  } else if (e.key === 'Enter') {
                    e.preventDefault()
                    const it = filteredList[currentIdx]
                    if (it) openEmail(it)
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    backToList()
                  }
                }}
              >
                {loading ? (
                  <div className="text-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                    <p className="mt-3 text-sm text-gray-500">Loading emails…</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-red-600 mb-3">{error}</p>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : filteredList.length > 0 ? (
                  <div className="space-y-2">
                    {filteredList.map((email) => {
                      const id = getEmailIdentity(email)
                      const selected = selectedEmail ? getEmailIdentity(selectedEmail) === id : false
                      return (
                        <EmailListItem
                          key={id}
                          email={email}
                          isSelected={selected}
                          onClick={() => openEmail(email)}
                        />
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">No emails found.</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {activeTab === 'all' ? 'No emails have been fetched and ingested yet.' : `No ${activeTab} emails available.`}
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[70vh]">
              {selectedEmail ? (
                <EmailDetail email={selectedEmail} onBack={backToList} />
              ) : (
                <div className="h-full flex items-center justify-center text-center p-8">
                  <div className="max-w-sm">
                    <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700">Select an email</p>
                    <p className="text-xs text-gray-500 mt-1">Choose one from the list to preview its details.</p>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

