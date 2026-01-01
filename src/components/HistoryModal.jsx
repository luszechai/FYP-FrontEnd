import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { X, History, User, Bot } from 'lucide-react'
import { getHistory } from '../services/api'

const HistoryModal = ({ isOpen, onClose }) => {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadHistory()
    }
  }, [isOpen])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const data = await getHistory()
      setHistory(data.history || [])
    } catch (error) {
      console.error('Error loading history:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <History className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Conversation History</h2>
            {history.length > 0 && (
              <span className="text-sm text-gray-500">({history.length} exchanges)</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading history...</p>
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-4">
              {history.map((exchange, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  {/* User Query */}
                  <div className="flex items-start space-x-3">
                    <div className="bg-indigo-600 p-2 rounded-full">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">User</p>
                      <p className="text-gray-700">{exchange.user_query}</p>
                    </div>
                  </div>

                  {/* Bot Response */}
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-600 p-2 rounded-full">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">Assistant</p>
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {exchange.bot_response}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No conversation history yet.</p>
              <p className="text-sm text-gray-400 mt-2">Start chatting to see your conversation history.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HistoryModal

