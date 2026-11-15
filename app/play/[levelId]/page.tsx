'use client'

import React, { useState, useMemo, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Compass } from 'lucide-react'
import { getLevelById, getNextLevelId, WORLDS } from '../../../lib/quests'
import { useLevelSession } from '../../../lib/hooks/useLevelSession'
import { GridCanvas } from '../../../components/game/GridCanvas'
import { MissionBriefing } from '../../../components/game/MissionBriefing'
import { Visualizer } from '../../../components/game/Visualizer'
import { CodeTerminal } from '../../../components/editor/CodeTerminal'
import { OutputConsole } from '../../../components/editor/OutputConsole'
import { RunControls } from '../../../components/editor/RunControls'
import { LevelNavBar } from '../../../components/hud/LevelNavBar'
import { HintModal } from '../../../components/hud/HintModal'
import { VictoryModal } from '../../../components/hud/VictoryModal'

interface PlayPageProps {
  params: Promise<{ levelId: string }>
}

export default function PlayLevelPage({ params }: PlayPageProps) {
  const { levelId } = use(params)
  const router = useRouter()

  const level = useMemo(() => getLevelById(levelId), [levelId])
  const world = useMemo(
    () => (level ? WORLDS.find((w) => w.id === level.worldId) : undefined),
    [level]
  )
  const nextLevelId = useMemo(() => (level ? getNextLevelId(level.id) : null), [level])

  const [isHintOpen, setIsHintOpen] = useState<boolean>(false)
  const session = useLevelSession(level, nextLevelId)

  const handleProceedNextLevel = () => {
    session.setIsVictoryOpen(false)
    if (nextLevelId) {
      router.push(`/play/${nextLevelId}`)
    } else {
      router.push('/')
    }
  }

  if (!level) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <Compass className="w-16 h-16 text-indigo-400 mb-4 animate-bounce" />
        <h1 className="text-2xl font-bold text-white mb-2">Level Not Found</h1>
        <p className="text-sm text-slate-400 mb-6">
          The quest coordinates for &quot;{levelId}&quot; could not be located on the World Map.
        </p>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-sm font-bold transition-colors"
        >
          Return to World Map
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <LevelNavBar
        level={level}
        world={world}
        onOpenHint={() => setIsHintOpen(true)}
        language={session.activeLanguage}
        onLanguageChange={session.handleLanguageChange}
      />

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 max-w-[1600px] w-full mx-auto overflow-hidden">
        {/* Left Column: Mission Briefing + 2D Game Board + Visualizer */}
        <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto pr-0 lg:pr-1">
          <MissionBriefing level={level} activeLanguage={session.activeLanguage} />

          <div className="flex-1 flex flex-col">
            <GridCanvas
              gridConfig={level.gridConfig}
              heroPosition={session.heroPos}
              heroDirection={session.heroDirection}
              isMoving={session.isHeroMoving}
              isJumping={session.isHeroJumping}
              isCompleted={session.isLevelSolved}
              collectedEntityIds={session.collectedEntities}
              gateOpen={session.gateOpen}
            />

            {session.recordedSteps.length > 0 && (
              <RunControls
                currentStep={session.currentStepIdx}
                totalSteps={session.recordedSteps.length}
                isPlaying={session.isPlayingSteps}
                playbackSpeed={session.playbackSpeed}
                onTogglePlay={session.handleTogglePlay}
                onStepForward={session.handleStepForward}
                onStepBackward={session.handleStepBackward}
                onResetSteps={session.resetGameBoard}
                onChangeSpeed={session.setPlaybackSpeed}
              />
            )}

            {level.visualizerConfig && (
              <Visualizer
                config={level.visualizerConfig}
                liveStack={session.liveStack}
                livePointers={session.livePointers}
                liveArray={session.liveArray}
                accessedIndex={session.accessedIndex}
                liveMap={session.liveMap}
              />
            )}
          </div>
        </div>

        {/* Right Column: Code Editor & Output Console */}
        <div className="lg:col-span-7 flex flex-col gap-4 h-full min-h-[580px]">
          <div className="flex-1 min-h-[320px]">
            <CodeTerminal
              code={session.code}
              onChange={session.handleCodeChange}
              language={session.activeLanguage}
              onLanguageChange={session.handleLanguageChange}
              onReset={session.handleResetCode}
              onRun={session.handleRunCode}
              isRunning={session.isRunning}
            />
          </div>

          <div className="h-64 min-h-[220px]">
            <OutputConsole
              testResults={session.testResults}
              stdoutLogs={session.stdoutLogs}
              lintDiagnostics={session.lintDiagnostics}
              wasmBenchmark={session.wasmBenchmark}
              error={session.executionError}
              errorDetails={session.errorDetails}
              executionTimeMs={session.executionTimeMs}
              allTestsPassed={
                session.testResults.length > 0 && session.testResults.every((t) => t.passed)
              }
              hasRun={session.hasRun}
            />
          </div>
        </div>
      </main>

      <HintModal
        isOpen={isHintOpen}
        onClose={() => setIsHintOpen(false)}
        hints={level.hints}
        levelId={level.id}
        language={session.activeLanguage}
      />

      <VictoryModal
        isOpen={session.isVictoryOpen}
        level={level}
        stars={session.starEval?.stars ?? 3}
        starEvaluation={session.starEval}
        xpAwarded={level.xp}
        nextLevelId={nextLevelId}
        onReplay={() => {
          session.setIsVictoryOpen(false)
          session.resetGameBoard()
        }}
        onNextLevel={handleProceedNextLevel}
        onClose={() => session.setIsVictoryOpen(false)}
      />
    </div>
  )
}
