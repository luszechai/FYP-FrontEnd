import React from 'react'
import { Play, Loader2, RotateCcw, Info } from 'lucide-react'
import { STRATEGY_ORDER, STRATEGY_META } from './utils'

/**
 * Left-hand configuration panel for the Evaluation Dashboard.
 *
 * The user selects which query-time strategies to enable, how many questions
 * to include, and an optional run label. "Execute A/B" kicks off a paired
 * run: first an all-strategies-off baseline, then the selected configuration.
 *
 * Progress is rendered live here so the user can watch question-by-question
 * status without scrolling.
 */
export default function StrategySidebar({
  strategies,
  onToggleStrategy,
  maxQuestions,
  onMaxQuestionsChange,
  testsetSize,
  runLabel,
  onRunLabelChange,
  onExecute,
  onReset,
  running,
  progress,
  canExecute = true,
  disabledReason = null,
}) {
  const anyEnabled = STRATEGY_ORDER.some((k) => strategies[k])

  const progressPct =
    progress?.total && progress.total > 0
      ? Math.min(100, Math.round(((progress.index || 0) / progress.total) * 100))
      : null

  return (
    <aside className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">Configuration</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Pick strategies to compare against a fresh all-off baseline.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Strategy toggles ---------------------------------------------- */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Strategies
            </h3>
            <button
              type="button"
              onClick={onReset}
              disabled={running || !anyEnabled}
              className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              title="Turn all strategies off"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          <div className="space-y-2">
            {STRATEGY_ORDER.map((key) => {
              const meta = STRATEGY_META[key]
              const checked = !!strategies[key]
              return (
                <label
                  key={key}
                  className={`group flex items-start gap-2 rounded-lg border px-2.5 py-2 cursor-pointer transition-colors ${
                    checked
                      ? 'border-blue-300 bg-blue-50/60'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={checked}
                    disabled={running}
                    onChange={() => onToggleStrategy(key)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-gray-800">
                        {meta.label}
                      </span>
                      <span
                        className="text-gray-300 group-hover:text-gray-500"
                        title={meta.tooltip}
                      >
                        <Info className="w-3 h-3" />
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug text-gray-500 mt-0.5">
                      {meta.tooltip}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>
        </section>

        {/* Testset size -------------------------------------------------- */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Testset Size
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={Math.max(1, testsetSize || 20)}
              value={maxQuestions}
              disabled={running || !testsetSize}
              onChange={(e) => onMaxQuestionsChange(Number(e.target.value))}
              className="flex-1 accent-blue-600"
            />
            <span className="text-sm font-semibold text-gray-800 w-10 text-right">
              {maxQuestions}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {testsetSize
              ? `of ${testsetSize} available`
              : 'testset unavailable'}
            . Each question runs through DeepSeek ~5× for Ragas, so smaller is
            faster.
          </p>
        </section>

        {/* Run label ----------------------------------------------------- */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Run Label (optional)
          </h3>
          <input
            type="text"
            placeholder="e.g. v3_recursive_rerank"
            value={runLabel}
            onChange={(e) => onRunLabelChange(e.target.value)}
            disabled={running}
            maxLength={60}
            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-[11px] text-gray-500 mt-1">
            Shows up in Progress Over Time. Defaults to a timestamp.
          </p>
        </section>
      </div>

      {/* Execute button + progress --------------------------------------- */}
      <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 space-y-2">
        {running && progress && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-gray-600">
              <span className="font-medium">
                {progress.phase === 'baseline' ? 'Baseline' : 'Optimized'}:{' '}
                {progress.index || 0} / {progress.total || '?'}
              </span>
              <span>{progressPct !== null ? `${progressPct}%` : '...'}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${progressPct ?? 0}%` }}
              />
            </div>
            {progress.currentQuestion && (
              <p
                className="text-[11px] text-gray-500 truncate"
                title={progress.currentQuestion}
              >
                {progress.currentQuestion}
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onExecute}
          disabled={running || !canExecute}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold shadow-sm hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title={disabledReason || undefined}
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Execute A/B Evaluation
            </>
          )}
        </button>
        {!canExecute && disabledReason && !running && (
          <p className="text-[11px] text-rose-600 text-center">{disabledReason}</p>
        )}
      </div>
    </aside>
  )
}
