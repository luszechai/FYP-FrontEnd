import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X, FlaskConical, AlertCircle, RefreshCw } from 'lucide-react'
import {
  getTestsetInfo,
  listEvaluationRuns,
  getEvaluationRun,
  streamEvaluationProgress,
  ALL_STRATEGIES_OFF,
} from '../../services/api'
import StrategySidebar from './StrategySidebar'
import ScorecardTile from './ScorecardTile'
import RadarPanel from './RadarPanel'
import KeyTakeawayCard from './KeyTakeawayCard'
import ProgressOverTimeChart from './ProgressOverTimeChart'
import DeepDiveTable from './DeepDiveTable'
import DeepDiveModal from './DeepDiveModal'
import { METRIC_ORDER, STRATEGY_ORDER } from './utils'

const DEFAULT_STRATEGIES = {
  use_reranker: true,
  use_adaptive: true,
  use_dedup: true,
  use_compression: false,
  use_hybrid: true,
  use_person_boost: true,
}

/**
 * Full-screen Evaluation Dashboard overlay.
 *
 * Orchestrates the evaluation flow end-to-end:
 *   1. User picks strategy toggles in the sidebar (zero or more).
 *   2. "Execute Evaluation" runs a single evaluation with those toggles
 *      and streams per-question progress via SSE:
 *        - zero toggles → saved as a plain-chatbot Baseline run
 *        - any toggle   → saved as an Optimized run
 *      The Baseline only needs to be run once; it's reused automatically.
 *   3. On completion, the Baseline panel auto-loads the most recent all-off
 *      run and the Optimized panel auto-loads the newest strategy-enabled
 *      run; together they drive the Executive Summary, Progress Over Time
 *      chart, and Deep Dive table.
 *   4. The run-picker dropdowns on each panel let the user swap to any
 *      other saved run — this is the chunking/dataset A/B workflow.
 */
export default function EvaluationDashboard({ isOpen, onClose }) {
  const [strategies, setStrategies] = useState(DEFAULT_STRATEGIES)
  const [runLabel, setRunLabel] = useState('')
  const [maxQuestions, setMaxQuestions] = useState(10)
  const [testsetSize, setTestsetSize] = useState(null)
  const [testsetError, setTestsetError] = useState(null)

  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(null)
  const [runError, setRunError] = useState(null)

  const [runs, setRuns] = useState([])
  const [baselineRunId, setBaselineRunId] = useState(null)
  const [optimizedRunId, setOptimizedRunId] = useState(null)
  const [baselineRun, setBaselineRun] = useState(null)
  const [optimizedRun, setOptimizedRun] = useState(null)
  const [loadingRuns, setLoadingRuns] = useState(false)

  const [deepDiveRow, setDeepDiveRow] = useState(null)

  const abortRef = useRef(null)

  // Load testset size + runs list on open -----------------------------------
  const refreshRuns = useCallback(async () => {
    try {
      const data = await listEvaluationRuns()
      setRuns(data?.runs || [])
      return data?.runs || []
    } catch (err) {
      console.error('Failed to list runs:', err)
      return []
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false

    getTestsetInfo()
      .then((info) => {
        if (cancelled) return
        const total = info?.total_questions ?? null
        setTestsetSize(total)
        setTestsetError(null)
        setMaxQuestions((prev) => {
          if (!total) return prev
          return Math.min(Math.max(1, prev || 10), total)
        })
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Testset info error:', err)
        setTestsetError(
          err?.response?.data?.detail ||
            'Failed to load testset metadata. Run generate_testset.py first.',
        )
        setTestsetSize(null)
      })

    refreshRuns()
    return () => {
      cancelled = true
    }
  }, [isOpen, refreshRuns])

  // Auto-select sensible defaults for the two comparison panels whenever the
  // run list changes (first open, after a fresh run, after refresh). Baseline
  // prefers the most recent all-strategies-off run; Optimized prefers the
  // most recent run with at least one strategy enabled.
  useEffect(() => {
    if (!runs.length) return
    const isAllOff = (r) => STRATEGY_ORDER.every((k) => !r?.strategies?.[k])
    if (!baselineRunId) {
      const base = runs.find(isAllOff)
      if (base) setBaselineRunId(base.id)
    }
    if (!optimizedRunId) {
      const opt = runs.find((r) => !isAllOff(r))
      if (opt) setOptimizedRunId(opt.id)
    }
  }, [runs, baselineRunId, optimizedRunId])

  // Fetch full run detail when either panel selection changes ---------------
  useEffect(() => {
    if (!baselineRunId) {
      setBaselineRun(null)
      return
    }
    let cancelled = false
    setLoadingRuns(true)
    getEvaluationRun(baselineRunId)
      .then((data) => {
        if (!cancelled) setBaselineRun(data)
      })
      .catch((err) => {
        console.error('Failed to load baseline run:', err)
        if (!cancelled) setBaselineRun(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingRuns(false)
      })
    return () => {
      cancelled = true
    }
  }, [baselineRunId])

  useEffect(() => {
    if (!optimizedRunId) {
      setOptimizedRun(null)
      return
    }
    let cancelled = false
    setLoadingRuns(true)
    getEvaluationRun(optimizedRunId)
      .then((data) => {
        if (!cancelled) setOptimizedRun(data)
      })
      .catch((err) => {
        console.error('Failed to load optimized run:', err)
        if (!cancelled) setOptimizedRun(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingRuns(false)
      })
    return () => {
      cancelled = true
    }
  }, [optimizedRunId])

  // Close on Escape ---------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !running && !deepDiveRow) onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, running, deepDiveRow, onClose])

  // Cancel any in-flight stream on unmount / close --------------------------
  useEffect(() => {
    if (isOpen) return
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }, [isOpen])

  // Strategy & slider handlers ---------------------------------------------
  const handleToggleStrategy = (key) => {
    setStrategies((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleResetStrategies = () => {
    setStrategies({ ...ALL_STRATEGIES_OFF })
  }

  const anyEnabled = STRATEGY_ORDER.some((k) => strategies[k])
  const runIsBaseline = !anyEnabled

  const disabledReason = !testsetSize ? 'Testset unavailable' : null

  // Single-run execution ---------------------------------------------------
  const executeRun = useCallback(async () => {
    if (running) return

    const phaseLabel = runIsBaseline ? 'Baseline' : 'Optimized'

    setRunning(true)
    setRunError(null)
    setProgress({ phaseLabel, index: 0, total: maxQuestions })

    const abort = new AbortController()
    abortRef.current = abort

    const onEvent = (evt) => {
      if (!evt || typeof evt !== 'object') return
      switch (evt.type) {
        case 'question_started':
          setProgress({
            phaseLabel,
            index: evt.index,
            total: evt.total,
            currentQuestion: evt.question,
          })
          break
        case 'question_done':
          setProgress((prev) => ({
            ...(prev || {}),
            phaseLabel,
            index: evt.index,
            total: evt.total,
          }))
          break
        case 'ragas_started':
          setProgress((prev) => ({
            ...(prev || {}),
            phaseLabel,
            currentQuestion: 'Scoring with Ragas metrics...',
          }))
          break
        case 'error':
          setRunError(evt.detail || 'Evaluation failed.')
          break
        default:
          break
      }
    }

    const timestampLabel = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const label =
      (runLabel || '').trim() ||
      (runIsBaseline ? `Baseline ${timestampLabel}` : `Optimized ${timestampLabel}`)

    try {
      const final = await streamEvaluationProgress({
        strategies: runIsBaseline ? ALL_STRATEGIES_OFF : strategies,
        label,
        maxQuestions,
        signal: abort.signal,
        onEvent,
      })
      const newRunId = final?.run_id || null

      const freshRuns = await refreshRuns()

      if (runIsBaseline) {
        if (newRunId) setBaselineRunId(newRunId)
      } else {
        if (newRunId) setOptimizedRunId(newRunId)
        if (!baselineRunId) {
          const mostRecentBaseline = freshRuns.find((r) =>
            STRATEGY_ORDER.every((k) => !r?.strategies?.[k]),
          )
          if (mostRecentBaseline) setBaselineRunId(mostRecentBaseline.id)
        }
      }

      setProgress(null)
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error('Evaluation run failed:', err)
        setRunError(err?.message || 'Evaluation failed.')
      }
    } finally {
      setRunning(false)
      abortRef.current = null
    }
  }, [running, runIsBaseline, maxQuestions, strategies, runLabel, refreshRuns, baselineRunId])

  // Executive summary values -----------------------------------------------
  const scorecardHistory = useMemo(() => runs, [runs])

  const handlePointFocus = (runId) => {
    if (!runId) return
    setOptimizedRunId(runId)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
      {/* Header ------------------------------------------------------------ */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-600 p-2 rounded-lg">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">
              SFU Admission Chatbot Evaluation Dashboard
            </h1>
            <p className="text-xs text-gray-500 hidden sm:block">
              Ablation study: isolate query-time strategies, run Ragas, and prove "before vs after".
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshRuns}
            disabled={running}
            className="hidden sm:inline-flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md disabled:opacity-50"
            title="Refresh run list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md disabled:opacity-50"
            title={running ? 'Wait for the current run to finish' : 'Close (Esc)'}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Body -------------------------------------------------------------- */}
      <div className="flex-1 flex overflow-hidden">
        <StrategySidebar
          strategies={strategies}
          onToggleStrategy={handleToggleStrategy}
          maxQuestions={maxQuestions}
          onMaxQuestionsChange={setMaxQuestions}
          testsetSize={testsetSize}
          runLabel={runLabel}
          onRunLabelChange={setRunLabel}
          onExecute={executeRun}
          onReset={handleResetStrategies}
          running={running}
          progress={progress}
          canExecute={!!testsetSize}
          disabledReason={disabledReason}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
          {/* Errors -------------------------------------------------------- */}
          {(testsetError || runError) && (
            <div className="space-y-2">
              {testsetError && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{testsetError}</span>
                </div>
              )}
              {runError && (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">{runError}</div>
                  <button
                    className="text-rose-500 hover:text-rose-900"
                    onClick={() => setRunError(null)}
                    aria-label="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Empty state when nothing is selected yet ---------------------- */}
          {!baselineRun && !optimizedRun && !running && (
            <EmptyState runs={runs} onPickOptimized={setOptimizedRunId} onPickBaseline={setBaselineRunId} />
          )}

          {/* Executive Summary -------------------------------------------- */}
          {(baselineRun || optimizedRun) && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Executive Summary
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {METRIC_ORDER.map((metric) => (
                  <ScorecardTile
                    key={metric}
                    metric={metric}
                    optimizedValue={optimizedRun?.aggregate?.[metric]}
                    baselineValue={baselineRun?.aggregate?.[metric]}
                    history={scorecardHistory}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Comparison panels -------------------------------------------- */}
          {(baselineRun || optimizedRun || runs.length > 0) && (
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RadarPanel
                side="baseline"
                run={baselineRun}
                allRuns={runs}
                onRunChange={setBaselineRunId}
                loading={loadingRuns && !baselineRun}
              />
              <RadarPanel
                side="optimized"
                run={optimizedRun}
                allRuns={runs}
                onRunChange={setOptimizedRunId}
                loading={loadingRuns && !optimizedRun}
              />
            </section>
          )}

          {(baselineRun || optimizedRun) && (
            <KeyTakeawayCard baseline={baselineRun} optimized={optimizedRun} />
          )}

          {/* Progress over time ------------------------------------------- */}
          {runs.length > 0 && (
            <ProgressOverTimeChart
              runs={runs}
              focusedIds={[baselineRunId, optimizedRunId].filter(Boolean)}
              onPointClick={handlePointFocus}
            />
          )}

          {/* Deep dive ----------------------------------------------------- */}
          <DeepDiveTable
            baseline={baselineRun}
            optimized={optimizedRun}
            onRowClick={setDeepDiveRow}
          />
        </main>
      </div>

      {/* Deep Dive Modal -------------------------------------------------- */}
      {deepDiveRow && (
        <DeepDiveModal
          row={deepDiveRow}
          baselineRun={baselineRun}
          optimizedRun={optimizedRun}
          onClose={() => setDeepDiveRow(null)}
        />
      )}
    </div>
  )
}

/** Friendly empty state so the page isn't completely blank on first load. */
function EmptyState({ runs, onPickOptimized, onPickBaseline }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-start gap-3">
        <div className="bg-indigo-50 p-2 rounded-lg">
          <FlaskConical className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-gray-900">
            Ready to evaluate
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Start by running the chatbot with{' '}
            <span className="font-semibold">no strategies enabled</span> — that
            saves a reusable Baseline. Then enable any strategies you want to
            measure and click{' '}
            <span className="font-semibold">Execute Evaluation</span>; the new
            run lands in the Optimized panel next to the saved Baseline.
          </p>
          {runs.length > 0 && (
            <div className="mt-3 text-xs text-gray-600">
              <p className="mb-1 font-medium">Or load two saved runs:</p>
              <div className="flex flex-wrap gap-2 items-center">
                <label className="flex items-center gap-1">
                  <span className="text-gray-500">Baseline</span>
                  <select
                    className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white max-w-[200px] truncate"
                    defaultValue=""
                    onChange={(e) => e.target.value && onPickBaseline?.(e.target.value)}
                  >
                    <option value="">— select —</option>
                    {runs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label || r.id}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-1">
                  <span className="text-gray-500">Optimized</span>
                  <select
                    className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white max-w-[200px] truncate"
                    defaultValue=""
                    onChange={(e) => e.target.value && onPickOptimized?.(e.target.value)}
                  >
                    <option value="">— select —</option>
                    {runs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label || r.id}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
