import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000, // 5 minutes timeout for longer responses
})

export const chat = async (query, useMemory = true) => {
  const response = await api.post('/api/chat', {
    query,
    use_memory: useMemory,
  })
  return response.data
}

export const chatStream = async (query, useMemory = true, onChunk) => {
  const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      use_memory: useMemory,
    }),
  })

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (onChunk) onChunk(data)
          if (data.type === 'done' || data.type === 'error') {
            return data
          }
        } catch (e) {
          console.error('Error parsing SSE data:', e)
        }
      }
    }
  }
}

export const clearMemory = async () => {
  const response = await api.post('/api/clear')
  return response.data
}

export const getStats = async (hitRateMethod = 'max_similarity', hitRateThreshold = 0.5) => {
  const response = await api.get('/api/stats', {
    params: {
      hit_rate_method: hitRateMethod,
      hit_rate_threshold: hitRateThreshold
    }
  })
  return response.data
}

export const getHistory = async () => {
  const response = await api.get('/api/history')
  return response.data
}

export const getSource = async (sourceId) => {
  const response = await api.get(`/api/sources/${sourceId}`)
  return response.data
}

export const evaluate = async (hitRateMethod = 'max_similarity', hitRateThreshold = 0.5) => {
  const response = await api.post('/api/evaluate', null, {
    params: {
      hit_rate_method: hitRateMethod,
      hit_rate_threshold: hitRateThreshold
    }
  })
  return response.data
}

export const getEvaluationMethods = async () => {
  const response = await api.get('/api/evaluation/methods')
  return response.data
}

export const uploadFile = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 120000, // 2 minutes for large file processing
  })
  return response.data
}

export const removeFile = async (fileId) => {
  const response = await api.delete(`/api/upload/${fileId}`)
  return response.data
}

export const getUploadedFiles = async () => {
  const response = await api.get('/api/upload')
  return response.data
}

export default api

