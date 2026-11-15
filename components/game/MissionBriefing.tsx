'use client'

import React from 'react'
import { Language, Level } from '../../lib/quests/types'

interface MissionBriefingProps {
  level: Level
  activeLanguage: Language
}

/**
 * Displays the level's objective, numbered instructions, in-scope variables,
 * available commands/variables, and pass condition.
 */
export function MissionBriefing({ level, activeLanguage }: MissionBriefingProps) {
  return (
    <div className="rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/[0.08] p-4 sm:p-5 shadow-xl space-y-3.5">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-semibold">
            {level.concept}
          </span>
          <span className="text-xs font-mono text-amber-400/90 font-semibold">
            +{level.xp} XP
          </span>
        </div>
        <h1 className="text-lg font-bold text-white mb-1">{level.title}</h1>
        <p className="text-xs text-slate-300 leading-relaxed">{level.objective}</p>
      </div>

      {/* Step-by-Step Instructions */}
      <div className="pt-3 border-t border-white/[0.06]">
        <h2 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2">
          What to do
        </h2>
        <ol className="space-y-1.5">
          {level.instructions.map((inst, i) => (
            <li key={i} className="text-xs text-slate-300 flex items-start gap-2.5">
              <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 rounded px-1.5 py-0.5 select-none shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="leading-relaxed">{inst}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Pre-loaded Variables in Scope */}
      {level.preloadedContext?.[activeLanguage] && (
        <div className="pt-3 border-t border-white/[0.06]">
          <h2 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
            In scope
          </h2>
          <pre className="text-[11px] font-mono text-purple-200 bg-slate-950/70 border border-white/[0.06] rounded-lg px-3 py-2 overflow-x-auto leading-relaxed">
            {level.preloadedContext[activeLanguage]}
          </pre>
        </div>
      )}

      {/* Built-in Hero Actions & Goal Variables */}
      {level.availableActions && level.availableActions.length > 0 && (
        <div className="pt-3 border-t border-white/[0.06]">
          <h2 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2">
            Commands &amp; Variables
          </h2>
          <div className="flex flex-col gap-1.5">
            {level.availableActions.map((action) => {
              const sig = action.signatures?.[activeLanguage] || action.signature
              const isVar = action.kind === 'variable'
              return (
                <div key={action.name} className="flex items-baseline gap-2 text-xs flex-wrap">
                  <code
                    className={`font-mono font-semibold px-1.5 py-0.5 rounded text-[11px] border ${
                      isVar
                        ? 'text-cyan-300 bg-cyan-950/40 border-cyan-500/25'
                        : 'text-emerald-300 bg-emerald-950/40 border-emerald-500/25'
                    }`}
                  >
                    {sig}
                  </code>
                  <span className="text-slate-400 text-xs">{action.description}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pass Condition */}
      {level.howItWorks && (
        <div className="pt-3 border-t border-white/[0.06]">
          <p className="text-[11px] text-slate-300 leading-relaxed border-l-2 border-emerald-500/50 pl-3">
            <span className="font-semibold text-emerald-300">Pass condition: </span>
            {level.howItWorks}
          </p>
        </div>
      )}
    </div>
  )
}
