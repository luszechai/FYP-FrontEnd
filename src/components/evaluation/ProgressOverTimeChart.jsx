import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  METRIC_ORDER,
  METRIC_LABELS,
  METRIC_COLORS,
  formatScore,
  formatTimestamp,
  strategyBadges,
} from './utils'

/**
 * Multi-line chart across every saved run from /api/ragas/runs, with one
 * line per Ragas metric. Tells the engineering-progress story:
 * e.g. V1 legacy chunking -> V2 baseline all-off -> V3 optimized.
 *
 * The X-axis is ordered oldest -> newest by timestamp so left-to-right
 * reads as time moving forward. Clicking any point on the chart loads
 * that run into the Optimized comparison panel.
 *
 * Props:
 *   runs         - summaries from /api/ragas/runs (newest-first).
 *   focusedIds   - run ids currently loaded into the comparison panels;
 *                  those points are drawn filled so they stand out.
 *   onPointClick - called with the run id when a data point is clicked.
 */
export default function ProgressOverTimeChart({
  runs = [],
  focusedIds = [],
  onPointClick,
}) {
  const focusedSet = useMemo(
    () => new Set(focusedIds.filter(Boolean)),
    [focusedIds],
  )

  const data = useMemo(() => {
    // Copy + sort ascending by timestamp so the chart reads left-to-right
    // as time moves forward. Falls back to the id (which embeds the
    // timestamp) when timestamp is missing.
    const sorted = runs
      .slice()
      .sort((a, b) => {
        const ta = a.timestamp || a.id || ''
        const tb = b.timestamp || b.id || ''
        if (ta < tb) return -1
        if (ta > tb) return 1
        return 0
      })

    // Disambiguate duplicate labels by suffixing (#2, #3, ...) so the
    // X-axis stays readable even if the user re-runs with the same label.
    const labelCounts = new Map()
    return sorted.map((r) => {
      const base = r.label || r.id
      const seen = (labelCounts.get(base) || 0) + 1
      labelCounts.set(base, seen)
      const axisLabel = seen > 1 ? `${base} #${seen}` : base
      return {
        id: r.id,
        axisLabel,
        label: r.label || r.id,
        timestamp: r.timestamp,
        strategies: r.strategies || {},
        questionCount: r.question_count,
        runtimeS: r.runtime_s,
        datasetFile: r.dataset_file,
        faithfulness: r.aggregate?.faithfulness,
        answer_relevancy: r.aggregate?.answer_relevancy,
        context_precision: r.aggregate?.context_precision,
        context_recall: r.aggregate?.context_recall,
      }
    })
  }, [runs])

  if (!data.length) {
    return (
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900">Progress Over Time</h3>
        <p className="text-xs text-gray-500 mt-2">
          No saved runs yet. Execute an evaluation to start building the story.
        </p>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Progress Over Time
          </h3>
          <p className="text-[11px] text-gray-500">
            {data.length} saved run{data.length === 1 ? '' : 's'} · click a
            point to load it into the Optimized panel.
          </p>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
            onClick={(e) => {
              const p = e?.activePayload?.[0]?.payload
              if (p?.id) onPointClick?.(p.id)
            }}
          >
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="axisLabel"
              tick={{ fontSize: 11, fill: '#475569' }}
              interval="preserveStartEnd"
              angle={-15}
              dy={8}
              height={60}
            />
            <YAxis
              domain={[0, 1]}
              tickCount={6}
              tick={{ fontSize: 11, fill: '#475569' }}
              tickFormatter={(v) => v.toFixed(1)}
            />
            <Tooltip
              cursor={{ stroke: '#cbd5e1', strokeDasharray: '3 3' }}
              content={<RunTooltip />}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value) => METRIC_LABELS[value] || value}
            />
            {METRIC_ORDER.map((metric) => (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                stroke={METRIC_COLORS[metric]}
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props
                  const focused = focusedSet.has(payload.id)
                  return (
                    <circle
                      key={`${metric}-${payload.id}`}
                      cx={cx}
                      cy={cy}
                      r={focused ? 5 : 3}
                      fill={focused ? METRIC_COLORS[metric] : '#fff'}
                      stroke={METRIC_COLORS[metric]}
                      strokeWidth={focused ? 2 : 1.5}
                      style={{ cursor: 'pointer' }}
                    />
                  )
                }}
                activeDot={{ r: 6, style: { cursor: 'pointer' } }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

/**
 * Custom recharts tooltip: the 4 metric values, plus the context a
 * reviewer actually needs to interpret a point — run label, timestamp,
 * active strategies, testset size, and runtime.
 */
function RunTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const row = payload[0]?.payload
  if (!row) return null

  const badges = strategyBadges(row.strategies)

  return (
    <div className="bg-white border border-gray-200 rounded-md shadow-md px-3 py-2 text-xs min-w-[200px]">
      <div className="font-semibold text-gray-900 truncate" title={row.label}>
        {row.label}
      </div>
      {row.timestamp && (
        <div className="text-[11px] text-gray-500 mt-0.5">
          {formatTimestamp(row.timestamp)}
        </div>
      )}

      <div className="mt-2 space-y-0.5">
        {METRIC_ORDER.map((metric) => (
          <div
            key={metric}
            className="flex items-center justify-between gap-3"
          >
            <span className="flex items-center gap-1.5 text-gray-700">
              <span
                className="inline-block w-2 h-2 rounded-sm"
                style={{ backgroundColor: METRIC_COLORS[metric] }}
              />
              {METRIC_LABELS[metric]}
            </span>
            <span className="tabular-nums font-medium text-gray-900">
              {formatScore(row[metric])}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-500 space-y-0.5">
        {badges.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {badges.map((b) => (
              <span
                key={b}
                className="inline-block bg-indigo-50 text-indigo-700 rounded px-1.5 py-0.5 text-[10px]"
              >
                {b}
              </span>
            ))}
          </div>
        ) : (
          <div className="italic">All strategies off</div>
        )}
        {(row.questionCount || row.runtimeS) && (
          <div className="tabular-nums">
            {row.questionCount ? `${row.questionCount} questions` : ''}
            {row.questionCount && row.runtimeS ? ' · ' : ''}
            {row.runtimeS ? `${row.runtimeS.toFixed(1)}s` : ''}
          </div>
        )}
      </div>
    </div>
  )
}
