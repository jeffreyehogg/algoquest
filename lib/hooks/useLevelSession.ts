'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Language, Level } from '../quests/types'
import { useGameStore } from '../store'
import {
  executionRunner,
  evaluateLevelStars,
  analyzeCodeQuality,
  StarEvaluationResult,
} from '../engine'
import {
  StepEvent,
  TestCaseResult,
  ErrorDetails,
  LintDiagnostic,
  WasmBenchmarkTelemetry,
} from '../engine/types'

const GATED_LEVELS = new Set([
  'level-2-the-gatekeeper',
  'level-6-the-inventory-bag',
  'level-9-the-ancient-tome',
])

/**
 * Manages code drafting, sandboxed worker execution, 2D board simulation,
 * data-structure visualizer telemetry, and step playback for an active level.
 */
export function useLevelSession(level: Level | undefined, nextLevelId: string | null) {
  const {
    activeLanguage,
    setActiveLanguage,
    saveDraft,
    getDraft,
    completeLevel,
    unlockLevel,
    getUnlockedHintTier,
  } = useGameStore()

  // Code & execution state
  const [code, setCode] = useState<string>('')
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [isVictoryOpen, setIsVictoryOpen] = useState<boolean>(false)
  const [starEval, setStarEval] = useState<StarEvaluationResult | undefined>(undefined)

  // Simulation & board state
  const [heroPos, setHeroPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [heroDirection, setHeroDirection] = useState<string>('east')
  const [isHeroMoving, setIsHeroMoving] = useState<boolean>(false)
  const [isHeroJumping, setIsHeroJumping] = useState<boolean>(false)
  const [isLevelSolved, setIsLevelSolved] = useState<boolean>(false)
  const [gateOpen, setGateOpen] = useState<boolean>(false)
  const [collectedEntities, setCollectedEntities] = useState<string[]>([])

  // Visualizer live state
  const [liveStack, setLiveStack] = useState<string[]>([])
  const [livePointers, setLivePointers] = useState<{ left: number; right: number; mid?: number }>({
    left: 0,
    right: 6,
  })
  const [liveArray, setLiveArray] = useState<string[]>(['potion', 'shield', 'key'])
  const [accessedIndex, setAccessedIndex] = useState<number | null>(null)
  const [liveMap, setLiveMap] = useState<Record<string, string | number>>({ wind: 1, ice: 2 })

  // Step playback state
  const [recordedSteps, setRecordedSteps] = useState<StepEvent[]>([])
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0)
  const [isPlayingSteps, setIsPlayingSteps] = useState<boolean>(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const playbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const victoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Execution results
  const [testResults, setTestResults] = useState<TestCaseResult[]>([])
  const [stdoutLogs, setStdoutLogs] = useState<string[]>([])
  const [lintDiagnostics, setLintDiagnostics] = useState<LintDiagnostic[]>([])
  const [wasmBenchmark, setWasmBenchmark] = useState<WasmBenchmarkTelemetry | undefined>()
  const [executionError, setExecutionError] = useState<string | undefined>()
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | undefined>()
  const [executionTimeMs, setExecutionTimeMs] = useState<number>(0)
  const [hasRun, setHasRun] = useState<boolean>(false)

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current)
      if (victoryTimerRef.current) clearTimeout(victoryTimerRef.current)
    }
  }, [])

  // Pre-warm Web Workers once
  useEffect(() => {
    executionRunner.preload('python')
    executionRunner.preload('typescript')
    executionRunner.preload('javascript')
    executionRunner.preload('ruby')
    executionRunner.preload('lua')
  }, [])

  const resetGameBoard = useCallback(() => {
    if (!level) return
    setHeroPos({ ...level.gridConfig.heroStart })
    setHeroDirection(level.gridConfig.heroDirection)
    setIsHeroMoving(false)
    setIsHeroJumping(false)
    setIsLevelSolved(false)
    setGateOpen(false)
    setCollectedEntities([])
    setRecordedSteps([])
    setCurrentStepIdx(0)
    setIsPlayingSteps(false)
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current)

    if (level.visualizerConfig) {
      setLiveStack(
        level.visualizerConfig.initialStack ? [...level.visualizerConfig.initialStack] : []
      )
      setLivePointers(
        level.visualizerConfig.initialPointers
          ? { ...level.visualizerConfig.initialPointers }
          : { left: 0, right: 6 }
      )
      setLiveArray(
        level.visualizerConfig.initialArray
          ? [...level.visualizerConfig.initialArray]
          : ['potion', 'shield', 'key']
      )
      setAccessedIndex(null)
      setLiveMap(
        level.visualizerConfig.initialMap
          ? { ...level.visualizerConfig.initialMap }
          : { wind: 1, ice: 2 }
      )
    }
  }, [level])

  // Load draft or starter code when level or language changes
  useEffect(() => {
    if (!level) return
    const saved = getDraft(level.id, activeLanguage)
    if (saved && saved.trim().length > 0) {
      setCode(saved)
    } else {
      setCode(level.starterCode[activeLanguage] || level.starterCode.python)
    }
    resetGameBoard()
  }, [level, activeLanguage, getDraft, resetGameBoard])

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode)
      if (level) saveDraft(level.id, activeLanguage, newCode)
    },
    [level, activeLanguage, saveDraft]
  )

  const handleResetCode = useCallback(() => {
    if (!level) return
    const starter = level.starterCode[activeLanguage] || level.starterCode.python
    setCode(starter)
    saveDraft(level.id, activeLanguage, starter)
    resetGameBoard()
  }, [level, activeLanguage, saveDraft, resetGameBoard])

  const handleLanguageChange = useCallback(
    (lang: Language) => {
      setActiveLanguage(lang)
    },
    [setActiveLanguage]
  )

  const handleVictory = useCallback(
    (diagnostics: LintDiagnostic[], stepCount: number) => {
      if (!level) return
      setIsLevelSolved(true)
      setGateOpen(true)

      const evaluation = evaluateLevelStars({
        hintsUnlockedTier: getUnlockedHintTier(level.id),
        lintDiagnostics: diagnostics,
        stepCount,
        optimalSteps: level.optimalSteps,
        code,
      })
      setStarEval(evaluation)
      completeLevel(level.id, evaluation.stars, level.xp, code)
      if (nextLevelId) unlockLevel(nextLevelId)

      if (victoryTimerRef.current) clearTimeout(victoryTimerRef.current)
      victoryTimerRef.current = setTimeout(() => {
        setIsVictoryOpen(true)
      }, 600)
    },
    [level, getUnlockedHintTier, code, completeLevel, nextLevelId, unlockLevel]
  )

  const applyStepEvent = useCallback(
    (step: StepEvent) => {
      if (step.type === 'step' || step.type === 'hazard') {
        setIsHeroMoving(true)
        setIsHeroJumping(false)
        if (step.data?.position) {
          setHeroPos({ x: step.data.position.x, y: step.data.position.y })
        }
        if (step.data?.direction) setHeroDirection(step.data.direction)
      } else if (step.type === 'jump') {
        setIsHeroMoving(false)
        setIsHeroJumping(true)
        if (step.data?.position) {
          setHeroPos({ x: step.data.position.x, y: step.data.position.y })
        }
      } else if (step.type === 'collect') {
        const pos = step.data?.position || heroPos
        const entity = level?.gridConfig.entities?.find((e) => e.x === pos.x && e.y === pos.y)
        if (entity) {
          setCollectedEntities((prev) => (prev.includes(entity.id) ? prev : [...prev, entity.id]))
        } else if (step.data?.item) {
          setCollectedEntities((prev) => [...prev, String(step.data?.item)])
        }
      } else if (step.type === 'turn') {
        if (step.data?.direction) setHeroDirection(step.data.direction)
      } else if (step.type === 'stack' && Array.isArray(step.data?.stack)) {
        setLiveStack(step.data.stack)
        return
      } else if (
        (step.type === 'pointer' || step.type === 'binary_search') &&
        step.data?.pointers
      ) {
        setLivePointers(step.data.pointers)
        return
      } else if (step.type === 'array' && typeof step.data?.accessedIndex === 'number') {
        setAccessedIndex(step.data.accessedIndex)
        return
      } else if (step.type === 'hashmap' && step.data?.hashmap) {
        setLiveMap(step.data.hashmap)
        return
      }

      if (level && GATED_LEVELS.has(level.id)) {
        setGateOpen(true)
      }

      // Fallback visualizer sync for workers that only emit spatial step events
      if (step.type === 'step') {
        if (level?.id === 'level-7-the-stone-pedestal') {
          setLiveStack((prev) => (prev.length === 0 ? ['bronze', 'silver'] : prev))
        } else if (level?.id === 'level-8-the-dual-bridges') {
          setLivePointers((prev) =>
            prev.left < prev.right ? { left: prev.left + 1, right: prev.right - 1 } : prev
          )
        } else if (level?.id === 'level-6-the-inventory-bag') {
          setAccessedIndex((prev) => (prev === null ? 0 : 2))
        } else if (level?.id === 'level-9-the-ancient-tome') {
          setLiveMap((prev) => ('fire' in prev ? prev : { wind: 1, ice: 2, fire: 3 }))
        } else if (level?.id === 'level-10-the-crystal-archives') {
          setLivePointers((prev) => (prev.mid === 5 ? prev : { left: 4, right: 6, mid: 5 }))
        }
      }
    },
    [heroPos, level]
  )

  const playStepSequence = useCallback(
    (steps: StepEvent[], testsPassed: boolean, diagnostics: LintDiagnostic[]) => {
      if (steps.length === 0) return

      let currentIdx = 0
      setIsPlayingSteps(true)
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current)

      const interval = Math.max(150, 400 / playbackSpeed)
      playbackTimerRef.current = setInterval(() => {
        if (currentIdx >= steps.length) {
          if (playbackTimerRef.current) clearInterval(playbackTimerRef.current)
          setIsPlayingSteps(false)
          setIsHeroMoving(false)
          setIsHeroJumping(false)

          if (testsPassed) {
            const moveStepCount = steps.filter(
              (s) => s.type === 'step' || s.type === 'jump'
            ).length
            handleVictory(diagnostics, moveStepCount)
          }
          return
        }

        applyStepEvent(steps[currentIdx])
        setCurrentStepIdx(currentIdx + 1)
        currentIdx++
      }, interval)
    },
    [playbackSpeed, applyStepEvent, handleVictory]
  )

  const handleRunCode = useCallback(async () => {
    if (!level || isRunning) return

    setIsRunning(true)
    setHasRun(true)
    setStdoutLogs([])
    setExecutionError(undefined)
    setErrorDetails(undefined)
    resetGameBoard()

    const preparedCode = level.prepareCode(code, activeLanguage)
    const staticLint = analyzeCodeQuality(code, activeLanguage)

    try {
      const result = await executionRunner.execute(
        {
          requestId: `${level.id}-${Date.now()}`,
          language: activeLanguage,
          code: preparedCode,
          rawUserCode: code,
          testCases: level.testCases,
          initialState: {
            position: { ...level.gridConfig.heroStart },
            direction: level.gridConfig.heroDirection,
            goal: { ...level.gridConfig.goal },
            tiles: level.gridConfig.tiles,
            width: level.gridConfig.width,
            height: level.gridConfig.height,
            items: level.gridConfig.entities,
          },
          timeoutMs: 4000,
        },
        {
          onStdout: (text) => setStdoutLogs((prev) => [...prev, text]),
        }
      )

      const combinedDiagnostics: LintDiagnostic[] = [...(result.lintDiagnostics || [])]
      for (const diag of staticLint) {
        if (!combinedDiagnostics.some((d) => d.line === diag.line && d.code === diag.code)) {
          combinedDiagnostics.push(diag)
        }
      }

      setIsRunning(false)
      setTestResults(result.testResults)
      setLintDiagnostics(combinedDiagnostics)
      setWasmBenchmark(result.wasmBenchmark)
      setExecutionTimeMs(result.executionTimeMs)
      setStdoutLogs(result.output)

      if (!result.success || result.error) {
        setExecutionError(result.error)
        setErrorDetails(result.errorDetails)
        if (result.steps && result.steps.length > 0) {
          setRecordedSteps(result.steps)
          playStepSequence(result.steps, false, combinedDiagnostics)
        }
      } else {
        setRecordedSteps(result.steps)
        if (result.steps.length > 0) {
          playStepSequence(result.steps, result.allTestsPassed, combinedDiagnostics)
        } else if (result.allTestsPassed) {
          handleVictory(combinedDiagnostics, 0)
        }
      }
    } catch (err) {
      setIsRunning(false)
      setExecutionError(err instanceof Error ? err.message : String(err))
    }
  }, [level, isRunning, resetGameBoard, code, activeLanguage, playStepSequence, handleVictory])

  const handleTogglePlay = useCallback(() => {
    if (isPlayingSteps) {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current)
      setIsPlayingSteps(false)
    } else {
      playStepSequence(
        recordedSteps,
        testResults.length > 0 && testResults.every((t) => t.passed),
        lintDiagnostics
      )
    }
  }, [isPlayingSteps, playStepSequence, recordedSteps, testResults, lintDiagnostics])

  const handleStepForward = useCallback(() => {
    if (currentStepIdx < recordedSteps.length) {
      applyStepEvent(recordedSteps[currentStepIdx])
      setCurrentStepIdx((prev) => prev + 1)
    }
  }, [currentStepIdx, recordedSteps, applyStepEvent])

  const handleStepBackward = useCallback(() => {
    if (currentStepIdx > 0) {
      resetGameBoard()
      for (let i = 0; i < currentStepIdx - 1; i++) {
        applyStepEvent(recordedSteps[i])
      }
      setCurrentStepIdx((prev) => prev - 1)
    }
  }, [currentStepIdx, recordedSteps, resetGameBoard, applyStepEvent])

  return {
    activeLanguage,
    code,
    isRunning,
    isVictoryOpen,
    setIsVictoryOpen,
    starEval,
    heroPos,
    heroDirection,
    isHeroMoving,
    isHeroJumping,
    isLevelSolved,
    gateOpen,
    collectedEntities,
    liveStack,
    livePointers,
    liveArray,
    accessedIndex,
    liveMap,
    recordedSteps,
    currentStepIdx,
    isPlayingSteps,
    playbackSpeed,
    setPlaybackSpeed,
    testResults,
    stdoutLogs,
    lintDiagnostics,
    wasmBenchmark,
    executionError,
    errorDetails,
    executionTimeMs,
    hasRun,
    resetGameBoard,
    handleCodeChange,
    handleResetCode,
    handleLanguageChange,
    handleRunCode,
    handleTogglePlay,
    handleStepForward,
    handleStepBackward,
  }
}
