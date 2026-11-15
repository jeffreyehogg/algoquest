'use client'

import React, { useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { javascript } from '@codemirror/lang-javascript'
import { rust } from '@codemirror/lang-rust'
import { StreamLanguage } from '@codemirror/language'
import { ruby } from '@codemirror/legacy-modes/mode/ruby'
import { lua } from '@codemirror/legacy-modes/mode/lua'
import { RotateCcw, Play } from 'lucide-react'
import { Language } from '../../lib/quests/types'
import { SUPPORTED_LANGUAGES } from '../../lib/quests/languages'

interface CodeTerminalProps {
  code: string
  // eslint-disable-next-line no-unused-vars
  onChange: (value: string) => void
  language: Language
  // eslint-disable-next-line no-unused-vars
  onLanguageChange: (lang: Language) => void
  onReset: () => void
  onRun: () => void
  isRunning?: boolean
}

export const CodeTerminal = React.memo(function CodeTerminal({
  code,
  onChange,
  language,
  onLanguageChange,
  onReset,
  onRun,
  isRunning = false,
}: CodeTerminalProps) {
  // Select language extension
  const extensions = useMemo(() => {
    switch (language) {
      case 'python':
        return [python()]
      case 'javascript':
        return [javascript({ typescript: false })]
      case 'typescript':
        return [javascript({ typescript: true })]
      case 'rust':
        return [rust()]
      case 'ruby':
        return [StreamLanguage.define(ruby)]
      case 'lua':
        return [StreamLanguage.define(lua)]
      default:
        return [python()]
    }
  }, [language])

  // Handle Cmd/Ctrl + Enter keybinding
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (!isRunning) {
        onRun()
      }
    }
  }

  return (
    <div
      className="flex flex-col h-full rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-white/[0.08] shadow-xl overflow-hidden"
      onKeyDown={handleKeyDown}
    >
      {/* Editor Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-950/70 border-b border-white/[0.06]">
        {/* Language Dropdown */}
        <div className="flex items-center">
          <label htmlFor="editor-language-select" className="sr-only">
            Programming language
          </label>
          <select
            id="editor-language-select"
            name="language"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as Language)}
            className="lang-select"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.icon} {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono transition-colors flex items-center gap-1.5 active:scale-[0.98] border border-white/[0.06]"
            title="Reset to starter code"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={onRun}
            disabled={isRunning}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors flex items-center gap-1.5 active:scale-[0.98] ${
              isRunning
                ? 'bg-emerald-600/50 text-emerald-200 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Running...' : 'Run Code'}</span>
            <kbd className="hidden sm:inline-block ml-0.5 text-[10px] text-emerald-100/80 bg-emerald-800/60 px-1 rounded font-sans">
              ⌘↵
            </kbd>
          </button>
        </div>
      </div>

      {/* CodeMirror Workspace */}
      <div className="relative flex-1 overflow-auto bg-slate-950/80 font-mono text-sm">
        <CodeMirror
          value={code}
          height="100%"
          minHeight="240px"
          theme="dark"
          extensions={extensions}
          onChange={onChange}
          className="h-full text-[13px] font-mono leading-relaxed [&_.cm-editor]:bg-transparent [&_.cm-editor]:h-full [&_.cm-scroller]:font-mono [&_.cm-gutters]:bg-slate-950/90 [&_.cm-gutters]:border-r [&_.cm-gutters]:border-white/[0.06] [&_.cm-gutters]:text-slate-600"
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
          }}
        />
      </div>
    </div>
  )
})

CodeTerminal.displayName = 'CodeTerminal'
