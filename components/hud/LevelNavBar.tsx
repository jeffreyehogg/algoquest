'use client'

import React from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lightbulb,
} from 'lucide-react'
import { Level, World, Language } from '../../lib/quests/types'
import { getPreviousLevelId, getNextLevelId } from '../../lib/quests'
import { useGameStore } from '../../lib/store'
import { UserProfileBadge } from '../auth/UserProfileBadge'

interface LevelNavBarProps {
  level: Level
  world?: World
  onOpenHint: () => void
  language?: Language
  // eslint-disable-next-line no-unused-vars
  onLanguageChange?: (lang: Language) => void
}

export function LevelNavBar({
  level,
  onOpenHint,
}: LevelNavBarProps) {
  const { totalXp, hintsUnlocked, unlockedLevels, completedLevels } = useGameStore()
  const unlockedTier = hintsUnlocked[level.id] || 0
  const prevLevelId = getPreviousLevelId(level.id)
  const nextLevelId = getNextLevelId(level.id)
  const isNextUnlocked =
    nextLevelId !== null &&
    (unlockedLevels.includes(nextLevelId) || Boolean(completedLevels[level.id]))

  return (
    <header className="w-full flex items-center justify-between px-4 sm:px-6 py-2.5 bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.08] select-none">
      {/* Left: Back to Challenges & Breadcrumb */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Link
          href="/"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/[0.06] text-xs font-mono font-medium transition-colors active:scale-[0.98] shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>All Quests</span>
        </Link>

        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-slate-600 font-mono hidden sm:inline">/</span>
          <span className="text-xs font-mono font-semibold text-slate-200 truncate">
            Level {level.number}: {level.title}
          </span>
          <div className="hidden md:flex items-center gap-1 ml-1">
            {prevLevelId && (
              <Link
                href={`/play/${prevLevelId}`}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                title="Previous level"
                aria-label="Previous level"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
            )}
            {nextLevelId && isNextUnlocked && (
              <Link
                href={`/play/${nextLevelId}`}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                title="Next level"
                aria-label="Next level"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Right: XP, Hints & Profile Badge */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Hint Trigger Button */}
        <button
          type="button"
          onClick={onOpenHint}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-colors flex items-center gap-1.5 active:scale-[0.98] border ${
            unlockedTier > 0
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-white/[0.06]'
          }`}
        >
          <Lightbulb className={`w-3.5 h-3.5 ${unlockedTier > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
          <span>Hints</span>
          {unlockedTier > 0 && (
            <span className="text-[10px] text-amber-400/80 font-semibold">
              ({unlockedTier}/3)
            </span>
          )}
        </button>

        {/* XP Counter */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/[0.08] text-amber-300 text-xs font-mono font-bold">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>{totalXp} XP</span>
        </div>

        {/* User Profile Badge */}
        <UserProfileBadge />
      </div>
    </header>
  )
}
