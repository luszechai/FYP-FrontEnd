import React, { useCallback, useEffect, useRef, useState } from 'react'
import { FileUp, Loader2, Paperclip, Send, Trash2, X } from 'lucide-react'
import ChatMessage from './components/ChatMessage'
import { chatStream, removeFile, uploadFile } from './services/api'

export default function ChatView({ selectedProvider, onOpenEmailSource, messages, setMessages, onClearConversation }) {
  const [localMessages, setLocalMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')

  const allMessages = messages || localMessages

  const [uploadedFiles, setUploadedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const chunkBufferRef = useRef('')
  const flushRafRef = useRef(null)
  const scrollRafRef = useRef(null)

  const ALLOWED_EXTENSIONS = '.pdf,.png,.jpg,.jpeg,.tiff,.bmp,.txt,.csv,.docx'
  const MAX_FILE_SIZE = 10 * 1024 * 1024
  const MAX_FILES = 5

  const scrollToBottom = useCallback(() => {
    if (scrollRafRef.current) return
    scrollRafRef.current = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      scrollRafRef.current = null
    })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [allMessages, scrollToBottom])

  useEffect(() => {
    if (!uploadError) return
    const timer = setTimeout(() => setUploadError(null), 5000)
    return () => clearTimeout(timer)
  }, [uploadError])

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (uploadedFiles.length >= MAX_FILES) {
      setUploadError(`Maximum of ${MAX_FILES} files allowed. Remove a file first.`)
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB.`)
      return
    }

    setUploading(true)
    setUploadError(null)
    try {
      const result = await uploadFile(file)
      setUploadedFiles((prev) => [
        ...prev,
        {
          file_id: result.file_id,
          filename: result.filename,
          size: result.size,
          text_length: result.text_length,
        },
      ])
    } catch (error) {
      const msg = error.response?.data?.detail || 'Failed to upload file. Please try again.'
      setUploadError(msg)
    } finally {
      setUploading(false)
    }
  }

  const handleFileRemove = async (fileId) => {
    try {
      await removeFile(fileId)
      setUploadedFiles((prev) => prev.filter((f) => f.file_id !== fileId))
    } catch (error) {
      console.error('Error removing file:', error)
    }
  }

  const sendMessage = useCallback(
    async (text) => {
      const userMessage = text.trim()
      if (!userMessage || loading) return

      setInput('')
      setLoading(true)
      setLoadingStatus('Thinking...')

      const newUserMessage = {
        id: Date.now(),
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
        attachedFiles: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined,
      }
      const setMsgs = setMessages || setLocalMessages
      setMsgs((prev) => [...prev, newUserMessage])
      setUploadedFiles([])

      const botMessageId = Date.now() + 1

      try {
        chunkBufferRef.current = ''

        const flushBuffer = (msgId) => {
          if (!chunkBufferRef.current) return
          const t = chunkBufferRef.current
          chunkBufferRef.current = ''
          const setMsgs = setMessages || setLocalMessages
          setMsgs((prev) =>
            prev.map((msg) => (msg.id === msgId ? { ...msg, content: msg.content + t } : msg)),
          )
        }

        await chatStream(userMessage, true, {
          provider: selectedProvider,
          onStatus: (data) => setLoadingStatus(data.message || 'Processing...'),
          onMetadata: (data) => {
            setStreaming(true)
            const botMessage = {
              id: botMessageId,
              role: 'assistant',
              content: '',
              timestamp: new Date(),
              sources: data.sources || [],
              enhanced_query: data.enhanced_query || {},
              isStreaming: true,
            }
            const setMsgs = setMessages || setLocalMessages
            setMsgs((prev) => [...prev, botMessage])
          },
          onChunk: (data) => {
            chunkBufferRef.current += data.content
            if (!flushRafRef.current) {
              flushRafRef.current = requestAnimationFrame(() => {
                flushRafRef.current = null
                flushBuffer(botMessageId)
              })
            }
          },
          onDone: (data) => {
            if (flushRafRef.current) {
              cancelAnimationFrame(flushRafRef.current)
              flushRafRef.current = null
            }
            flushBuffer(botMessageId)
            const setMsgs = setMessages || setLocalMessages
            setMsgs((prev) =>
              prev.map((msg) => {
                if (msg.id !== botMessageId) return msg
                const updates = { ...msg, performance: data.performance, isStreaming: false }
                if (data.sources) updates.sources = data.sources
                if (data.full_response) updates.content = data.full_response
                return updates
              }),
            )
          },
          onError: (data) => {
            const setMsgs = setMessages || setLocalMessages
            setMsgs((prev) => {
              const exists = prev.some((msg) => msg.id === botMessageId)
              if (exists) {
                return prev.map((msg) =>
                  msg.id === botMessageId
                    ? { ...msg, content: data.message || 'An error occurred.', isError: true }
                    : msg,
                )
              }
              return [
                ...prev,
                {
                  id: botMessageId,
                  role: 'assistant',
                  content: data.message || 'An error occurred.',
                  timestamp: new Date(),
                  isError: true,
                },
              ]
            })
          },
        })
      } catch (error) {
        console.error('Error:', error)
        const setMsgs = setMessages || setLocalMessages
        setMsgs((prev) => {
          const exists = prev.some((msg) => msg.id === botMessageId)
          if (exists) {
            return prev.map((msg) =>
              msg.id === botMessageId
                ? { ...msg, content: 'Sorry, I encountered an error. Please try again.', isError: true }
                : msg,
            )
          }
          return [
            ...prev,
            {
              id: botMessageId,
              role: 'assistant',
              content: 'Sorry, I encountered an error. Please try again.',
              timestamp: new Date(),
              isError: true,
            },
          ]
        })
      } finally {
        setLoading(false)
        setStreaming(false)
        setLoadingStatus('')
        inputRef.current?.focus()
      }
    },
    [loading, uploadedFiles, selectedProvider],
  )

  const handleSend = async (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to clear the conversation history?')) return
    if (onClearConversation) {
      await onClearConversation()
      return
    }
    const setMsgs = setMessages || setLocalMessages
    setMsgs([])
    setUploadedFiles([])
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-8 min-h-0">
        <div className="max-w-3xl mx-auto w-full">
          {allMessages.length === 0 ? (
            <div className="space-y-6 text-center py-10">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">How can I help you today?</h1>
              <p className="text-slate-500 text-lg max-w-md mx-auto">
                Ask about admission requirements, deadlines, scholarships, and ingested emails.
              </p>
            </div>
          ) : (
            <div className="space-y-8 pb-20">
              {allMessages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onQuickReply={(text) => sendMessage(text)}
                  onOpenEmailSource={onOpenEmailSource}
                />
              ))}

              {loading && !streaming && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded shrink-0 flex items-center justify-center text-xs font-bold text-slate-600">
                    AI
                  </div>
                  <div className="max-w-[85%] space-y-1">
                    <div className="inline-block px-4 py-3 rounded-xl text-sm leading-relaxed shadow-sm bg-slate-50 text-slate-800 border border-slate-200 rounded-tl-none">
                      <div className="flex items-center space-x-2 mb-2">
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                        <span className="text-sm text-indigo-700 font-medium animate-pulse">
                          {loadingStatus || 'Thinking...'}
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        <div className="h-3 bg-slate-100 rounded-full w-full shimmer" />
                        <div
                          className="h-3 bg-slate-100 rounded-full w-11/12 shimmer"
                          style={{ animationDelay: '0.15s' }}
                        />
                        <div
                          className="h-3 bg-slate-100 rounded-full w-4/5 shimmer"
                          style={{ animationDelay: '0.3s' }}
                        />
                        <div
                          className="h-3 bg-slate-100 rounded-full w-9/12 shimmer"
                          style={{ animationDelay: '0.45s' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      <div className="p-6 border-t border-slate-100 bg-white shadow-2xl shadow-slate-200 shrink-0">
        <div className="max-w-3xl mx-auto">
          {uploadError && (
            <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center justify-between">
              <span>{uploadError}</span>
              <button type="button" onClick={() => setUploadError(null)} className="ml-2 text-red-400 hover:text-red-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {uploadedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5 sm:gap-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.file_id}
                  className="flex items-center space-x-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full"
                >
                  <FileUp className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="max-w-[100px] sm:max-w-[150px] truncate" title={file.filename}>
                    {file.filename}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleFileRemove(file.file_id)}
                    className="text-indigo-400 hover:text-red-500 transition-colors flex-shrink-0"
                    title="Remove file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSend}>
            <div className="flex items-center gap-3 p-1.5 bg-[#F8FAFC] border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || uploadedFiles.length >= MAX_FILES}
                className="p-2.5 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_EXTENSIONS}
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend(e)
                  }
                }}
                placeholder="Ask a question about SFU admissions..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 outline-none"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="bg-indigo-600 text-white p-2.5 rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="p-2.5 text-slate-400 hover:text-red-500 transition-colors"
                title="Clear conversation"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

