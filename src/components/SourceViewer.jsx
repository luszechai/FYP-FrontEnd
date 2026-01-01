import React, { useState, useEffect } from 'react'
import { X, FileText, ExternalLink, Loader2 } from 'lucide-react'
import { getSource } from '../services/api'

const SourceViewer = ({ source, isOpen, onClose }) => {
  const [fullSource, setFullSource] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen && source) {
      // If full document is already in source, use it
      if (source.full_document) {
        setFullSource({
          content: source.full_document,
          section: source.section,
          source_file: source.source_file,
          metadata: source.metadata
        })
      } else if (source.source_id) {
        // Fetch full source from API
        loadFullSource()
      }
    }
  }, [isOpen, source])

  const loadFullSource = async () => {
    if (!source.source_id) return
    
    setLoading(true)
    setError(null)
    
    try {
      const data = await getSource(source.source_id)
      setFullSource(data)
    } catch (err) {
      console.error('Error loading source:', err)
      setError('Failed to load source document')
      // Fallback to available content
      if (source.document) {
        setFullSource({
          content: source.document,
          section: source.section,
          source_file: source.source_file,
          metadata: source.metadata
        })
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const displayContent = fullSource?.content || source?.document || 'No content available'
  const section = fullSource?.section || source?.section || 'Unknown Section'
  const sourceFile = fullSource?.source_file || source?.source_file || ''

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {source.source_name || `Document ${source.rank || '?'}`}
              </h2>
              <p className="text-sm text-gray-500">
                {section} {sourceFile && `• ${sourceFile}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="ml-3 text-gray-600">Loading source document...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Section:</strong> {section}</p>
                  {sourceFile && <p><strong>Source File:</strong> {sourceFile}</p>}
                  {source.similarity && (
                    <p><strong>Relevance Score:</strong> {(source.similarity * 100).toFixed(1)}%</p>
                  )}
                </div>
              </div>
              <div className="whitespace-pre-wrap text-gray-800 bg-white p-4 rounded-lg border border-gray-200">
                {displayContent}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {fullSource?.total_chunks && (
              <span>Combined from {fullSource.total_chunks} chunk(s)</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default SourceViewer

