import React, { useEffect, useState } from 'react'
import { BarChart3, Inbox, Loader2, Settings, Timer, Zap } from 'lucide-react'
import { getEvaluationMethods, getStats } from '../services/api'

const AnalyticsCard = ({ label, value, subtext, icon: Icon, color }) => (
  <div className="bg-white border border-slate-200 p-6 rounded-xl hover:shadow-sm transition-all">
    <div className="flex items-center gap-3 mb-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={16} className="text-white" />
      </div>
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
    <div className="flex items-baseline gap-2">
      <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
      {subtext ? <span className="text-xs text-slate-400">{subtext}</span> : null}
    </div>
  </div>
)

export default function StatsView() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastError, setLastError] = useState(null)
  const [evaluationMethod, setEvaluationMethod] = useState('max_similarity')
  const [threshold, setThreshold] = useState(0.5)
  const [evaluationMethods, setEvaluationMethods] = useState({})
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    getEvaluationMethods()
      .then((methods) => setEvaluationMethods(methods || {}))
      .catch(() => {})
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      setLastError(null)
      const data = await getStats(evaluationMethod, threshold)
      setStats(data)
    } catch (error) {
      const msg = error?.response?.data?.detail || error?.message || 'Failed to load statistics.'
      setLastError(msg)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluationMethod, threshold])

  const metaBadgeClass =
    'inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700'

  const kpi = [
    {
      label: 'Total Queries',
      value: String(stats?.total_queries || 0),
      subtext: '',
      icon: BarChart3,
      color: 'bg-indigo-600',
    },
    {
      label: 'Latency p95',
      value: `${(stats?.latency_p95 ?? 0).toFixed(2)}s`,
      subtext: stats?.avg_response_time ? `avg ${(stats.avg_response_time ?? 0).toFixed(2)}s` : '',
      icon: Timer,
      color: 'bg-violet-600',
    },
    {
      label: 'Cited Answer Rate',
      value: `${(stats?.cited_answer_rate ?? 0).toFixed(1)}%`,
      subtext: stats?.hit_rate_method ? `method=${stats.hit_rate_method}` : '',
      icon: Zap,
      color: 'bg-amber-500',
    },
    {
      label: 'Avg Citations',
      value: (stats?.avg_citations ?? 0).toFixed(2),
      subtext: stats?.avg_similarity ? `avg sim ${(stats.avg_similarity ?? 0).toFixed(3)}` : '',
      icon: Inbox,
      color: 'bg-slate-800',
    },
  ]

  return (
    <div className="h-full bg-slate-50 p-6 sm:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BarChart3 className="w-5 h-5 text-indigo-600 shrink-0" />
            <h1 className="text-2xl font-bold text-slate-900 truncate">System Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
              title="Evaluation Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={loadStats}
              className="px-3 py-2 bg-indigo-600 rounded-lg text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
            >
              Refresh
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Evaluation Settings</h3>
              <div className="flex flex-wrap items-center gap-2">
                <span className={metaBadgeClass}>
                  method=<span className="ml-1 font-mono">{evaluationMethod}</span>
                </span>
                {evaluationMethod !== 'strict' && evaluationMethod !== 'lenient' && (
                  <span className={metaBadgeClass}>
                    threshold=<span className="ml-1 font-mono">{threshold}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Method</label>
                <select
                  value={evaluationMethod}
                  onChange={(e) => setEvaluationMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {Object.keys(evaluationMethods).length > 0 ? (
                    Object.entries(evaluationMethods).map(([key, description]) => (
                      <option key={key} value={key} title={String(description || '')}>
                        {key.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="max_similarity">Max Similarity</option>
                      <option value="avg_similarity">Avg Similarity</option>
                      <option value="strict">Strict</option>
                      <option value="lenient">Lenient</option>
                    </>
                  )}
                </select>
                {evaluationMethods[evaluationMethod] && (
                  <p className="mt-1 text-xs text-slate-500">{evaluationMethods[evaluationMethod]}</p>
                )}
              </div>
              {evaluationMethod !== 'strict' && evaluationMethod !== 'lenient' && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Similarity Threshold: {threshold}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0.0</span>
                    <span>0.5</span>
                    <span>1.0</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
            <p className="mt-3 text-sm text-slate-500">Loading statistics…</p>
          </div>
        ) : lastError ? (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{lastError}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpi.map((k) => (
                <AnalyticsCard key={k.label} {...k} />
              ))}
            </div>

            {stats?.time_breakdown && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">Latency Breakdown</h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className={metaBadgeClass}>
                      Hit Rate=<span className="ml-1 font-mono">{(stats?.hit_rate ?? 0).toFixed(1)}%</span>
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {['retrieval', 'generation', 'end_to_end'].map((key) => {
                    const avg = ((stats.time_breakdown?.[key]?.avg ?? 0)).toFixed(2)
                    const p95 = ((stats.time_breakdown?.[key]?.p95 ?? 0)).toFixed(2)
                    return (
                      <div key={key} className="rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs font-medium text-slate-600">
                          {key === 'end_to_end' ? 'End-to-end' : key.charAt(0).toUpperCase() + key.slice(1)}
                        </p>
                        <div className="mt-2 flex items-baseline justify-between gap-3">
                          <span className="text-sm font-semibold text-slate-900">{avg}s</span>
                          <span className="text-xs text-slate-500">p95 {p95}s</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {Array.isArray(stats?.metrics) && stats.metrics.length > 0 ? (
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-base font-semibold text-slate-900">Recent Queries</h3>
                  <span className="text-xs text-slate-500">Max 10 shown</span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {stats.metrics
                    .slice(-10)
                    .reverse()
                    .map((metric, index) => (
                      <div key={metric.id || index} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{metric.query}</p>
                          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                                metric.cited_answer ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {metric.cited_answer ? 'Cited' : 'No cite'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                                metric.hit_by_method ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {metric.hit_by_method ? 'Hit' : 'Miss'}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>Category: {metric.category}</span>
                          <span>Time: {(metric.response_time ?? 0).toFixed(2)}s</span>
                          <span>Docs: {metric.num_docs ?? 0}</span>
                          <span>Cites: {metric.num_cited_sources ?? 0}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-700 font-medium">No data yet</p>
                <p className="text-sm text-slate-500 mt-1">Send a message in the chat to see session metrics.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

