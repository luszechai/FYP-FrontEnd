import React, { useMemo } from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts'
import { Clock, Database, Settings2 } from 'lucide-react'
import {
  METRIC_ORDER,
  METRIC_LABELS,
  METRIC_SHORT,
  formatScore,
  formatTimestamp,
  strategyBadges,
  isNumber,
  BASELINE_COLOR,
  OPTIMIZED_COLOR,
} from './utils'

/**
 * One side (Baseline or Optimized) of the comparison view.
 * Renders a radar chart of the 4 Ragas metrics, the numeric scorecard list,
 * and a dropdown so the user can swap this panel to any saved run — this is
 * how chunking / dataset A/B comparisons are done after the fact.
 */
export default function RadarPanel({
  side = 'baseline', // 'baseline' | 'optimized'
  run,
  allRuns = [],
  onRunChange,
  loading = false,
}) {
  const color = side === 'optimized' ? OPTIMIZED_COLOR : BASELINE_COLOR
  const title = side === 'optimized' ? 'Optimized' : 'Baseline'
  const accent =
    side === 'optimized'
      ? 'bg-blue-50 border-blue-200 text-blue-700'
      : 'bg-slate-50 border-slate-200 text-slate-700'

  const radarData = useMemo(() => {
    const agg = run?.aggregate || {}
    return METRIC_ORDER.map((k) => ({
      metric: METRIC_SHORT[k] || k,
      fullName: METRIC_LABELS[k] || k,
      value: isNumber(agg[k]) ? agg[k] : 0,
      raw: agg[k],
    }))
  }, [run])

  const badges = useMemo(() => strategyBadges(run?.strategies), [run])

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
      <header className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide border ${accent}`}
          >
            {title}
          </span>
          <h3 className="text-sm font-semibold text-gray-800 truncate">
            {run?.label || '(no run selected)'}
          </h3>
        </div>

        <select
          className="text-xs bg-white border border-gray-300 rounded-md px-2 py-1 max-w-[200px] truncate focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={run?.id || ''}
          onChange={(e) => onRunChange?.(e.target.value)}
          disabled={!allRuns.length}
          title="Swap to any saved run for chunking/dataset comparisons"
        >
          <option value="">— select run —</option>
          {allRuns.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label || r.id}
            </option>
          ))}
        </select>
      </header>

      <div className="px-4 pt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
        {run?.timestamp && (
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formatTimestamp(run.timestamp)}
          </span>
        )}
        {isNumber(run?.chunk_count) && (
          <span className="inline-flex items-center gap-1">
            <Database className="w-3 h-3" /> {run.chunk_count} chunks
          </span>
        )}
        {run?.llm_provider && (
          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px]">
            {(run.llm_provider === 'kimi' ? 'Kimi' : 'DeepSeek')}
            {run.llm_model ? `: ${run.llm_model}` : ''}
          </span>
        )}
        {badges.length > 0 ? (
          <span className="inline-flex items-center gap-1 flex-wrap">
            <Settings2 className="w-3 h-3" />
            {badges.map((b) => (
              <span
                key={b}
                className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px]"
              >
                {b}
              </span>
            ))}
          </span>
        ) : run ? (
          <span className="inline-flex items-center gap-1 text-gray-400">
            <Settings2 className="w-3 h-3" /> all strategies off
          </span>
        ) : null}
      </div>

      <div className="px-2 pt-3 pb-1 h-64">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-400">
            Loading...
          </div>
        ) : run ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="75%">
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fontSize: 11, fill: '#475569' }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 1]}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickCount={6}
              />
              <Radar
                name={title}
                dataKey="value"
                stroke={color}
                fill={color}
                fillOpacity={0.25}
                isAnimationActive={false}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-gray-400">
            No run selected.
          </div>
        )}
      </div>

      <div className="px-4 pb-4 pt-1">
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          {METRIC_ORDER.map((k) => (
            <li key={k} className="flex items-center justify-between">
              <span className="text-gray-600 truncate" title={METRIC_LABELS[k]}>
                {METRIC_LABELS[k]}
              </span>
              <span className="font-semibold text-gray-900 tabular-nums">
                {formatScore(run?.aggregate?.[k])}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
