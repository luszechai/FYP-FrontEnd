import React, { useState, useEffect } from 'react'
import { X, BarChart3, Clock, Target, TrendingUp, Settings } from 'lucide-react'
import { getStats, getEvaluationMethods } from '../services/api'

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] min-h-0 my-auto overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between z-10 gap-2">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 shrink-0" />
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Session Statistics</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Evaluation Settings"
            >
              <Settings className="w-5 h-5 text-gray-500" />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {/* Evaluation Settings Panel */}
          {showSettings && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Evaluation Method</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Method
                  </label>
                  <select
                    value={evaluationMethod}
                    onChange={(e) => setEvaluationMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.entries(evaluationMethods).map(([key, description]) => (
                      <option key={key} value={key}>
                        {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                  {evaluationMethods[evaluationMethod] && (
                    <p className="mt-1 text-xs text-gray-500">
                      {evaluationMethods[evaluationMethod]}
                    </p>
                  )}
                </div>
                {evaluationMethod !== 'strict' && evaluationMethod !== 'lenient' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Similarity Threshold: {threshold}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={threshold}
                      onChange={(e) => setThreshold(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0.0</span>
                      <span>0.5</span>
                      <span>1.0</span>
                    </div>
                  </div>
                )}
                {(evaluationMethod === 'strict' || evaluationMethod === 'lenient') && (
                  <p className="text-xs text-gray-500 italic">
                    Threshold is fixed for this method ({evaluationMethod === 'strict' ? '0.7' : '0.3'})
                  </p>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading statistics...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Diagnostic header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Fetch</span>
                  <span className="ml-2">
                    {lastFetchedAt ? `Last fetched at ${lastFetchedAt.toLocaleString()}` : 'Not fetched yet'}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  method=<span className="font-mono">{evaluationMethod}</span> threshold=<span className="font-mono">{threshold}</span>
                </div>
              </div>
              {lastError && (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
                  {lastError}
                </div>
              )}

              {/* KPI cards (always render, even when total_queries==0) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">消息数</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{stats?.total_queries || 0}</p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-600">端到端延迟 P95</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    {((stats?.latency_p95 ?? 0)).toFixed(2)}s
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">有引用回答占比</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {((stats?.cited_answer_rate ?? 0)).toFixed(1)}%
                  </p>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium text-gray-600">平均引用数</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">
                    {((stats?.avg_citations ?? 0)).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Time breakdown */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">耗时拆分（retrieval vs generation）</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <p className="text-gray-500 mb-1">Retrieval</p>
                    <p className="font-semibold text-gray-900">
                      avg {(((stats?.time_breakdown?.retrieval?.avg) ?? 0)).toFixed(2)}s · p95 {(((stats?.time_breakdown?.retrieval?.p95) ?? 0)).toFixed(2)}s
                    </p>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <p className="text-gray-500 mb-1">Generation</p>
                    <p className="font-semibold text-gray-900">
                      avg {(((stats?.time_breakdown?.generation?.avg) ?? 0)).toFixed(2)}s · p95 {(((stats?.time_breakdown?.generation?.p95) ?? 0)).toFixed(2)}s
                    </p>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <p className="text-gray-500 mb-1">End-to-end</p>
                    <p className="font-semibold text-gray-900">
                      avg {(((stats?.time_breakdown?.end_to_end?.avg) ?? 0)).toFixed(2)}s · p95 {(((stats?.time_breakdown?.end_to_end?.p95) ?? 0)).toFixed(2)}s
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  额外：Hit Rate（{evaluationMethod}）= {((stats?.hit_rate ?? 0)).toFixed(1)}% · Avg similarity = {((stats?.avg_similarity ?? 0)).toFixed(3)}
                </p>
              </div>

              {/* Empty hint */}
              {(!stats || (stats.total_queries || 0) === 0) && (
                <div className="text-center py-6">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium">还没有数据</p>
                  <p className="text-sm text-gray-500 mt-1">从聊天窗口走 streaming 发 1 条消息后，这里会立刻出现 Session KPI。</p>
                </div>
              )}

              {/* Recent queries */}
              {stats?.metrics?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">最近请求</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {stats.metrics.slice(-10).reverse().map((metric, index) => (
                      <div key={metric.id || index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{metric.query}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                              <span>Category: {metric.category}</span>
                              <span>Time: {(metric.response_time ?? 0).toFixed(2)}s</span>
                              <span>Docs: {metric.num_docs ?? 0}</span>
                              <span>Cites: {metric.num_cited_sources ?? 0}</span>
                              <span className={`px-2 py-0.5 rounded ${metric.cited_answer ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                                {metric.cited_answer ? 'Cited' : 'No cite'}
                              </span>
                              <span className={`px-2 py-0.5 rounded ${metric.hit_by_method ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {metric.hit_by_method ? 'Hit' : 'Miss'}
                              </span>
                              {metric.status && metric.status !== 'success' && (
                                <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">
                                  {metric.status}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StatsModal

