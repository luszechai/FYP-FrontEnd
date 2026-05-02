import React, { useState } from 'react'
import SourcePopover from './SourcePopover'
import { getEmailSourceId } from './SourceLink'

const CitationBadge = ({ number, source, onOpenEmailSource }) => {
  const [hovered, setHovered] = useState(false)
  const emailSourceId = getEmailSourceId(source)

  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (emailSourceId && onOpenEmailSource) {
      onOpenEmailSource(emailSourceId)
    } else if (source?.source_url) {
      window.open(source.source_url, '_blank', 'noopener,noreferrer')
    } else {
      alert(`Source URL not available for Document ${number}.`)
    }
  }

  return (
    <span
      className="relative inline-block align-super"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold leading-none
          bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors cursor-pointer
          border border-blue-200 hover:border-blue-400 -translate-y-0.5"
      >
        {number}
      </button>

      {hovered && source && <SourcePopover source={source} position="top" />}
    </span>
  )
}

export default CitationBadge
