import React, { useMemo } from 'react'
import { Sparkles, TrendingUp, TrendingDown } from 'lucide-react'
import {
  METRIC_ORDER,
  METRIC_LABELS,
  formatPercent,
  formatScore,
  isNumber,
  averageMetrics,
  strategyBadges,
} from './utils'

/**
 * Auto-generated narrative that summarises "Optimized vs Baseline" across
 * the 4 Ragas metrics. Mirrors the "insightful analysis" text box that used
 * to live in the terminal-only evaluation output.
 */
export default function KeyTakeawayCard({ baseline, optimized }) {
  const summary = useMemo(() => {
    if (!baseline || !optimized) {
      return { headline: null, metricDeltas: [], toggles: [] }
    }

    const deltas = METRIC_ORDER
      .map((k) => {
        const a = baseline?.aggregate?.[k]
        const b = optimized?.aggregate?.[k]
        if (!isNumber(a) || !isNumber(b)) return null
        return { metric: k, baseline: a, optimized: b, delta: b - a }
      })
      .filter(Boolean)

    const sortedByAbs = [...deltas].sort(
      (x, y) => Math.abs(y.delta) - Math.abs(x.delta),
    )

    const avgBase = averageMetrics(baseline.aggregate)
    const avgOpt = averageMetrics(optimized.aggregate)

    let headline = null
    if (isNumber(avgBase) && isNumber(avgOpt)) {
      const diff = avgOpt - avgBase
      const pct = avgBase > 0 ? diff / avgBase : null
      const direction =
        Math.abs(diff) < 0.005
          ? 'matches'
          : diff > 0
            ? 'improves on'
            : 'regresses against'
      headline = {
        direction,
        diff,
        pct,
        avgBase,
        avgOpt,
      }
    }

    return {
      headline,
      metricDeltas: sortedByAbs,
      toggles: strategyBadges(optimized.strategies),
    }
  }, [baseline, optimized])

  if (!baseline || !optimized) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-2 text-gray-700">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold">Key Takeaway</h3>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Run an A/B evaluation or pick two saved runs to see the narrative.
        </p>
      </div>
    )
  }

  const { headline, metricDeltas, toggles } = summary
  const improvement =
    metricDeltas.length > 0 ? metricDeltas[0] : null
  const regression =
    metricDeltas.length > 1
      ? metricDeltas.filter((d) => d.delta < 0).sort((a, b) => a.delta - b.delta)[0]
      : null

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-100 shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2 text-indigo-700">
        <Sparkles className="w-4 h-4" />
        <h3 className="text-sm font-semibold">Key Takeaway</h3>
      </div>

      {headline && (
        <p className="text-sm text-gray-800 leading-relaxed">
          <span className="font-semibold">{optimized.label || 'Optimized'}</span>{' '}
          {headline.direction}{' '}
          <span className="font-semibold">
            {baseline.label || 'Baseline'}
          </span>{' '}
          on the overall Ragas score (
          <span className="tabular-nums font-semibold text-gray-900">
            {formatScore(headline.avgOpt)}
          </span>{' '}
          vs{' '}
          <span className="tabular-nums">{formatScore(headline.avgBase)}</span>
          {isNumber(headline.pct)
            ? `, ${formatPercent(headline.pct)} change`
            : ''}
          ).
        </p>
      )}

      {improvement && isNumber(improvement.delta) && (
        <p className="text-xs text-gray-700 flex items-start gap-1.5">
          {improvement.delta >= 0 ? (
            <TrendingUp className="w-3.5 h-3.5 mt-0.5 text-emerald-600 flex-shrink-0" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 mt-0.5 text-rose-600 flex-shrink-0" />
          )}
          <span>
            Biggest move:{' '}
            <span className="font-semibold">
              {METRIC_LABELS[improvement.metric]}
            </span>{' '}
            {improvement.delta >= 0 ? 'up' : 'down'} by{' '}
            <span className="tabular-nums font-semibold">
              {Math.abs(improvement.delta).toFixed(3)}
            </span>
            .
          </span>
        </p>
      )}

      {regression && regression !== improvement && (
        <p className="text-xs text-gray-700 flex items-start gap-1.5">
          <TrendingDown className="w-3.5 h-3.5 mt-0.5 text-rose-600 flex-shrink-0" />
          <span>
            Watch out:{' '}
            <span className="font-semibold">
              {METRIC_LABELS[regression.metric]}
            </span>{' '}
            dropped by{' '}
            <span className="tabular-nums font-semibold">
              {Math.abs(regression.delta).toFixed(3)}
            </span>
            .
          </span>
        </p>
      )}

      {toggles.length > 0 && (
        <p className="text-[11px] text-gray-500">
          Strategies enabled: {toggles.join(', ')}.
        </p>
      )}
    </div>
  )
}
