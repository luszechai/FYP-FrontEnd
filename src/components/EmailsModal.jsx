import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  X, Mail, GraduationCap, Calendar, Users, Briefcase, ExternalLink, Clock,
  DollarSign, FileText, AlertCircle, ChevronRight, ArrowLeft,
  ChevronDown, ChevronUp, Code, Image, ClipboardList, Globe,
  Instagram, AtSign, Link2, Loader2,
} from 'lucide-react'
import { getEmails, getEmailHtml } from '../services/api'

/** Decode common HTML entities in text (e.g. &amp; -> &) */
function decodeHtmlEntities(text) {
  if (typeof text !== 'string') return text
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/** Return only the body part of stored email content (after the first "---" separator) to avoid duplicating the structured header already shown above */
function getEmailContentBodyOnly(content) {
  if (!content || typeof content !== 'string') return ''
  const sep = '\n\n---\n\n'
  const i = content.indexOf(sep)
  return i >= 0 ? content.slice(i + sep.length) : content
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'scholarship', label: 'Scholarship', icon: GraduationCap },
  { key: 'events', label: 'Events', icon: Calendar },
  { key: 'Member Recruitment', label: 'Member Recruitment', icon: Users },
  { key: 'Job Recruitment', label: 'Job Recruitment', icon: Briefcase },
  { key: 'workshop', label: 'Workshop', icon: ClipboardList },
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

const LINK_CATEGORIES = {
  enrollment: { label: 'Enrollment / Registration', icon: ClipboardList },
  info: { label: 'Information', icon: Globe },
  social: { label: 'Social Media', icon: Instagram },
  contact: { label: 'Contact', icon: AtSign },
  other: { label: 'Other Links', icon: Link2 },
}

function EmailListItem({ email, onClick }) {
  const badgeStyle = BADGE_STYLES[email.type] || BADGE_STYLES.other
  const badgeLabel = BADGE_LABELS[email.type] || BADGE_LABELS.other

  return (
    <button
      onClick={onClick}
      className="w-full text-left border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-50 hover:border-gray-300 transition-all group flex items-center gap-3"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${badgeStyle}`}>
            {badgeLabel}
          </span>
          {email.date && (
            <span className="text-[11px] text-gray-400 shrink-0">{email.date}</span>
          )}
        </div>
        <h3 className="text-sm font-semibold text-gray-900 truncate">
          {email.name || email.subject || 'Untitled'}
        </h3>
        {(email.introduction || email.details) && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{email.introduction || email.details}</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
    </button>
  )
}

function GroupedLinks({ categorizedLinks }) {
  if (!categorizedLinks || categorizedLinks.length === 0) return null

  const groups = {}
  for (const lk of categorizedLinks) {
    const cat = lk.category || 'other'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(lk.url)
  }

  const order = ['enrollment', 'info', 'social', 'contact', 'other']

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Links</h4>
      {order.map((cat) => {
        const urls = groups[cat]
        if (!urls || urls.length === 0) return null
        const { label, icon: Icon } = LINK_CATEGORIES[cat] || LINK_CATEGORIES.other
        return (
          <div key={cat}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-600">{label}</span>
            </div>
            <div className="space-y-1 pl-5">
              {urls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  <span className="truncate">{url}</span>
                </a>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FlatLinks({ linksString }) {
  const links = linksString ? linksString.split('\n').filter(Boolean) : []
  if (links.length === 0) return null

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Links</h4>
      <div className="space-y-1.5">
        {links.map((link, i) => (
          <a
            key={i}
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{link}</span>
          </a>
        ))}
      </div>
    </div>
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
    return () => { cancelled = true }
  }, [emailId])

  const handleIframeLoad = () => {
    const iframe = iframeRef.current
    if (iframe?.contentDocument?.body) {
      const h = iframe.contentDocument.body.scrollHeight
      iframe.style.height = Math.min(h + 32, 600) + 'px'
    }
  }

  const renderedHtml = html
    ? `<base href="${API_BASE_URL}"><style>body{margin:8px;font-family:sans-serif;}</style>${html}`
    : ''

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-gray-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading original email...
      </div>
    )
  }

  if (error) return <p className="text-sm text-red-500">{error}</p>

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <iframe
        ref={iframeRef}
        srcDoc={renderedHtml}
        onLoad={handleIframeLoad}
        className="w-full border-0"
        style={{ minHeight: '200px', maxHeight: '600px' }}
        sandbox="allow-same-origin"
        title="Original email"
      />
    </div>
  )
}

function EmailDetailView({ email, onBack }) {
  const badgeStyle = BADGE_STYLES[email.type] || BADGE_STYLES.other
  const badgeLabel = BADGE_LABELS[email.type] || BADGE_LABELS.other

  const showSubject = email.subject && email.name && email.subject !== email.name
    && !email.subject.includes('=?')

  const hasCategorizedLinks = email.categorized_links && email.categorized_links.length > 0

  const metaRows = [
    { icon: Clock, label: 'Application Period', value: email.application_period },
    { icon: Clock, label: 'Event Period', value: email.event_period },
    { icon: Calendar, label: 'Time', value: email.time || email.event_time },
    { icon: DollarSign, label: 'Fees', value: email.fees },
    { icon: FileText, label: 'Requirements', value: email.requirements },
  ].filter((r) => r.value)

  return (
    <>
      <div className="shrink-0 border-b border-gray-200 px-4 sm:px-6 py-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors py-1 -ml-1 touch-manipulation"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-start gap-2 mb-2">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 flex-1 min-w-0 leading-snug">
              {email.name || email.subject || 'Untitled'}
            </h3>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${badgeStyle}`}>
              {badgeLabel}
            </span>
          </div>
          {showSubject && (
            <p className="text-xs text-gray-500 mb-1">Subject: {email.subject}</p>
          )}
          {email.date && (
            <p className="text-xs text-gray-400">{email.date}</p>
          )}
        </div>

        {/* Introduction / summary */}
        {email.introduction && (
          <p className="text-sm text-gray-700 leading-relaxed">{email.introduction}</p>
        )}
        {/* Details */}
        {email.details && (
          <p className="text-sm text-gray-700 leading-relaxed">{email.details}</p>
        )}

        {/* Structured metadata */}
        {metaRows.length > 0 && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
            {metaRows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 px-4 py-3">
                <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
                  <p className="text-sm text-gray-800">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Images */}
        {email.images && email.images.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5" />
              Images
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {email.images.map((url, i) => (
                <a
                  key={i}
                  href={`${API_BASE_URL}${url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <img
                    src={`${API_BASE_URL}${url}`}
                    alt={`Attachment ${i + 1}`}
                    className="w-full h-32 object-cover"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        {hasCategorizedLinks ? (
          <GroupedLinks categorizedLinks={email.categorized_links} />
        ) : (
          <FlatLinks linksString={email.links} />
        )}

        {/* Original email content */}
        {email.has_html && email.email_id ? (
          <OriginalHtmlViewer emailId={email.email_id} />
        ) : email.content ? (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Full Email Content</h4>
            <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-[400px] overflow-y-auto text-sm text-gray-800 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-50 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-gray-200 [&_td]:px-2 [&_td]:py-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-blue-600 [&_a]:underline">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {decodeHtmlEntities(getEmailContentBodyOnly(email.content))}
              </ReactMarkdown>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}

const EmailsModal = ({ isOpen, onClose }) => {
  const [emails, setEmails] = useState({})
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedEmail, setSelectedEmail] = useState(null)

  useEffect(() => {
    if (isOpen) {
      loadEmails()
      setSelectedEmail(null)
    }
  }, [isOpen])

  const loadEmails = async () => {
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

  const getFilteredEmails = () => {
    if (activeTab === 'all') {
      return Object.entries(emails).flatMap(([type, list]) =>
        list.map((e) => ({ ...e, type: e.type || type }))
      )
    }
    return (emails[activeTab] || []).map((e) => ({ ...e, type: e.type || activeTab }))
  }

  const getTabCount = (key) => {
    if (key === 'all') return total
    return (emails[key] || []).length
  }

  if (!isOpen) return null

  const filtered = getFilteredEmails()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] min-h-0 my-auto flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 shrink-0" />
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Fetched Emails</h2>
            {total > 0 && (
              <span className="text-xs sm:text-sm text-gray-500">({total})</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors touch-manipulation shrink-0"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {selectedEmail ? (
          <EmailDetailView
            email={selectedEmail}
            onBack={() => setSelectedEmail(null)}
          />
        ) : (
          <>
            {/* Tabs */}
            {!loading && !error && total > 0 && (
              <div className="shrink-0 border-b border-gray-200 px-4 sm:px-6">
                <div className="flex gap-1 overflow-x-auto -mb-px">
                  {TABS.map((tab) => {
                    const count = getTabCount(tab.key)
                    const isActive = activeTab === tab.key
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                          isActive
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {Icon && <Icon className="w-4 h-4" />}
                        {tab.label}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* List content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500">Loading emails...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <p className="text-red-600 mb-4">{error}</p>
                  <button
                    onClick={loadEmails}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : filtered.length > 0 ? (
                <div className="space-y-2">
                  {filtered.map((email, index) => (
                    <EmailListItem
                      key={`${email.subject}-${index}`}
                      email={email}
                      onClick={() => setSelectedEmail(email)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No emails found.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {activeTab === 'all'
                      ? 'No emails have been fetched and ingested yet.'
                      : `No ${activeTab} emails available.`}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default EmailsModal
