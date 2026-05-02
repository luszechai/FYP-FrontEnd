import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, User, Clock, FileText, FileUp, Calendar, Timer, DoorOpen, ExternalLink } from 'lucide-react'
import SourceLink from './SourceLink'
import CitationBadge from './CitationBadge'

function processContentWithCitations(children, sources, onOpenEmailSource) {
  if (!sources || sources.length === 0) return children

  return React.Children.map(children, (child) => {
    if (typeof child !== 'string') return child

    const parts = []
    const regex = /\[(\d+)\]/g
    let lastIndex = 0
    let match

    while ((match = regex.exec(child)) !== null) {
      const num = parseInt(match[1], 10)
      const source = sources[num - 1]

      if (match.index > lastIndex) {
        parts.push(child.slice(lastIndex, match.index))
      }

      if (source) {
        parts.push(
          <CitationBadge
            key={`cite-${match.index}`}
            number={num}
            source={source}
            onOpenEmailSource={onOpenEmailSource}
          />
        )
      } else {
        parts.push(match[0])
      }
      lastIndex = regex.lastIndex
    }

    if (lastIndex < child.length) {
      parts.push(child.slice(lastIndex))
    }

    return parts.length > 0 ? parts : child
  }).flat()
}

function withCitations(Component, sources, onOpenEmailSource) {
  return ({ node, children, ...props }) => {
    const processed = processContentWithCitations(children, sources, onOpenEmailSource)
    return <Component {...props}>{processed}</Component>
  }
}

function StatusTable({node, children, ...props}) {
  const tableRef = React.useRef(null)

  React.useLayoutEffect(() => {
    const table = tableRef.current
    if (!table) return
    const headers = table.querySelectorAll('thead th')
    let statusIdx = -1
    headers.forEach((th, i) => {
      if (th.textContent.trim().toLowerCase() === 'status') statusIdx = i
    })
    if (statusIdx < 0) return
    table.querySelectorAll('tbody tr').forEach(tr => {
      const cells = tr.querySelectorAll('td')
      const statusCell = cells[statusIdx]
      if (!statusCell) return
      const text = statusCell.textContent.trim().toLowerCase()
      tr.classList.remove('bg-green-50', 'bg-red-50')
      if (text === 'free' || text === '\u2013' || text === '-') {
        tr.classList.add('bg-green-50')
      } else if (text) {
        tr.classList.add('bg-red-50')
      }
    })
  })

  return (
    <div className="overflow-x-auto my-2">
      <table ref={tableRef} className="w-full border-collapse text-sm" {...props}>
        {children}
      </table>
    </div>
  )
}

const markdownComponents = {
  h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-2 mt-4 first:mt-0" {...props} />,
  h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0" {...props} />,
  h3: ({node, ...props}) => <h3 className="text-base font-semibold mb-1 mt-2 first:mt-0" {...props} />,
  ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />,
  ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2 space-y-1" {...props} />,
  li: ({node, ...props}) => <li className="ml-2" {...props} />,
  p: ({node, ...props}) => <p className="mb-2 last:mb-0 whitespace-pre-wrap" {...props} />,
  strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
  em: ({node, ...props}) => <em className="italic" {...props} />,
  table: StatusTable,
  tr: ({node, ...props}) => <tr {...props} />,
  th: ({node, ...props}) => (
    <th className="border border-gray-300 bg-gray-100 px-3 py-1.5 text-left font-semibold text-gray-700" {...props} />
  ),
  td: ({node, ...props}) => (
    <td className="border border-gray-300 px-3 py-1.5 text-gray-600" {...props} />
  ),
}

function RichContent({ content, sources, onOpenEmailSource }) {
  const citationOverrides = sources.length > 0
    ? {
        p: withCitations('p', sources, onOpenEmailSource),
        li: withCitations('li', sources, onOpenEmailSource),
        strong: withCitations('strong', sources, onOpenEmailSource),
        em: withCitations('em', sources, onOpenEmailSource),
        td: withCitations('td', sources, onOpenEmailSource),
      }
    : {}

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{ ...markdownComponents, ...citationOverrides }}
    >
      {content}
    </ReactMarkdown>
  )
}

function StreamingContent({ content }) {
  if (!content) {
    return <span className="inline-block w-2 h-4 bg-blue-500 rounded-sm animate-pulse" />
  }

  return (
    <>
      <span className="whitespace-pre-wrap">{content}</span>
      <span className="inline-block w-1.5 h-4 ml-0.5 bg-blue-500 rounded-sm animate-pulse align-text-bottom" />
    </>
  )
}

const ChatMessage = React.memo(({ message, onQuickReply, onOpenEmailSource }) => {
  const isUser = message.role === 'user'
  const isError = message.isError
  const sources = message.sources || []
  const isRbs = !isUser && message.enhanced_query && message.enhanced_query.is_rbs

  let mainContent = message.content
  let suggestedFollowUps = []

  if (isRbs && typeof message.content === 'string') {
    const lines = message.content.split(/\r?\n/)
    const idx = lines.findIndex((line) =>
      /suggested follow-up/i.test(line)
    )
    if (idx !== -1) {
      const before = lines.slice(0, idx)
      const after = lines.slice(idx + 1)
      const suggestions = []
      for (const line of after) {
        if (line.trim() === '') continue
        const bulletMatch = line.match(/^\s*(?:[-*]|\d+[.)]\s)\s*(.+)/)
          || line.match(/^\s{4,}(.+)/)
        if (bulletMatch) {
          const label = bulletMatch[1].trim()
          if (label) suggestions.push(label)
        } else {
          const text = line.trim()
          if (text.length <= 80 && !/[.!?]$/.test(text)) {
            suggestions.push(text)
          } else {
            break
          }
        }
      }
      if (suggestions.length > 0) {
        mainContent = before.join('\n')
        suggestedFollowUps = suggestions
      }
    }

  }

  const categorizeFollowUp = (label) => {
    const lower = label.toLowerCase()
    if (/\b(book\b|booking|reserve|link|details|occupied|schedule)/.test(lower))
      return 'action'
    if (/\b(am|pm)\b/.test(lower) || /\d{1,2}:\d{2}/.test(lower) || /hour/.test(lower))
      return 'time'
    if (/\b(mon|tue|wed|thu|fri|sat|sun|tomorrow|today|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4}-\d{2}-\d{2})\b/i.test(lower))
      return 'date'
    if (/\b(room\b|classroom|discussion|study|pod|lab)/.test(lower))
      return 'room'
    return 'default'
  }

  const followUpStyles = {
    time:    'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400',
    date:    'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400',
    room:    'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:border-purple-400',
    action:  'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-400',
    default: 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-gray-400',
  }

  const FollowUpIcon = ({ category }) => {
    const cls = "w-3 h-3 mr-1 flex-shrink-0"
    switch (category) {
      case 'time':   return <Timer className={cls} />
      case 'date':   return <Calendar className={cls} />
      case 'room':   return <DoorOpen className={cls} />
      case 'action': return <ExternalLink className={cls} />
      default:       return null
    }
  }

  return (
    <div className={`flex items-start gap-2 sm:gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`p-1.5 sm:p-2 rounded-full shrink-0 ${isUser ? 'bg-indigo-600' : 'bg-blue-600'}`}>
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>
      
      <div className={`flex-1 min-w-0 max-w-3xl ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div
          className={`rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm ${
            isUser
              ? 'bg-indigo-600 text-white rounded-tr-none'
              : isError
              ? 'bg-red-50 text-red-800 border border-red-200 rounded-tl-none'
              : 'bg-white text-gray-900 rounded-tl-none'
          }`}
        >
          <div className={`prose prose-sm max-w-none break-words ${
            isUser 
              ? 'prose-invert prose-headings:text-white prose-p:text-white prose-strong:text-white prose-ul:text-white prose-li:text-white prose-ol:text-white'
              : 'prose-gray'
          }`}>
            {message.isStreaming
              ? <StreamingContent content={message.content} />
              : mainContent
                ? (
                  <RichContent
                    content={mainContent}
                    sources={sources}
                    onOpenEmailSource={onOpenEmailSource}
                  />
                )
                : null
            }
          </div>
        </div>

        {!isUser && isRbs && suggestedFollowUps.length > 0 && onQuickReply && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestedFollowUps.map((label, idx) => {
              const category = categorizeFollowUp(label)
              return (
                <button
                  key={`${label}-${idx}`}
                  type="button"
                  onClick={() => onQuickReply(label)}
                  className={`inline-flex items-center px-2.5 py-1 text-xs rounded-full border transition-colors ${followUpStyles[category]}`}
                >
                  <FollowUpIcon category={category} />
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {/* File attachment indicator for user messages */}
        {isUser && message.attachedFiles && message.attachedFiles.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5 justify-end">
            {message.attachedFiles.map((file) => (
              <span
                key={file.file_id}
                className="inline-flex items-center space-x-1 bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full"
              >
                <FileUp className="w-3 h-3" />
                <span className="max-w-[120px] truncate">{file.filename}</span>
              </span>
            ))}
          </div>
        )}
        
        {message.performance && (
          <div className="mt-2 text-xs text-gray-500 flex items-center space-x-3 flex-wrap gap-2" style={{ zIndex: 1 }}>
            <span className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{message.performance.total_time.toFixed(2)}s</span>
            </span>
            {sources.length > 0 && (
              <div className="flex items-center space-x-2 flex-wrap gap-1" style={{ zIndex: 10, position: 'relative' }}>
                <span className="flex items-center space-x-1">
                  <FileText className="w-3 h-3" />
                  <span>Sources:</span>
                </span>
                {sources.slice(0, 5).map((source, idx) => (
                  <SourceLink
                    key={`source-${idx}-${source.id || idx}`}
                    source={source}
                    index={idx + 1}
                    onOpenEmailSource={onOpenEmailSource}
                  />
                ))}
                {sources.length > 5 && (
                  <span className="text-gray-400">+{sources.length - 5} more</span>
                )}
              </div>
            )}
          </div>
        )}
        
            <div className="mt-1 text-xs text-gray-400">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
})

ChatMessage.displayName = 'ChatMessage'

export default ChatMessage
