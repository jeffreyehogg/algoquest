'use client'

import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import {
  Star,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Map,
  Award,
  X,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import Link from 'next/link'
import { Level } from '../../lib/quests/types'
import { StarEvaluationResult } from '../../lib/engine/scoring'
import { useModalDialog } from './useModalDialog'

interface VictoryModalProps {
  isOpen: boolean
  level: Level
  stars?: number
  starEvaluation?: StarEvaluationResult
  xpAwarded?: number
  nextLevelId?: string | null
  onReplay: () => void
  onNextLevel: () => void
  onClose: () => void
}

export function VictoryModal({
  isOpen,
  level,
  stars = 3,
  starEvaluation,
  xpAwarded = 100,
  nextLevelId,
  onReplay,
  onNextLevel,
  onClose,
}: VictoryModalProps) {
  const dialogRef = useModalDialog(isOpen)
  const continueButtonRef = useRef<HTMLButtonElement | null>(null)
  const displayStars = starEvaluation?.stars ?? stars

  // Fire celebratory confetti cannons and focus continue button
  useEffect(() => {
    if (!isOpen) return
    try {
      confetti({
        particleCount: 100,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#34d399', '#fbbf24', '#a855f7'],
      })
    } catch {
      // Safe fallback if canvas-confetti is unavailable
    }

    const timer = setTimeout(() => {
      continueButtonRef.current?.focus()
    }, 60)
    return () => clearTimeout(timer)
  }, [isOpen])

  const handleDialogKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault()
      onReplay()
    } else if (e.key === 'Enter' && document.activeElement === dialogRef.current) {
      e.preventDefault()
      if (nextLevelId) {
        onNextLevel()
      } else {
        window.location.href = '/'
      }
    }
  }

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-labelledby="victory-modal-title"
      onClose={onClose}
      onKeyDown={handleDialogKeyDown}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-slate-900 text-slate-100 border border-white/[0.1] p-6 md:p-7 shadow-2xl text-center overflow-hidden backdrop:bg-slate-950/80"
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close victory modal"
        className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-white/[0.06]"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Victory Badge Header */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={isOpen ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
        transition={{ delay: 0.08, type: 'spring', stiffness: 300, damping: 20 }}
        className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 mx-auto mb-4 flex items-center justify-center"
      >
        <Sparkles className="w-7 h-7 text-amber-400 fill-amber-400/30" />
      </motion.div>

      <h2 id="victory-modal-title" className="text-2xl font-bold text-white tracking-tight">
        Quest Conquered!
      </h2>

      <p className="text-xs font-mono text-slate-400 mt-1 mb-4">
        Level {level.number}: {level.title} · {level.concept}
      </p>

      {/* 3-Star Rating */}
      <div className="flex items-center justify-center gap-3 my-3">
        {[1, 2, 3].map((starIdx) => (
          <motion.div
            key={`star-${starIdx}`}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={
              isOpen
                ? { scale: starIdx <= displayStars ? 1 : 0.85, opacity: 1 }
                : { scale: 0.5, opacity: 0 }
            }
            transition={{ delay: 0.15 + starIdx * 0.1, type: 'spring', stiffness: 300 }}
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                starIdx <= displayStars
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-slate-700 fill-slate-800'
              }`}
            />
          </motion.div>
        ))}
      </div>

      {/* Dynamic Star Evaluation Criteria */}
      {starEvaluation && (
        <div className="my-4 p-3 rounded-2xl bg-slate-950/70 border border-white/[0.06] text-left space-y-2">
          {starEvaluation.criteria.map((c, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs font-mono">
              {c.met ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className={c.met ? 'text-slate-200 font-semibold' : 'text-slate-500'}>
                  {c.label}
                </div>
                <div className="text-[10px] text-slate-400">{c.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reward Pill */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono text-xs font-bold mb-4">
        <Award className="w-4 h-4 text-amber-400" />
        <span>+{xpAwarded} XP Earned</span>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex flex-col gap-2">
        {nextLevelId ? (
          <button
            ref={continueButtonRef}
            type="button"
            onClick={onNextLevel}
            className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-sm transition-colors flex items-center justify-center gap-2 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <span>Continue to Next Level</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        ) : (
          <Link
            href="/"
            className="w-full py-3 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold font-mono text-sm transition-colors flex items-center justify-center gap-2 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <Map className="w-4 h-4" />
            <span>Return to World Map</span>
          </Link>
        )}

        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={onReplay}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-mono text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-white/[0.06]"
            title="Press R to replay"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay</span>
          </button>

          <Link
            href="/"
            className="flex-1 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-mono text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-white/[0.06]"
          >
            <Map className="w-3.5 h-3.5" />
            <span>World Map</span>
          </Link>
        </div>
      </div>
    </dialog>
  )
}
