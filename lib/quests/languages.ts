import { Language } from './types'

export interface LanguageMetadata {
  id: Language
  name: string
  icon: string
  ext: string
}

export const SUPPORTED_LANGUAGES: LanguageMetadata[] = [
  { id: 'python', name: 'Python', icon: '🐍', ext: 'py' },
  { id: 'rust', name: 'Rust', icon: '🦀', ext: 'rs' },
  { id: 'typescript', name: 'TypeScript', icon: '⚡', ext: 'ts' },
  { id: 'javascript', name: 'JavaScript', icon: '💛', ext: 'js' },
  { id: 'ruby', name: 'Ruby', icon: '💎', ext: 'rb' },
  { id: 'lua', name: 'Lua', icon: '🌙', ext: 'lua' },
]

export const LANGUAGE_META: Record<Language, LanguageMetadata> = SUPPORTED_LANGUAGES.reduce(
  (acc, lang) => {
    acc[lang.id] = lang
    return acc
  },
  {} as Record<Language, LanguageMetadata>
)
