import React, { useState, useEffect } from 'react'
import {
  X,
  BarChart3,
  Clock,
  Target,
  TrendingUp,
  Settings,
  Activity,
  Timer,
  Zap,
  Inbox,
  Filter,
  MoreVertical,
} from 'lucide-react'
import { getStats, getEvaluationMethods } from '../services/api'

const AnalyticsCard = ({ label, value, subtext, icon: Icon, color }) => (
  <div className="bg-white border border-slate-200 p-6 rounded-xl hover:shadow-sm transition-all">
    <div className="flex items-center gap-3 mb-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={16} className="text-white" />
      </div>
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </span>
    </div>
    <div className="flex items-baseline gap-2">
      <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
      <span className="text-xs text-slate-400">{subtext}</span>
    </div>
  </div>
)

const StatsModal = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastFetchedAt, setLastFetchedAt] = useState(null)
  const [lastError, setLastError] = useState(null)
  const [evaluationMethod, setEvaluationMethod] = useState('max_similarity')
  const [threshold, setThreshold] = useState(0.5)
  const [evaluationMethods, setEvaluationMethods] = useState({})
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadEvaluationMethods()
      loadStats()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      loadStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluationMethod, threshold])

  const loadEvaluationMethods = async () => {
    try {
      const methods = await getEvaluationMethods()
      setEvaluationMethods(methods)
    } catch (error) {
      console.error('Error loading evaluation methods:', error)
    }
  }

  const loadStats = async () => {
    try {
      setLoading(true)
      setLastError(null)
      const data = await getStats(evaluationMethod, threshold)
      setStats(data)
      setLastFetchedAt(new Date())
    } catch (error) {
      console.error('Error loading stats:', error)
      const msg = error?.response?.data?.detail || error?.message || 'Failed to load statistics.'
      setLastError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const metaBadgeClass =
    'inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700'

  // Simulated processing load data (in a real app this would come from the API)
  const loadData = [40, 55, 42, 60, 85, 40, 30, 45, 60, 90, 70, 50, 40, 60, 55, 30, 45, 50, 65, 80]

  const nodes = [
    { name: 'Vancouver-01', status: 'Healthy', color: 'bg-emerald-500' },
    { name: 'Burnaby-Edge', status: 'Healthy', color: 'bg-emerald-500' },
    { name: 'Surrey-Central', status: 'Busy', color: 'bg-amber-500' },
    { name: 'Cloud-Gateway', status: 'Healthy', color: 'bg-emerald-500' },
  ]

  const kpi = [
    {
      label: 'Active Sessions',
      value: String(stats?.total_queries || 0),
      subtext: '+12% today',
      icon: Activity,
      color: 'bg-indigo-600',
    },
    {
      label: 'Response Time',
      value: `${((stats?.latency_p95 ?? 0)).toFixed(2)}s`,
      subtext: 'p99: 1.4s',
      icon: Timer,
      color: 'bg-violet-600',
    },
    {
      label: 'Citation Rate',
      value: `${((stats?.cited_answer_rate ?? 0)).toFixed(1)}%`,
      subtext: 'Optimized',
      icon: Zap,
      color: 'bg-amber-500',
    },
    {
      label: 'Avg Citations',
      value: ((stats?.avg_citations ?? 0)).toFixed(2),
      subtext: `${((stats?.avg_similarity ?? 0)).toFixed(3)} sim`,
      icon: Inbox,
      color: 'bg-slate-800',
    },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] min-h-0 my-auto overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-indigo-600 shrink-0" />
            <h2 className="text-xl font-bold text-slate-900">System Dashboard</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Evaluation Settings"
            >
              <Settings className="w-5 h-5 text-slate-500" />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Evaluation Settings Panel */}
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
                    {Object.entries(evaluationMethods).map(([key, description]) => (
                      <option key={key} value={key}>
                        {key.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))}
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
                {(evaluationMethod === 'strict' || evaluationMethod === 'lenient') && (
                  <p className="text-xs text-slate-500 italic">
                    Threshold is fixed for this method ({evaluationMethod === 'strict' ? '0.7' : '0.3'})
                  </p>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
              <p className="mt-4 text-slate-500">Loading statistics...</p>
            </div>
          ) : (
            <>
              {/* Filters bar */}
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">System Dashboard</h1>
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50">
                    <Filter size={14} /> Filters
                  </button>
                  <button
                    onClick={loadStats}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 rounded-lg text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
                  >
                    Generate Report
                  </button>
                </div>
              </div>

              {lastError && (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
                  {lastError}
                </div>
              )}

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpi.map((k) => (
                  <AnalyticsCard key={k.label} {...k} />
                ))}
              </div>

              {/* Processing Load + Nodes Status */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Processing Load Chart */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-800">Processing Load (Realtime)</h3>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full" /> CPU
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                        <div className="w-2 h-2 bg-slate-200 rounded-full" /> RAM
                      </div>
                    </div>
                  </div>
                  <div className="h-48 flex items-end justify-between gap-1">
                    {loadData.map((h, i) => (
                      <div key={i} className="flex-1 bg-slate-100 rounded-t-sm relative group">
                        <div
                          style={{ height: `${h}%` }}
                          className="bg-indigo-500/80 group-hover:bg-indigo-600 transition-all rounded-t-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Nodes Status */}
                <div className="bg-slate-900 rounded-xl p-6 text-white flex flex-col">
                  <h3 className="font-bold text-slate-200 mb-6 flex items-center gap-2">
                    <MoreVertical size={16} /> Nodes Status
                  </h3>
                  <div className="flex-1 space-y-4">
                    {nodes.map((node, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5"
                      >
                        <span className="text-xs font-medium text-slate-300">{node.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                            {node.status}
                          </span>
                          <div className={`w-1.5 h-1.5 rounded-full ${node.color}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Time breakdown (legacy data) */}
              {stats?.time_breakdown && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900">Latency Breakdown</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className={metaBadgeClass}>
                        Hit Rate=<span className="ml-1 font-mono">{((stats?.hit_rate ?? 0)).toFixed(1)}%</span>
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {['retrieval', 'generation', 'end_to_end'].map((key) => {
                      const avg = ((stats.time_breakdown?.[key]?.avg) ?? 0).toFixed(2)
                      const p95 = ((stats.time_breakdown?.[key]?.p95) ?? 0).toFixed(2)
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

              {/* Recent queries */}
              {stats?.metrics?.length > 0 && (
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
                        <div
                          key={metric.id || index}
                          className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                              {metric.query}
                            </p>
                            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                                  metric.cited_answer
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {metric.cited_answer ? 'Cited' : 'No cite'}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                                  metric.hit_by_method
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
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
              )}

              {/* Empty state */}
              {(!stats || (stats.total_queries || 0) === 0) && (
                <div className="text-center py-6">
                  <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-700 font-medium">No data yet</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Send a message in the chat to see session metrics.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default StatsModal
