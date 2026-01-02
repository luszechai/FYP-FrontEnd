import React, { useState, useEffect } from 'react'
import { X, BarChart3, Clock, Target, TrendingUp, Settings } from 'lucide-react'
import { getStats, getEvaluationMethods } from '../services/api'

const StatsModal = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
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
      const data = await getStats(evaluationMethod, threshold)
      setStats(data)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Session Statistics</h2>
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
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6">
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
          ) : stats && stats.total_queries > 0 ? (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Total Queries</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{stats.total_queries}</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Hit Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{stats.hit_rate.toFixed(1)}%</p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-600">Avg Response</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{stats.avg_response_time.toFixed(2)}s</p>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium text-gray-600">Avg Similarity</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{stats.avg_similarity.toFixed(3)}</p>
                </div>
              </div>

              {/* Recent Queries */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Queries</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats.metrics.slice(-10).reverse().map((metric, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{metric.query}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>Category: {metric.category}</span>
                            <span>Time: {metric.response_time.toFixed(2)}s</span>
                            <span>Docs: {metric.num_docs}</span>
                            <span className={`px-2 py-0.5 rounded ${metric.hit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {metric.hit ? 'Hit' : 'Miss'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No statistics available yet.</p>
              <p className="text-sm text-gray-400 mt-2">Start asking questions to see statistics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StatsModal

