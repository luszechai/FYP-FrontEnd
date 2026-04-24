import React, { useMemo } from 'react'
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  METRIC_LABELS,
  METRIC_COLORS,
  formatScore,
  formatDelta,
  isNumber,
  deltaColorClass,
} from './utils'

/**
 * Executive-summary scorecard tile for one Ragas metric.
 * Shows:
 *   - the optimized-run value (big),
 *   - signed delta vs. the baseline run (colored),
 *   - a sparkline of this metric across prior saved runs.
 */
export default function ScorecardTile({
  metric,
  optimizedValue,
  baselineValue,
  history = [], // [{ id, label, timestamp, aggregate }]
}) {
  const label = METRIC_LABELS[metric] || metric
  const color = METRIC_COLORS[metric] || '#1f2937'

  const delta = useMemo(() => {
    if (!isNumber(optimizedValue) || !isNumber(baselineValue)) return null
    return optimizedValue - baselineValue
  }, [optimizedValue, baselineValue])

  const sparkData = useMemo(() => {
    return history
      .slice()
      .reverse()
      .filter((r) => isNumber(r?.aggregate?.[metric]))
      .map((r) => ({
        label: r.label || r.id,
        value: r.aggregate[metric],
        timestamp: r.timestamp,
      }))
  }, [history, metric])

  const deltaIcon =
    !isNumber(delta) || Math.abs(delta) < 0.0005 ? (
      <Minus className="w-3.5 h-3.5" />
    ) : delta > 0 ? (
      <TrendingUp className="w-3.5 h-3.5" />
    ) : (
      <TrendingDown className="w-3.5 h-3.5" />
    )

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm flex flex-col justify-between min-h-[110px]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5 tabular-nums">
            {formatScore(optimizedValue)}
          </p>
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-semibold tabular-nums ${deltaColorClass(delta)}`}
          title={
            isNumber(baselineValue)
              ? `Baseline: ${formatScore(baselineValue)}`
              : 'No baseline value'
          }
        >
          {deltaIcon}
          <span>{formatDelta(delta)}</span>
        </div>
      </div>

      <div className="h-8 mt-2">
        {sparkData.length >= 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={sparkData}
              margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
            >
              <YAxis hide domain={[0, 1]} />
              <Tooltip
                cursor={false}
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 6,
                  padding: '4px 8px',
                  border: '1px solid #e5e7eb',
                }}
                formatter={(value) => [formatScore(value), label]}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.label || ''
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[10px] text-gray-400 italic">
            Need ≥2 saved runs to show a trend.
          </p>
        )}
      </div>
    </div>
  )
}
