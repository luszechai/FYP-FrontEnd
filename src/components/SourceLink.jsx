import React from 'react'
import { ExternalLink } from 'lucide-react'

const SourceLink = ({ source, index }) => {
  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('Source clicked:', source) // Debug log
    
    // If source has a URL, open it in a new tab
    if (source.source_url) {
      window.open(source.source_url, '_blank', 'noopener,noreferrer')
    } else {
      // Fallback: show alert if no URL available
      alert(`Source URL not available for ${source.source_name || `Document ${index}`}.\n\nThis might mean:\n- The source document doesn't have a URL in its metadata\n- The URL needs to be configured in the backend\n\nSource info: ${JSON.stringify(source, null, 2)}`)
    }
  }

  // Always make it clickable, but show different styles
  const hasUrl = !!source.source_url

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center space-x-1 px-1.5 py-0.5 rounded transition-colors relative z-10 ${
        hasUrl
          ? 'text-blue-600 hover:text-blue-800 hover:underline hover:bg-blue-50 cursor-pointer active:bg-blue-100'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 cursor-pointer active:bg-gray-200'
      }`}
      title={
        hasUrl
          ? `Click to open: ${source.source_name || `Document ${index}`} (${source.source_url})`
          : `Source URL not available. Click for details.`
      }
      style={{ pointerEvents: 'auto' }}
    >
      <ExternalLink className="w-3 h-3" />
      <span>Doc {index}</span>
    </button>
  )
}

export default SourceLink

