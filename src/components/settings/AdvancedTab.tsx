import { useState, useEffect } from 'react'
import type { AIPreferences, AIPreferencesUpdate } from '../../types/ai-customization'

interface AdvancedTabProps {
  preferences: AIPreferences | null
  onUpdate: (updates: AIPreferencesUpdate) => void
  currentProviderId?: string
}

const PROVIDER_MODELS: Record<string, { label: string; options: string[] }> = {
  openai: {
    label: 'OpenAI Model',
    options: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  anthropic: {
    label: 'Anthropic Model',
    options: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest', 'claude-sonnet-4-5-20250929'],
  },
  gemini: {
    label: 'Gemini Model',
    options: ['gemini-3-pro-preview', 'gemini-2.0-flash', 'gemini-1.5-pro'],
  },
  ollama: {
    label: 'Ollama Model',
    options: ['llama3.2', 'llama3.1', 'mistral', 'codellama', 'phi3'],
  },
}

export default function AdvancedTab({ preferences, onUpdate }: AdvancedTabProps) {
  const [temperature, setTemperature] = useState<number | null>(null)
  const [maxTokens, setMaxTokens] = useState<string>('')
  const [models, setModels] = useState<Record<string, string>>({
    openai: '',
    anthropic: '',
    gemini: '',
    ollama: '',
  })
  const [customModelInput, setCustomModelInput] = useState<Record<string, string>>({})

  useEffect(() => {
    if (preferences) {
      setTemperature(preferences.temperature)
      setMaxTokens(preferences.max_tokens != null ? String(preferences.max_tokens) : '')
      setModels({
        openai: preferences.model_openai || '',
        anthropic: preferences.model_anthropic || '',
        gemini: preferences.model_gemini || '',
        ollama: preferences.model_ollama || '',
      })
    }
  }, [preferences])

  if (!preferences) {
    return <div className="text-gray-500 text-sm">Loading preferences...</div>
  }

  const handleTemperatureChange = (value: number | null) => {
    setTemperature(value)
    onUpdate({ temperature: value })
  }

  const handleMaxTokensBlur = () => {
    const parsed = maxTokens ? parseInt(maxTokens, 10) : null
    const clamped = parsed != null && !isNaN(parsed) ? Math.max(256, Math.min(8192, parsed)) : null
    setMaxTokens(clamped != null ? String(clamped) : '')
    onUpdate({ max_tokens: clamped })
  }

  const handleModelChange = (providerId: string, value: string) => {
    setModels(prev => ({ ...prev, [providerId]: value }))
    const fieldKey = `model_${providerId}` as keyof AIPreferencesUpdate
    onUpdate({ [fieldKey]: value || null })
  }

  return (
    <div>
      <p className="text-sm text-gray-400 mb-4">
        Fine-tune AI behavior. Leave fields empty to use provider defaults.
      </p>

      {/* Temperature */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">Temperature</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 w-8 text-right">
              {temperature != null ? temperature.toFixed(1) : '—'}
            </span>
            {temperature != null && (
              <button
                onClick={() => handleTemperatureChange(null)}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Reset
              </button>
            )}
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={temperature ?? 0.7}
          onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Precise (0.0)</span>
          <span>Creative (2.0)</span>
        </div>
      </div>

      {/* Max tokens */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">Max Tokens</label>
        <input
          type="number"
          min="256"
          max="8192"
          value={maxTokens}
          onChange={(e) => setMaxTokens(e.target.value)}
          onBlur={handleMaxTokensBlur}
          placeholder="Default: 2048"
          className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">Range: 256 - 8192. Controls maximum response length.</p>
      </div>

      {/* Per-provider model selectors */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3">Model Override (per provider)</h4>
        <div className="space-y-3">
          {Object.entries(PROVIDER_MODELS).map(([providerId, config]) => (
            <div key={providerId}>
              <label className="block text-xs text-gray-400 mb-1">{config.label}</label>
              <div className="flex gap-2">
                <select
                  value={config.options.includes(models[providerId]) ? models[providerId] : (models[providerId] ? '__custom__' : '')}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setCustomModelInput(prev => ({ ...prev, [providerId]: models[providerId] }))
                    } else {
                      handleModelChange(providerId, e.target.value)
                      setCustomModelInput(prev => ({ ...prev, [providerId]: '' }))
                    }
                  }}
                  className="flex-1 px-3 py-1.5 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Default</option>
                  {config.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  <option value="__custom__">Custom...</option>
                </select>
                {((!config.options.includes(models[providerId]) && models[providerId]) || customModelInput[providerId] !== undefined) && customModelInput[providerId] !== undefined && (
                  <input
                    type="text"
                    value={customModelInput[providerId] ?? models[providerId]}
                    onChange={(e) => setCustomModelInput(prev => ({ ...prev, [providerId]: e.target.value }))}
                    onBlur={() => {
                      const val = customModelInput[providerId]?.trim() || ''
                      handleModelChange(providerId, val)
                      if (!val) setCustomModelInput(prev => { const n = {...prev}; delete n[providerId]; return n })
                    }}
                    placeholder="Enter model name"
                    className="flex-1 px-3 py-1.5 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
