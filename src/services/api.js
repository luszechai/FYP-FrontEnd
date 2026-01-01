import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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

export const getStats = async () => {
  const response = await api.get('/api/stats')
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

export default api

