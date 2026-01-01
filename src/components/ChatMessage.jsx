import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, User, Clock, FileText } from 'lucide-react'

const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user'
  const isError = message.isError

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
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Customize heading styles
                h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-2 mt-4 first:mt-0" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-base font-semibold mb-1 mt-2 first:mt-0" {...props} />,
                // Customize list styles
                ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2 space-y-1" {...props} />,
                li: ({node, ...props}) => <li className="ml-2" {...props} />,
                // Customize paragraph
                p: ({node, ...props}) => <p className="mb-2 last:mb-0 whitespace-pre-wrap" {...props} />,
                // Customize strong/bold
                strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                // Customize emphasis/italic
                em: ({node, ...props}) => <em className="italic" {...props} />,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
        
        {message.performance && (
          <div className="mt-2 text-xs text-gray-500 flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{message.performance.total_time.toFixed(2)}s</span>
            </span>
            {message.sources && message.sources.length > 0 && (
              <span className="flex items-center space-x-1">
                <FileText className="w-3 h-3" />
                <span>{message.sources.length} source(s)</span>
              </span>
            )}
          </div>
        )}
        
        <div className="mt-1 text-xs text-gray-400">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

export default ChatMessage

