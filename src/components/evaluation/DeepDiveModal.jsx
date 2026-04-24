import React from 'react'
import { X } from 'lucide-react'
import {
  METRIC_ORDER,
  METRIC_LABELS,
  formatScore,
  formatDelta,
  deltaColorClass,
  isNumber,
  averageRowScores,
} from './utils'

/**
 * Per-question comparison modal. Side-by-side columns show:
 *   - the full question + ground-truth reference,
 *   - retrieved chunks for each run (with section + retrieval score),
 *   - the generated answer,
 *   - the 4 Ragas metric scores, with signed delta in between.
 */
export default function DeepDiveModal({
  row,
  baselineRun,
  optimizedRun,
  onClose,
}) {
  if (!row) return null

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl my-8 flex flex-col max-h-[90vh] overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
              Deep Dive
            </p>
            <h2 className="text-base font-semibold text-gray-900 mt-0.5">
              {row.question}
            </h2>
            {row.baselineRow?.reference && (
              <p className="text-[11px] text-gray-600 mt-1">
                <span className="font-semibold text-gray-700">Ground truth:</span>{' '}
                {row.baselineRow.reference}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-5 py-4 overflow-y-auto">
          <MetricsComparison row={row} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <Column
              title={baselineRun?.label || 'Baseline'}
              subtitle="Baseline run"
              accent="slate"
              row={row.baselineRow}
            />
            <Column
              title={optimizedRun?.label || 'Optimized'}
              subtitle="Optimized run"
              accent="blue"
              row={row.optimizedRow}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricsComparison({ row }) {
  const baseAvg = averageRowScores(row.baselineRow)
  const optAvg = averageRowScores(row.optimizedRow)

  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        Per-metric scores
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        {METRIC_ORDER.map((m) => {
          const b = row.baselineRow?.scores?.[m]
          const o = row.optimizedRow?.scores?.[m]
          const delta = isNumber(b) && isNumber(o) ? o - b : null
          return (
            <div
              key={m}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
            >
              <p className="text-[11px] text-gray-600 font-medium">
                {METRIC_LABELS[m]}
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs text-slate-600 tabular-nums">
                  {formatScore(b)}
                </span>
                <span className="text-xs text-gray-400">→</span>
                <span className="text-sm text-blue-700 tabular-nums font-semibold">
                  {formatScore(o)}
                </span>
              </div>
              <p
                className={`text-[11px] text-right mt-0.5 tabular-nums font-medium ${deltaColorClass(delta)}`}
              >
                {formatDelta(delta)}
              </p>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-gray-500 mt-2">
        Row average: baseline{' '}
        <span className="tabular-nums">{formatScore(baseAvg)}</span> · optimized{' '}
        <span className="tabular-nums font-semibold text-gray-900">
          {formatScore(optAvg)}
        </span>
        {isNumber(baseAvg) && isNumber(optAvg) && (
          <span className={`ml-1 ${deltaColorClass(optAvg - baseAvg)}`}>
            ({formatDelta(optAvg - baseAvg)})
          </span>
        )}
      </p>
    </section>
  )
}

function Column({ title, subtitle, accent, row }) {
  const accentCls =
    accent === 'blue'
      ? 'bg-blue-50 border-blue-200 text-blue-700'
      : 'bg-slate-50 border-slate-200 text-slate-700'

  return (
    <section className="border border-gray-200 rounded-lg flex flex-col min-h-[200px]">
      <header className={`px-3 py-2 border-b border-gray-200 ${accentCls}`}>
        <p className="text-[10px] uppercase tracking-wide font-semibold">
          {subtitle}
        </p>
        <p className="text-sm font-semibold truncate" title={title}>
          {title}
        </p>
      </header>

      {!row ? (
        <div className="flex-1 flex items-center justify-center text-xs text-gray-400 py-6">
          Question not present in this run.
        </div>
      ) : (
        <div className="px-3 py-3 space-y-3 text-xs">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium mb-1">
              Generated answer
            </p>
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed bg-white border border-gray-100 rounded p-2">
              {row.response || '(empty response)'}
            </p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium mb-1">
              Retrieved chunks ({row.retrieved_docs?.length || row.retrieved_contexts?.length || 0})
            </p>
            <div className="space-y-2">
              {(row.retrieved_docs || []).map((doc, i) => (
                <div
                  key={`${doc.id || i}`}
                  className="border border-gray-200 rounded bg-white"
                >
                  <div className="px-2 py-1 flex items-center justify-between text-[11px] bg-gray-50 border-b border-gray-200">
                    <span className="font-semibold text-gray-700">
                      #{i + 1} {doc.section ? `· ${doc.section}` : ''}
                    </span>
                    <span className="tabular-nums text-gray-500">
                      score {formatScore(doc.retrieval_score)}
                    </span>
                  </div>
                  <p className="px-2 py-1.5 text-gray-800 leading-relaxed whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                    {doc.document}
                  </p>
                </div>
              ))}

              {(!row.retrieved_docs || row.retrieved_docs.length === 0) &&
                (row.retrieved_contexts || []).map((txt, i) => (
                  <div key={i} className="border border-gray-200 rounded bg-white">
                    <div className="px-2 py-1 text-[11px] font-semibold bg-gray-50 border-b border-gray-200 text-gray-700">
                      #{i + 1}
                    </div>
                    <p className="px-2 py-1.5 text-gray-800 leading-relaxed whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                      {txt}
                    </p>
                  </div>
                ))}

              {(!row.retrieved_docs || row.retrieved_docs.length === 0) &&
                (!row.retrieved_contexts || row.retrieved_contexts.length === 0) && (
                  <p className="text-gray-400 italic">No chunks retrieved.</p>
                )}
            </div>
          </div>

          {isNumber(row.latency_s) && (
            <p className="text-[11px] text-gray-500">
              Pipeline latency:{' '}
              <span className="tabular-nums">{row.latency_s.toFixed(2)}s</span>
            </p>
          )}
        </div>
      )}
    </section>
  )
}
