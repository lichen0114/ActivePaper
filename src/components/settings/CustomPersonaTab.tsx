import { useState, useEffect } from 'react'
import type { AIPreferences, AIPreferencesUpdate } from '../../types/ai-customization'

interface CustomPersonaTabProps {
  preferences: AIPreferences | null
  onUpdate: (updates: AIPreferencesUpdate) => void
}

const EXAMPLE_PROMPTS = [
  "I'm a physics grad student",
  "Use cooking analogies whenever possible",
  "Explain everything with examples from everyday life",
  "I'm a software engineer learning biology",
  "Respond in the style of a friendly tutor",
]

export default function CustomPersonaTab({ preferences, onUpdate }: CustomPersonaTabProps) {
  const [promptText, setPromptText] = useState('')
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (preferences) {
      setPromptText(preferences.custom_system_prompt || '')
      setEnabled(!!preferences.custom_system_prompt_enabled)
    }
  }, [preferences])

  if (!preferences) {
    return <div className="text-gray-500 text-sm">Loading preferences...</div>
  }

  const handleToggle = () => {
    const newEnabled = !enabled
    setEnabled(newEnabled)
    onUpdate({ custom_system_prompt_enabled: newEnabled ? 1 : 0 })
  }

  const handleSave = () => {
    onUpdate({
      custom_system_prompt: promptText.trim() || null,
      custom_system_prompt_enabled: enabled && promptText.trim() ? 1 : 0,
    })
  }

  const handleExampleClick = (example: string) => {
    setPromptText(example)
    setEnabled(true)
    onUpdate({
      custom_system_prompt: example,
      custom_system_prompt_enabled: 1,
    })
  }

  return (
    <div>
      <p className="text-sm text-gray-400 mb-4">
        Add a custom instruction that gets prepended to every AI query. Use this to set context about yourself or your preferences.
      </p>

      {/* Toggle */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-300">Enable custom persona</span>
        <button
          onClick={handleToggle}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            enabled ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-4.5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Textarea */}
      <textarea
        value={promptText}
        onChange={(e) => setPromptText(e.target.value)}
        onBlur={handleSave}
        placeholder="e.g., I'm a biology student. Use simple language and real-world examples."
        className="w-full h-28 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500"
      />

      <p className="text-xs text-gray-500 mt-1 mb-4">
        {promptText.length}/500 characters
      </p>

      {/* Examples */}
      <div>
        <p className="text-xs text-gray-400 mb-2">Try an example:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              onClick={() => handleExampleClick(example)}
              className="px-2.5 py-1 text-xs bg-gray-700/50 text-gray-400 rounded-full hover:bg-gray-700 hover:text-gray-200 transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
