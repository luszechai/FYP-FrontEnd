import React, { useMemo, useState } from 'react'
import { Search, Eye, AlertTriangle } from 'lucide-react'
import {
  averageRowScores,
  formatScore,
  formatDelta,
  deltaColorClass,
  isNumber,
} from './utils'

/**
 * Bottom-of-dashboard searchable table comparing per-question average
 * Ragas scores for the two currently-selected runs. "View Details" opens
 * the DeepDiveModal.
 *
 * Rows align on ``user_input`` text so a baseline row pairs with the
 * optimized row for the same question; if a row exists only on one side
 * (different testsets) we still surface it with a warning.
 */
export default function DeepDiveTable({
  baseline,
  optimized,
  onRowClick,
}) {
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const baseByQ = new Map()
    ;(baseline?.per_question || []).forEach((row) => {
      baseByQ.set(row.user_input, row)
    })

    const optByQ = new Map()
    ;(optimized?.per_question || []).forEach((row) => {
      optByQ.set(row.user_input, row)
    })

    const allQuestions = new Set([
      ...baseByQ.keys(),
      ...optByQ.keys(),
    ])

    const rowsArr = Array.from(allQuestions).map((q) => {
      const b = baseByQ.get(q) || null
      const o = optByQ.get(q) || null
      const bScore = averageRowScores(b)
      const oScore = averageRowScores(o)
      const delta =
        isNumber(bScore) && isNumber(oScore) ? oScore - bScore : null
      const improvementPct =
        isNumber(bScore) && isNumber(oScore) && bScore > 0
          ? (oScore - bScore) / bScore
          : null
      const orphan = !b || !o
      return {
        question: q,
        baselineRow: b,
        optimizedRow: o,
        baselineScore: bScore,
        optimizedScore: oScore,
        delta,
        improvementPct,
        orphan,
      }
    })

    return rowsArr
  }, [baseline, optimized])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = q
      ? rows.filter((r) => r.question.toLowerCase().includes(q))
      : rows
    return base
      .slice()
      .sort((a, b) => {
        if (!isNumber(a.delta) && !isNumber(b.delta)) return 0
        if (!isNumber(a.delta)) return 1
        if (!isNumber(b.delta)) return -1
        return b.delta - a.delta
      })
  }, [rows, search])

  if (!baseline || !optimized) {
    return (
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900">Deep Dive</h3>
        <p className="text-xs text-gray-500 mt-2">
          Select two runs (one in each comparison panel) to see per-question
          scores here.
        </p>
      </section>
    )
  }

  const testsetMismatch =
    baseline?.testset_hash &&
    optimized?.testset_hash &&
    baseline.testset_hash !== optimized.testset_hash

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
      <header className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Deep Dive</h3>
          <p className="text-[11px] text-gray-500">
            {filtered.length} of {rows.length} question
            {rows.length === 1 ? '' : 's'} · sorted by largest improvement.
          </p>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="text-xs pl-7 pr-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-60"
          />
        </div>
      </header>

      {testsetMismatch && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            The two runs were scored against different testsets. Rows that only
            exist on one side are marked below — compare totals in the radar
            panels, but per-question deltas may not be meaningful.
          </span>
        </div>
      )}

      <div className="overflow-x-auto overflow-y-auto max-h-[420px]">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-600 sticky top-0">
            <tr>
              <th className="text-left font-semibold px-4 py-2">Query</th>
              <th className="text-right font-semibold px-3 py-2 w-20">Baseline</th>
              <th className="text-right font-semibold px-3 py-2 w-20">Optimized</th>
              <th className="text-right font-semibold px-3 py-2 w-20">Δ</th>
              <th className="text-right font-semibold px-3 py-2 w-20">%</th>
              <th className="text-right font-semibold px-3 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((r, idx) => (
              <tr
                key={`${r.question}-${idx}`}
                className="hover:bg-blue-50/50 cursor-pointer"
                onClick={() => onRowClick?.(r)}
              >
                <td className="px-4 py-2 text-gray-800">
                  <div className="max-w-xl truncate" title={r.question}>
                    {r.question}
                  </div>
                  {r.orphan && (
                    <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-amber-700">
                      <AlertTriangle className="w-3 h-3" />
                      only in {r.baselineRow ? 'baseline' : 'optimized'}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatScore(r.baselineScore)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-900">
                  {formatScore(r.optimizedScore)}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums font-medium ${deltaColorClass(r.delta)}`}
                >
                  {formatDelta(r.delta)}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums ${deltaColorClass(r.delta)}`}
                >
                  {isNumber(r.improvementPct)
                    ? `${(r.improvementPct * 100).toFixed(1)}%`
                    : '—'}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-blue-700 hover:bg-blue-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRowClick?.(r)
                    }}
                  >
                    <Eye className="w-3 h-3" /> Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-gray-500">
            No questions match your search.
          </p>
        )}
      </div>
    </section>
  )
}
