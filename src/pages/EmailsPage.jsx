import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft,
  Loader2,
  Mail,
  Search,
  Inbox,
  MoreVertical,
  Trash2,
} from 'lucide-react'
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

const BADGE_LABELS = {
  scholarship: 'Scholarship',
  events: 'Events',
  recruitment: 'Recruitment',
  'Member Recruitment': 'Member Recruitment',
  'Job Recruitment': 'Job Recruitment',
  workshop: 'Workshop',
  other: 'Other',
}

const BADGE_STYLES = {
  scholarship: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  events: 'bg-sky-100 text-sky-700 ring-1 ring-sky-200',
  workshop: 'bg-violet-100 text-violet-700 ring-1 ring-violet-200',
  'Job Recruitment': 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  'Member Recruitment': 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200',
  recruitment: 'bg-orange-100 text-orange-800 ring-1 ring-orange-200',
  other: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
}

function getBadgeClass(type) {
  return BADGE_STYLES[type] || BADGE_STYLES.other
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

  const renderedHtml = html
    ? `<base href="${API_BASE_URL}"><style>body{margin:12px;font-family:sans-serif;}</style>${html}`
    : ''

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

// --- Inbox List Item (reference style) ---
function EmailListItem({ email, isSelected, onClick }) {
  const badgeTypes = getEmailBadgeTypes(email, email.displayType)
  const date = email.date || ''
  const badgeType = badgeTypes[0] || 'other'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-4 border-b border-slate-100 transition-all ${
        isSelected
          ? 'bg-indigo-50/50 ring-1 ring-inset ring-indigo-200'
          : 'hover:bg-slate-50'
      }`}
    >
      <div className="flex justify-between items-center mb-1">
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${getBadgeClass(badgeType)}`}
          title={BADGE_LABELS[badgeType] || badgeType}
        >
          {BADGE_LABELS[badgeType] || badgeType}
        </span>
        <span className="text-[10px] font-bold text-slate-400">{date}</span>
      </div>
      <h4 className="text-sm font-bold text-slate-800 line-clamp-1 mb-1">
        {email.name || email.subject || 'Untitled'}
      </h4>
      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
        {email.introduction || email.details || 'No preview available'}
      </p>
    </button>
  )
}

// --- Reading Pane (reference style) ---
function EmailDetail({ email, onBack }) {
  const badgeTypes = getEmailBadgeTypes(email, email.displayType)

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="shrink-0 border-b border-slate-200 px-4 sm:px-8 py-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1.5 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-red-600 border border-slate-200 rounded-lg hover:bg-red-50 transition-colors"
            title="Go back"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-12 px-8 space-y-5">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm">
              {email.sender?.[0] || 'S'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {badgeTypes.map((t) => (
                  <span
                    key={t}
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${getBadgeClass(t)}`}
                    title={BADGE_LABELS[t] || t}
                  >
                    {BADGE_LABELS[t] || t}
                  </span>
                ))}
                <span className="font-bold text-slate-900">Office</span>
              </div>
              {email.date && (
                <p className="text-xs text-slate-500 font-medium">
                  To: student-portal@sfu.ca
                </p>
              )}
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          {email.name || email.subject || 'Untitled'}
        </h1>

        <div className="prose prose-slate max-w-none space-y-4 text-slate-700 text-sm leading-relaxed">
          <p>Dear Student,</p>
          <p>{email.introduction || email.details || 'No content available.'}</p>
          {email.details && email.introduction && (
            <p>{email.details}</p>
          )}
          {badgeTypes.includes('events') || badgeTypes.includes('workshop') ? (
            <div className="my-8 p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <h5 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-widest">
                Event Details
              </h5>
              <p className="text-slate-600">
                Join us for this upcoming event. Check the original email for location and time.
              </p>
            </div>
          ) : null}
        </div>

        {email.has_html && email.email_id ? (
          <div className="mt-6">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Original Email
            </h4>
            <OriginalHtmlViewer emailId={email.email_id} />
          </div>
        ) : email.content ? (
          <div className="mt-6">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Full Email Content
            </h4>
            <div className="bg-white border border-slate-200 rounded-xl p-4 max-h-[520px] overflow-y-auto text-sm text-slate-800 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-50 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-indigo-600 [&_a]:underline">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {decodeHtmlEntities(getEmailContentBodyOnly(email.content))}
              </ReactMarkdown>
            </div>
          </div>
        ) : null}

        <p className="text-slate-600">
          Best Regards,
          <br />
          <span className="font-bold">SFU Global Services Team</span>
        </p>
      </div>
    </div>
  )
}

export default function EmailsPage({ embedded = false, selectedId: selectedIdProp = '', onSelectEmail, onRequestBack }) {
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
  const selectedId = embedded ? selectedIdProp || '' : emailIdFromPath || openFromQuery || ''

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

  useEffect(() => {
    if (!embedded) return
    if (!selectedIdProp) return
    const exists = mergedList.some(
      (e) =>
        e.email_id === selectedIdProp ||
        e.source_id === selectedIdProp ||
        getEmailIdentity(e) === selectedIdProp,
    )
    if (!exists) onSelectEmail?.('')
  }, [embedded, selectedIdProp, mergedList, onSelectEmail])

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
    if (embedded) return
    if (!openFromQuery) return
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
    if (!embedded && !isDesktop) navigate('/emails?' + next.toString(), { replace: true })
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
    if (embedded) {
      onSelectEmail?.(id)
      return
    }
    const next = new URLSearchParams(searchParams)
    next.delete('open')
    const url = `/emails/${encodeURIComponent(id)}?${next.toString()}`
    navigate(url)
  }

  const backToList = () => {
    if (embedded) {
      onSelectEmail?.('')
      return
    }
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

  const showDetailOnlyMobile = embedded ? false : !isDesktop && !!emailIdFromPath && selectedEmail

  return (
    <div className={embedded ? 'h-full bg-[#F8FAFC]' : 'min-h-screen bg-[#F8FAFC]'}>
      {!embedded && (
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Inbox className="w-5 h-5 text-indigo-600 shrink-0" />
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">Inbox</h1>
              {uniqueAllCount > 0 && <span className="text-sm text-slate-500">({uniqueAllCount})</span>}
            </div>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-sm font-medium text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors"
            >
              Back to Chat
            </button>
          </div>
        </header>
      )}

      <main className={embedded ? 'h-full p-4' : 'max-w-6xl mx-auto px-4 sm:px-6 py-4'}>
        {showDetailOnlyMobile ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[70vh]">
            <EmailDetail email={selectedEmail} onBack={backToList} />
          </div>
        ) : (
          <div
            className={`flex bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden ${
              embedded ? 'h-full' : 'h-[calc(100vh-8rem)]'
            }`}
          >
            {/* Inbox Sidebar */}
            <div className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0">
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <Search size={14} className="text-slate-400 shrink-0" />
                  <input
                    value={q}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search inbox..."
                    className="bg-transparent border-none focus:ring-0 text-xs w-full font-medium outline-none"
                  />
                </div>
              </div>

              {/* Tabs */}
              {!loading && !error && total > 0 && (
                <div className="shrink-0 border-b border-slate-100 px-2">
                  <div className="flex gap-1 overflow-x-auto -mb-px">
                    {TABS.map((tab) => {
                      const count = getTabCount(tab.key)
                      const isActive = activeTab === tab.key
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setTab(tab.key)}
                          className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                            isActive
                              ? 'border-indigo-600 text-indigo-700'
                              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                          }`}
                        >
                          {tab.label}
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Email List */}
              <div className="flex-1 overflow-y-auto" role="listbox" aria-label="Email list">
                {loading ? (
                  <div className="text-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                    <p className="mt-3 text-sm text-slate-500">Loading emails…</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-red-600 mb-3">{error}</p>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : filteredList.length > 0 ? (
                  <div>
                    {filteredList.map((email) => {
                      const id = getEmailIdentity(email)
                      const selected = selectedEmail
                        ? getEmailIdentity(selectedEmail) === id
                        : false
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
                    <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-600">No emails found.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {activeTab === 'all'
                        ? 'No emails have been fetched yet.'
                        : `No ${activeTab} emails available.`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Reading Pane */}
            <div className="flex-1 bg-white overflow-hidden">
              {selectedEmail ? (
                <EmailDetail email={selectedEmail} onBack={backToList} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 bg-white">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                    <Inbox size={32} />
                  </div>
                  <p className="text-sm font-medium tracking-tight text-slate-400">
                    Select an email to begin reading
                  </p>
                  {embedded && (
                    <button
                      type="button"
                      onClick={() => onRequestBack?.()}
                      className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors"
                    >
                      Back
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
