'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Lightbulb,
  Lock,
  Unlock,
  Check,
  Copy,
  X,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import { Hint, Language } from '../../lib/quests/types'
import { LANGUAGE_META } from '../../lib/quests/languages'
import { useGameStore } from '../../lib/store'
import { useModalDialog } from './useModalDialog'

interface HintModalProps {
  isOpen: boolean
  onClose: () => void
  hints: Hint[]
  levelId: string
  language: Language
}

const TIER_META: Record<number, { tag: string; description: string }> = {
  1: { tag: 'Nudge', description: 'Conceptual pointer' },
  2: { tag: 'Logic Clue', description: 'Algorithmic outline' },
  3: { tag: 'Syntax Reveal', description: 'Full code solution' },
}

export function HintModal({
  isOpen,
  onClose,
  hints,
  levelId,
  language,
}: HintModalProps) {
  const dialogRef = useModalDialog(isOpen)
  const hintsUnlocked = useGameStore((state) => state.hintsUnlocked[levelId] || 0)
  const unlockHint = useGameStore((state) => state.unlockHint)

  const [selectedTier, setSelectedTier] = useState<1 | 2 | 3>(1)
  const [copied, setCopied] = useState(false)

  // Sync selected tier when opening and auto-unlock Tier 1 if nothing is unlocked yet
  useEffect(() => {
    if (isOpen) {
      if (hintsUnlocked === 0) {
        unlockHint(levelId, 1)
        setSelectedTier(1)
      } else {
        setSelectedTier(Math.min(hintsUnlocked, 3) as 1 | 2 | 3)
      }
    }
  }, [isOpen, hintsUnlocked, levelId, unlockHint])

  const handleSelectTier = useCallback(
    (tier: 1 | 2 | 3) => {
      if (hintsUnlocked < tier) {
        unlockHint(levelId, tier)
      }
      setSelectedTier(tier)
    },
    [hintsUnlocked, levelId, unlockHint]
  )

  const handleDialogKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === '1') handleSelectTier(1)
    else if (e.key === '2') handleSelectTier(2)
    else if (e.key === '3') handleSelectTier(3)
  }

  const currentHint = hints.find((h) => h.tier === selectedTier) || hints[selectedTier - 1]
  const isSelectedTierUnlocked = (hintsUnlocked || 1) >= selectedTier

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  const langMeta = LANGUAGE_META[language] || LANGUAGE_META.python
  const activeSnippet = currentHint?.codeSnippet
    ? currentHint.codeSnippet[language] || currentHint.codeSnippet.python
    : null

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-labelledby="hint-modal-title"
      onClose={onClose}
      onKeyDown={handleDialogKeyDown}
      className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl bg-slate-900 text-slate-100 border border-white/[0.1] shadow-2xl p-0 overflow-hidden backdrop:bg-slate-950/80"
    >
      <div className="flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <h2 id="hint-modal-title" className="text-base font-bold text-white">
                Hints
              </h2>
              <p className="text-xs text-slate-400">
                {TIER_META[selectedTier].description} · {Math.max(hintsUnlocked, 1)}/3 unlocked
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close hints"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progressive Tabs Navigation */}
        <div className="px-6 py-3 border-b border-white/[0.06] bg-slate-950/40">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-white/[0.06]">
            {([1, 2, 3] as const).map((tier) => {
              const isUnlocked = hintsUnlocked >= tier
              const isCurrent = selectedTier === tier
              const meta = TIER_META[tier]

              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => handleSelectTier(tier)}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                    isCurrent
                      ? 'bg-slate-800 text-white border border-white/[0.08]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                  }`}
                >
                  {isUnlocked ? (
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  <span className="truncate">{meta.tag}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Hint Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {!isSelectedTierUnlocked ? (
            <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-950/50 p-8 text-center space-y-4">
              <div className="w-11 h-11 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-amber-400">
                <Lock className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  Tier {selectedTier}: {TIER_META[selectedTier].tag}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {selectedTier === 1
                    ? 'Unlock a gentle conceptual nudge to get your logic started.'
                    : selectedTier === 2
                      ? 'Unlock an algorithmic outline with step-by-step logic.'
                      : `Unlock the ${langMeta.name} code solution.`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => unlockHint(levelId, selectedTier)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors active:scale-[0.98]"
              >
                <Unlock className="w-3.5 h-3.5" />
                Reveal {TIER_META[selectedTier].tag}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Hint Title & Description */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-white/[0.06] space-y-1.5">
                <h4 className="text-sm font-bold text-white">
                  {currentHint?.title || 'Guidance'}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {currentHint?.description ||
                    'Read the objective carefully and observe tile positions on the grid.'}
                </p>
              </div>

              {/* Code Snippet Box (if available) */}
              {activeSnippet && (
                <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-slate-950">
                  <div className="px-4 py-2 border-b border-white/[0.06] bg-slate-900/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>
                      snippet.{langMeta.ext} · {langMeta.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(activeSnippet)}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed select-text">
                    <code>{activeSnippet}</code>
                  </pre>
                </div>
              )}

              {/* Next Tier Progression Prompt */}
              {selectedTier < 3 && (
                <button
                  type="button"
                  onClick={() => {
                    const nextTier = (selectedTier + 1) as 2 | 3
                    unlockHint(levelId, nextTier)
                    setSelectedTier(nextTier)
                  }}
                  className="w-full py-2.5 px-4 rounded-xl font-semibold font-mono text-xs transition-colors flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-800 border border-white/[0.08] text-slate-200"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {selectedTier === 1
                      ? 'Reveal Tier 2: Logic Clue'
                      : 'Reveal Tier 3: Syntax Reveal'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/[0.08] bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 border border-white/[0.08]">Esc</kbd> to close
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Back to Quest
          </button>
        </div>
      </div>
    </dialog>
  )
}
