import React, { useState, useEffect } from 'react'
import { X, BarChart3, Clock, Target, TrendingUp } from 'lucide-react'
import { getStats } from '../services/api'

const StatsModal = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadStats()
    }
  }, [isOpen])

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await getStats()
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
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Session Statistics</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
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

