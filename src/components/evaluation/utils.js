// Shared helpers for the Evaluation Dashboard.
// Central place for metric labels, colors, strategy descriptions,
// and number-formatting so individual components stay lean.

export const METRIC_ORDER = [
  'faithfulness',
  'answer_relevancy',
  'context_precision',
  'context_recall',
]

export const METRIC_LABELS = {
  faithfulness: 'Faithfulness',
  answer_relevancy: 'Answer Relevancy',
  context_precision: 'Context Precision',
  context_recall: 'Context Recall',
}

export const METRIC_SHORT = {
  faithfulness: 'Faithful.',
  answer_relevancy: 'Answer Rel.',
  context_precision: 'Ctx. Prec.',
  context_recall: 'Ctx. Recall',
}

export const METRIC_COLORS = {
  faithfulness: '#2563eb',      // blue-600
  answer_relevancy: '#7c3aed',  // violet-600
  context_precision: '#0891b2', // cyan-600
  context_recall: '#059669',    // emerald-600
}

export const STRATEGY_ORDER = [
  'use_reranker',
  'use_adaptive',
  'use_dedup',
  'use_compression',
  'use_hybrid',
  'use_person_boost',
]

export const STRATEGY_META = {
  use_reranker: {
    label: 'Reranker',
    short: 'Reranker',
    tooltip:
      'Cross-encoder (BGE-reranker-base) re-scores top candidates for better relevance precision.',
  },
  use_adaptive: {
    label: 'Adaptive Config',
    short: 'Adaptive',
    tooltip:
      'Auto-tunes retrieval k, context window, and max-tokens based on query category.',
  },
  use_dedup: {
    label: 'Deduplication',
    short: 'Dedup',
    tooltip:
      'Drops duplicate chunks from the same parent document before reranking.',
  },
  use_compression: {
    label: 'Context Compression',
    short: 'Compress',
    tooltip:
      'LLM extracts only query-relevant sentences from each chunk before reranking.',
  },
  use_hybrid: {
    label: 'Hybrid Retrieval',
    short: 'Hybrid',
    tooltip:
      'Fuses BM25 keyword search with vector similarity + keyword-boosted strategies via RRF.',
  },
  use_person_boost: {
    label: 'Person Query Boost',
    short: 'Person',
    tooltip:
      'Expands person-related queries with name variations for better recall. Requires hybrid retrieval.',
  },
}

export const BASELINE_COLOR = '#64748b' // slate-500
export const OPTIMIZED_COLOR = '#2563eb' // blue-600

export function isNumber(v) {
  return typeof v === 'number' && Number.isFinite(v)
}

export function formatScore(value, digits = 3) {
  return isNumber(value) ? value.toFixed(digits) : '—'
}

export function formatDelta(value, digits = 3) {
  if (!isNumber(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}`
}

export function formatPercent(value, digits = 1) {
  if (!isNumber(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(digits)}%`
}

export function averageMetrics(aggregate = {}) {
  const vals = METRIC_ORDER
    .map((k) => aggregate?.[k])
    .filter(isNumber)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

export function strategyBadges(strategies = {}) {
  return STRATEGY_ORDER
    .filter((k) => strategies?.[k])
    .map((k) => STRATEGY_META[k]?.short || k)
}

export function deltaColorClass(delta) {
  if (!isNumber(delta) || Math.abs(delta) < 0.0005) return 'text-gray-500'
  return delta > 0 ? 'text-emerald-600' : 'text-rose-600'
}

export function formatTimestamp(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Pull one numeric score out of a Ragas per-question row. Ragas sometimes
// uses `answer_relevancy` or `semantic_similarity` style keys; we only care
// about the 4 standard metrics here.
export function perQuestionScore(row, metric) {
  const v = row?.scores?.[metric]
  return isNumber(v) ? v : null
}

export function averageRowScores(row) {
  if (!row) return null
  const vals = METRIC_ORDER.map((m) => perQuestionScore(row, m)).filter(isNumber)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}
