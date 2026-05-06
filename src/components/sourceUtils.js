export function getEmailSourceId(source) {
  const metadata = source?.metadata || {}
  if (
    metadata.type !== 'email' &&
    metadata.section !== 'email' &&
    !String(source?.section || '').startsWith('email')
  ) {
    return null
  }
  const fromMetadata = metadata.email_id || metadata.parent_doc_id || ''
  const fromSource = source?.source_id || source?.id || source?.source_file || ''
  const raw = String(fromMetadata || fromSource).trim()
  return raw.startsWith('email:') ? raw.slice('email:'.length) : raw
}

