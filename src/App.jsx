import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Trash2, BarChart3, History, Loader2, Bot, User, Paperclip, X, FileUp, DoorOpen, LogOut } from 'lucide-react'
import ChatMessage from './components/ChatMessage'
import StatsModal from './components/StatsModal'
import HistoryModal from './components/HistoryModal'
import RbsLoginModal from './components/RbsLoginModal'
import { chatStream, clearMemory, getStats, getHistory, uploadFile, removeFile, rbsLogout, rbsStatus, getProviders } from './services/api'

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [showStats, setShowStats] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [rbsLoggedIn, setRbsLoggedIn] = useState(false)
  const [rbsUsername, setRbsUsername] = useState('')
  const [showRbsLogin, setShowRbsLogin] = useState(false)
  const [providers, setProviders] = useState([])
  const [selectedProvider, setSelectedProvider] = useState('deepseek')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const chunkBufferRef = useRef('')
  const flushRafRef = useRef(null)
  const scrollRafRef = useRef(null)

  const ALLOWED_EXTENSIONS = '.pdf,.png,.jpg,.jpeg,.tiff,.bmp,.txt,.csv,.docx'
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
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
  }, [messages, scrollToBottom])

  // Clear upload error after 5 seconds
  useEffect(() => {
    if (uploadError) {
      const timer = setTimeout(() => setUploadError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [uploadError])

  // Sync RBS login state on mount
  useEffect(() => {
    rbsStatus()
      .then((data) => {
        setRbsLoggedIn(data.logged_in)
        setRbsUsername(data.username || '')
      })
      .catch(() => {})
  }, [])

  // Fetch available LLM providers on mount
  useEffect(() => {
    getProviders()
      .then((data) => {
        setProviders(data.providers || [])
        if (data.default) setSelectedProvider(data.default)
      })
      .catch(() => {})
  }, [])

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset the input so the same file can be re-selected
    e.target.value = ''

    // Client-side validations
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
      setUploadedFiles(prev => [...prev, {
        file_id: result.file_id,
        filename: result.filename,
        size: result.size,
        text_length: result.text_length,
      }])
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
      setUploadedFiles(prev => prev.filter(f => f.file_id !== fileId))
    } catch (error) {
      console.error('Error removing file:', error)
    }
  }

  const handleRbsLogout = async () => {
    try {
      await rbsLogout()
    } catch (err) {
      console.error('RBS logout error:', err)
    }
    setRbsLoggedIn(false)
    setRbsUsername('')
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)
    setLoadingStatus('Thinking...')

    // Add user message (include attached files for display)
    const newUserMessage = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      attachedFiles: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined
    }
    setMessages(prev => [...prev, newUserMessage])
    setUploadedFiles([])

    const botMessageId = Date.now() + 1

    try {
      chunkBufferRef.current = ''

      const flushBuffer = (msgId) => {
        if (!chunkBufferRef.current) return
        const text = chunkBufferRef.current
        chunkBufferRef.current = ''
        setMessages(prev =>
          prev.map(msg =>
            msg.id === msgId
              ? { ...msg, content: msg.content + text }
              : msg
          )
        )
      }

      await chatStream(userMessage, true, {
<<<<<<< Updated upstream
        onStatus: (data) => {
          setLoadingStatus(data.message || 'Processing...')
        },
=======
        provider: selectedProvider,
>>>>>>> Stashed changes
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
          setMessages(prev => [...prev, botMessage])
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
          setMessages(prev =>
            prev.map(msg =>
              msg.id === botMessageId
                ? { ...msg, performance: data.performance, isStreaming: false }
                : msg
            )
          )
        },
        onError: (data) => {
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === botMessageId)
            if (exists) {
              return prev.map(msg =>
                msg.id === botMessageId
                  ? { ...msg, content: data.message || 'An error occurred.', isError: true }
                  : msg
              )
            }
            return [...prev, {
              id: botMessageId,
              role: 'assistant',
              content: data.message || 'An error occurred.',
              timestamp: new Date(),
              isError: true,
            }]
          })
        },
      })
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => {
        const exists = prev.some(msg => msg.id === botMessageId)
        if (exists) {
          return prev.map(msg =>
            msg.id === botMessageId
              ? { ...msg, content: 'Sorry, I encountered an error. Please try again.', isError: true }
              : msg
          )
        }
        return [...prev, {
          id: botMessageId,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
          isError: true,
        }]
      })
    } finally {
      setLoading(false)
      setStreaming(false)
      setLoadingStatus('')
      inputRef.current?.focus()
    }
  }

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear the conversation history?')) {
      try {
        await clearMemory()
        setMessages([])
        setUploadedFiles([])
      } catch (error) {
        console.error('Error clearing memory:', error)
        alert('Failed to clear memory. Please try again.')
      }
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">SFU Admission Chatbot</h1>
              <p className="text-sm text-gray-500">Ask me anything about admissions</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {providers.length > 1 && (
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                title="Select AI Model"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}
            {rbsLoggedIn ? (
              <div className="flex items-center space-x-1">
                <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full hidden sm:inline-block">
                  RBS: {rbsUsername}
                </span>
                <button
                  onClick={handleRbsLogout}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Logout from RBS"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowRbsLogin(true)}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Room Booking Login"
              >
                <DoorOpen className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setShowHistory(true)}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View History"
            >
              <History className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowStats(true)}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View Statistics"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            <button
              onClick={handleClear}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Clear Conversation"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md mx-auto">
                <Bot className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to SFU Admission Chatbot</h2>
                <p className="text-gray-600 mb-6">
                  I can help you with questions about admissions, courses, programs, faculty, and more.
                </p>
                <div className="text-left space-y-2 text-sm text-gray-500">
                  <p className="font-semibold text-gray-700">Try asking:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>"What courses are available in Computer Science?"</li>
                    <li>"Tell me about admission requirements"</li>
                    <li>"What are the scholarship deadlines?"</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          
          {loading && !streaming && (
            <div className="flex items-start space-x-3">
              <div className="bg-blue-600 p-2 rounded-full">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 max-w-3xl">
                <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm space-y-3">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
                    <span className="text-sm text-blue-700 font-medium animate-pulse">
                      {loadingStatus || 'Thinking...'}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    <div className="h-3 bg-gray-100 rounded-full skeleton-shimmer w-full" />
                    <div className="h-3 bg-gray-100 rounded-full skeleton-shimmer w-11/12" style={{ animationDelay: '0.15s' }} />
                    <div className="h-3 bg-gray-100 rounded-full skeleton-shimmer w-4/5" style={{ animationDelay: '0.3s' }} />
                    <div className="h-3 bg-gray-100 rounded-full skeleton-shimmer w-9/12" style={{ animationDelay: '0.45s' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Upload error toast */}
          {uploadError && (
            <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center justify-between">
              <span>{uploadError}</span>
              <button onClick={() => setUploadError(null)} className="ml-2 text-red-400 hover:text-red-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Uploaded file badges */}
          {uploadedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.file_id}
                  className="flex items-center space-x-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs px-2.5 py-1.5 rounded-full"
                >
                  <FileUp className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="max-w-[150px] truncate" title={file.filename}>{file.filename}</span>
                  <button
                    onClick={() => handleFileRemove(file.file_id)}
                    className="text-blue-400 hover:text-red-500 transition-colors flex-shrink-0"
                    title="Remove file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSend} className="flex items-end space-x-3">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_EXTENSIONS}
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Paperclip button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || uploadedFiles.length >= MAX_FILES}
              className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={uploadedFiles.length >= MAX_FILES ? `Maximum ${MAX_FILES} files` : 'Attach a file'}
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </button>

            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend(e)
                  }
                }}
                placeholder="Ask a question about SFU admissions..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={1}
                disabled={loading}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Modals */}
      <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      <HistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} />
      <RbsLoginModal
        isOpen={showRbsLogin}
        onClose={() => setShowRbsLogin(false)}
        onLoginSuccess={(user) => {
          setRbsLoggedIn(true)
          setRbsUsername(user)
        }}
      />
    </div>
  )
}

export default App

