import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000, // 5 minutes timeout for longer responses
})

export const chat = async (query, useMemory = true, provider = null) => {
  const response = await api.post('/api/chat', {
    query,
    use_memory: useMemory,
    ...(provider && { provider }),
  })
  return response.data
}

export const chatStream = async (query, useMemory = true, { onMetadata, onChunk, onDone, onError, onStatus, provider } = {}) => {
  const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      use_memory: useMemory,
      ...(provider && { provider }),
    }),
  })

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() // keep incomplete trailing line in buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'status' && onStatus) {
            onStatus(data)
          } else if (data.type === 'metadata' && onMetadata) {
            onMetadata(data)
          } else if (data.type === 'chunk' && onChunk) {
            onChunk(data)
          } else if (data.type === 'done') {
            if (onDone) onDone(data)
            return data
          } else if (data.type === 'error') {
            if (onError) onError(data)
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

// ---- Emails ----

export const getEmails = async () => {
  const response = await api.get('/api/emails')
  return response.data
}

export const getEmailHtml = async (emailId) => {
  const response = await api.get(`/api/emails/${emailId}/html`, {
    transformResponse: [(data) => data],
  })
  return response.data
}

// ---- LLM Providers ----

export const getProviders = async () => {
  const response = await api.get('/api/providers')
  return response.data
}

// ---- RBS (Room Booking System) ----

export const rbsLogin = async (username, password) => {
  const response = await api.post('/api/rbs/login', { username, password })
  return response.data
}

export const rbsLogout = async () => {
  const response = await api.post('/api/rbs/logout')
  return response.data
}

export const rbsStatus = async () => {
  const response = await api.get('/api/rbs/status')
  return response.data
}

// ---- Evaluation Dashboard -------------------------------------------------

export const ALL_STRATEGIES_OFF = Object.freeze({
  use_reranker: false,
  use_adaptive: false,
  use_dedup: false,
  use_person_boost: false,
  use_hybrid: false,
  use_compression: false,
})

// Metric keys Ragas emits. Order matters for radar / scorecard rendering.
export const RAGAS_METRICS = Object.freeze([
  'faithfulness',
  'answer_relevancy',
  'context_precision',
  'context_recall',
])

export const getTestsetInfo = async (testsetPath = 'eval_testset.json') => {
  const response = await api.get('/api/ragas/testset', {
    params: { testset_path: testsetPath },
  })
  return response.data
}

export const runEvaluation = async ({
  strategies = ALL_STRATEGIES_OFF,
  label,
  maxQuestions,
  testsetPath = 'eval_testset.json',
} = {}) => {
  const response = await api.post('/api/ragas/run', {
    label,
    max_questions: maxQuestions,
    testset_path: testsetPath,
    strategies,
  })
  return response.data
}

export const streamEvaluationProgress = async ({
  strategies = ALL_STRATEGIES_OFF,
  label,
  maxQuestions,
  testsetPath = 'eval_testset.json',
  signal,
  onEvent,
  onError,
} = {}) => {
  const response = await fetch(`${API_BASE_URL}/api/ragas/run/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      label,
      max_questions: maxQuestions,
      testset_path: testsetPath,
      strategies,
    }),
    signal,
  })

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '')
    const err = new Error(`Evaluation stream failed: ${response.status} ${text}`)
    if (onError) onError(err)
    throw err
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalEvent = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const data = JSON.parse(line.slice(6))
        if (onEvent) onEvent(data)
        if (data.type === 'run_saved' || data.type === 'done') {
          finalEvent = data
        } else if (data.type === 'error') {
          if (onError) onError(data)
        }
      } catch (e) {
        console.error('Error parsing evaluation SSE:', e)
      }
    }
  }

  return finalEvent
}

export const listEvaluationRuns = async () => {
  const response = await api.get('/api/ragas/runs')
  return response.data
}

export const getEvaluationRun = async (runId) => {
  const response = await api.get(`/api/ragas/runs/${encodeURIComponent(runId)}`)
  return response.data
}

export default api

