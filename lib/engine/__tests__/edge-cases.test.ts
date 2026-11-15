import { describe, it, expect, beforeEach } from 'vitest'
import {
  LEVELS,
  getPreviousLevelId,
  getNextLevelId,
} from '../../quests'
import { SUPPORTED_LANGUAGES, LANGUAGE_META } from '../../quests/languages'
import { evaluateLevelStars, analyzeCodeQuality } from '../scoring'
import { useGameStore } from '../../store'

describe('Language Registry & Curriculum Boundaries', () => {
  it('defines complete metadata for all 6 supported languages', () => {
    expect(SUPPORTED_LANGUAGES.map((l) => l.id)).toEqual([
      'python',
      'rust',
      'typescript',
      'javascript',
      'ruby',
      'lua',
    ])

    for (const lang of SUPPORTED_LANGUAGES) {
      expect(LANGUAGE_META[lang.id]).toEqual(lang)
      expect(lang.name.length).toBeGreaterThan(0)
      expect(lang.icon.length).toBeGreaterThan(0)
      expect(lang.ext.length).toBeGreaterThan(0)
    }
  })

  it('provides starterCode, solutionCode, and prepareCode for all 6 languages on every level', () => {
    for (const level of LEVELS) {
      for (const { id } of SUPPORTED_LANGUAGES) {
        expect(level.starterCode[id]).toBeTruthy()
        expect(level.solutionCode[id]).toBeTruthy()
        expect(() => level.prepareCode(level.solutionCode[id], id)).not.toThrow()
      }
    }
  })

  it('handles first, last, and unknown level IDs in navigation helpers', () => {
    const first = LEVELS[0].id
    const last = LEVELS[LEVELS.length - 1].id

    expect(getPreviousLevelId(first)).toBeNull()
    expect(getNextLevelId(last)).toBeNull()
    expect(getPreviousLevelId('nonexistent-level')).toBeNull()
    expect(getNextLevelId('nonexistent-level')).toBeNull()
  })
})

describe('Scoring & Static Linter Edge Cases', () => {
  it('does not deduct a star for info-severity diagnostics', () => {
    const result = evaluateLevelStars({
      hintsUnlockedTier: 0,
      lintDiagnostics: [
        {
          line: 1,
          column: 101,
          code: 'E501',
          rule: 'Ruff/E501',
          severity: 'info',
          message: 'Line exceeds 100 characters.',
        },
      ],
      stepCount: 3,
      optimalSteps: 3,
    })

    expect(result.stars).toBe(3)
  })

  it('deducts a star when stepCount exceeds 2x optimalSteps', () => {
    const result = evaluateLevelStars({
      hintsUnlockedTier: 0,
      lintDiagnostics: [],
      stepCount: 10,
      optimalSteps: 4,
    })

    expect(result.stars).toBe(2)
  })

  it('ignores empty lines and comment-only lines in analyzeCodeQuality', () => {
    const commentHeavy = [
      '',
      '# ' + 'a'.repeat(120),
      '// ' + 'b'.repeat(120),
      '-- ' + 'c'.repeat(120),
      'step()',
    ].join('\n')

    expect(analyzeCodeQuality(commentHeavy, 'python')).toEqual([])
    expect(analyzeCodeQuality('', 'typescript')).toEqual([])
  })

  it('flags E501 info diagnostic for non-comment lines over 100 characters', () => {
    const longLine = `const message = "${'x'.repeat(100)}";`
    const diags = analyzeCodeQuality(longLine, 'typescript')

    expect(diags.some((d) => d.code === 'E501' && d.severity === 'info')).toBe(true)
  })
})

describe('Game Store State & Persistence Edge Cases', () => {
  beforeEach(() => {
    useGameStore.getState().resetAllProgress()
  })

  it('awards XP only on first completion and preserves highest star rating on replay', () => {
    const store = useGameStore.getState()
    store.completeLevel('level-1-first-step', 3, 100, 'step()')
    expect(useGameStore.getState().totalXp).toBe(100)
    expect(useGameStore.getState().completedLevels['level-1-first-step']?.stars).toBe(3)

    // Replay with lower star count should not reduce stars or double-award XP
    store.completeLevel('level-1-first-step', 1, 100, 'step()')
    expect(useGameStore.getState().totalXp).toBe(100)
    expect(useGameStore.getState().completedLevels['level-1-first-step']?.stars).toBe(3)
  })

  it('keeps hint tier monotonic when unlocking lower tiers later', () => {
    const store = useGameStore.getState()
    store.unlockHint('level-1-first-step', 3)
    store.unlockHint('level-1-first-step', 1)

    expect(useGameStore.getState().getUnlockedHintTier('level-1-first-step')).toBe(3)
  })

  it('isolates code drafts per level and language', () => {
    const store = useGameStore.getState()
    store.saveDraft('level-1-first-step', 'python', 'step()')
    store.saveDraft('level-1-first-step', 'rust', 'hero.step();')

    expect(useGameStore.getState().getDraft('level-1-first-step', 'python')).toBe('step()')
    expect(useGameStore.getState().getDraft('level-1-first-step', 'rust')).toBe('hero.step();')
    expect(useGameStore.getState().getDraft('level-1-first-step', 'lua')).toBe('')
  })

  it('unlocks all levels and resets cleanly', () => {
    const store = useGameStore.getState()
    store.unlockAllLevels()
    expect(useGameStore.getState().unlockedLevels.length).toBe(LEVELS.length)

    store.resetAllProgress()
    expect(useGameStore.getState().unlockedLevels).toEqual(['level-1-first-step'])
    expect(useGameStore.getState().totalXp).toBe(0)
  })
})
