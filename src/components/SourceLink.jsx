import React, { useState } from 'react'
import { ExternalLink, Mail } from 'lucide-react'
import SourcePopover from './SourcePopover'

export function getEmailSourceId(source) {
  const metadata = source?.metadata || {}
  if (metadata.type !== 'email' && metadata.section !== 'email' && !String(source?.section || '').startsWith('email')) {
    return null
  }
  const fromMetadata = metadata.email_id || metadata.parent_doc_id || ''
  const fromSource = source?.source_id || source?.id || source?.source_file || ''
  const raw = String(fromMetadata || fromSource).trim()
  return raw.startsWith('email:') ? raw.slice('email:'.length) : raw
}

const SourceLink = ({ source, index, onOpenEmailSource }) => {
  const [hovered, setHovered] = useState(false)
  const emailSourceId = getEmailSourceId(source)
  const isEmailSource = !!emailSourceId

  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (isEmailSource && onOpenEmailSource) {
      onOpenEmailSource(emailSourceId)
    } else if (source.source_url) {
      window.open(source.source_url, '_blank', 'noopener,noreferrer')
    } else {
      console.warn('Source URL not available', { source, index })
    }
  }

  const hasUrl = !!source.source_url
  const Icon = isEmailSource ? Mail : ExternalLink

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
          isEmailSource
            ? 'text-blue-600 hover:text-blue-800 hover:underline hover:bg-blue-50 cursor-pointer active:bg-blue-100'
            : hasUrl
            ? 'text-blue-600 hover:text-blue-800 hover:underline hover:bg-blue-50 cursor-pointer active:bg-blue-100'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 cursor-pointer active:bg-gray-200'
        }`}
        title={
          isEmailSource
            ? `Click to open email: ${source.source_name || `Document ${index}`}`
            : hasUrl
            ? `Click to open: ${source.source_name || `Document ${index}`}`
            : 'Source URL not available. Click for details.'
        }
        style={{ pointerEvents: 'auto' }}
      >
        <Icon className="w-3 h-3" />
        <span>Doc {index}</span>
      </button>

      {hovered && <SourcePopover source={source} position="top" />}
    </span>
  )
}

export default SourceLink
