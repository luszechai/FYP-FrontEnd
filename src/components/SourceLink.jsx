import React, { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import SourcePopover from './SourcePopover'

const SourceLink = ({ source, index }) => {
  const [hovered, setHovered] = useState(false)

  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (source.source_url) {
      window.open(source.source_url, '_blank', 'noopener,noreferrer')
    } else {
      alert(
        `Source URL not available for ${source.source_name || `Document ${index}`}.\n\nThis might mean:\n- The source document doesn't have a URL in its metadata\n- The URL needs to be configured in the backend\n\nSource info: ${JSON.stringify(source, null, 2)}`
      )
    }
  }

  const hasUrl = !!source.source_url

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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
            ? `Click to open: ${source.source_name || `Document ${index}`}`
            : 'Source URL not available. Click for details.'
        }
        style={{ pointerEvents: 'auto' }}
      >
        <ExternalLink className="w-3 h-3" />
        <span>Doc {index}</span>
      </button>

      {hovered && <SourcePopover source={source} position="top" />}
    </span>
  )
}

export default SourceLink
