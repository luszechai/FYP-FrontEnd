import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, User, Clock, FileText, FileUp } from 'lucide-react'
import SourceLink from './SourceLink'
import CitationBadge from './CitationBadge'

function processContentWithCitations(children, sources) {
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
        parts.push(<CitationBadge key={`cite-${match.index}`} number={num} source={source} />)
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

function withCitations(Component, sources) {
  return ({ node, children, ...props }) => {
    const processed = processContentWithCitations(children, sources)
    return <Component {...props}>{processed}</Component>
  }
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
}

function RichContent({ content, sources }) {
  const citationOverrides = sources.length > 0
    ? {
        p: withCitations('p', sources),
        li: withCitations('li', sources),
        strong: withCitations('strong', sources),
        em: withCitations('em', sources),
        td: withCitations('td', sources),
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

const ChatMessage = React.memo(({ message }) => {
  const isUser = message.role === 'user'
  const isError = message.isError
  const sources = message.sources || []

  return (
    <div className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
      <div className={`p-2 rounded-full ${isUser ? 'bg-indigo-600' : 'bg-blue-600'}`}>
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>
      
      <div className={`flex-1 max-w-3xl ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
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
              : message.content
                ? <RichContent content={message.content} sources={sources} />
                : null
            }
          </div>
        </div>

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
                  <SourceLink key={`source-${idx}-${source.id || idx}`} source={source} index={idx + 1} />
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
