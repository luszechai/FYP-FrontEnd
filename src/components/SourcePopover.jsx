import React from 'react'
import { ExternalLink } from 'lucide-react'

const SourcePopover = ({ source, position = 'top' }) => {
  const snippet = source.document
    ? source.document.slice(0, 200) + (source.document.length > 200 ? '…' : '')
    : 'No preview available'

  const relevance = source.similarity
    ? `${(source.similarity * 100).toFixed(0)}%`
    : null

  return (
    <div
      className={`absolute z-50 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-gray-200 p-3 text-left text-sm
        ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="font-semibold text-gray-900 text-xs leading-tight line-clamp-2">
          {source.section || source.source_name || 'Unknown Section'}
        </span>
        {relevance && (
          <span className="shrink-0 text-[10px] font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
            {relevance} match
          </span>
        )}
      </div>

      <p className="text-gray-600 text-xs leading-relaxed mb-2 line-clamp-4">
        {snippet}
      </p>

      {source.source_url && (
        <div className="flex items-center gap-1 text-blue-600 text-[11px]">
          <ExternalLink className="w-3 h-3" />
          <span className="truncate">{source.source_url}</span>
        </div>
      )}

      {/* Arrow */}
      <div
        className={`absolute left-4 w-2.5 h-2.5 bg-white border-gray-200 transform rotate-45
          ${position === 'top'
            ? 'bottom-[-5px] border-b border-r'
            : 'top-[-5px] border-t border-l'
          }`}
      />
    </div>
  )
}

export default SourcePopover
