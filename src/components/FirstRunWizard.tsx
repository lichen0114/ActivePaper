import { useState } from 'react'
import { toast } from 'react-hot-toast'

interface FirstRunWizardProps {
  onComplete: () => void
}

export default function FirstRunWizard({ onComplete }: FirstRunWizardProps) {
  const [step, setStep] = useState<'welcome' | 'provider'>('welcome')
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const providers = [
    { id: 'ollama', name: 'Ollama (Local)', description: 'Free, runs on your machine. Requires Ollama installed.', isLocal: true },
    { id: 'gemini', name: 'Google Gemini', description: 'Cloud AI. Requires a Google AI API key.', isLocal: false },
    { id: 'openai', name: 'OpenAI', description: 'Cloud AI. Requires an OpenAI API key.', isLocal: false },
    { id: 'anthropic', name: 'Anthropic (Claude)', description: 'Cloud AI. Requires an Anthropic API key.', isLocal: false },
  ]

  const handleSaveAndContinue = async () => {
    if (!selectedProvider) return

    const provider = providers.find(p => p.id === selectedProvider)
    if (!provider) return

    if (provider.isLocal) {
      // For local providers, just set as current and finish
      try {
        await window.api?.setCurrentProvider(selectedProvider)
      } catch {
        // Ollama might not be running, that's OK
      }
      onComplete()
      return
    }

    // Cloud provider - need API key
    if (!apiKey.trim()) {
      setError('Please enter an API key')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await window.api?.setApiKey(selectedProvider, apiKey.trim())
      await window.api?.setCurrentProvider(selectedProvider)
      toast.success('Provider configured')
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key')
    } finally {
      setSaving(false)
    }
  }

  if (step === 'welcome') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="max-w-md text-center p-8">
          <h1 className="text-3xl font-bold text-gray-100 mb-3">Welcome to ActivePaper</h1>
          <p className="text-gray-400 mb-8">
            Select text in any PDF and get instant AI-powered explanations, summaries, and definitions.
          </p>
          <div className="space-y-4 text-left mb-8">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs flex items-center justify-center mt-0.5 flex-shrink-0">1</span>
              <p className="text-sm text-gray-300">Open a PDF document</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs flex items-center justify-center mt-0.5 flex-shrink-0">2</span>
              <p className="text-sm text-gray-300">Select any text to explain, summarize, or define</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs flex items-center justify-center mt-0.5 flex-shrink-0">3</span>
              <p className="text-sm text-gray-300">Explore equations, code, and concepts interactively</p>
            </div>
          </div>
          <button
            onClick={() => setStep('provider')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Get Started
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full p-8">
        <h2 className="text-xl font-semibold text-gray-100 mb-2">Choose an AI Provider</h2>
        <p className="text-sm text-gray-400 mb-6">
          You can change this later in Settings.
        </p>

        <div className="space-y-2 mb-6">
          {providers.map((provider) => (
            <button
              key={provider.id}
              onClick={() => {
                setSelectedProvider(provider.id)
                setApiKey('')
                setError(null)
              }}
              className={`w-full text-left p-4 rounded-lg border transition-colors ${
                selectedProvider === provider.id
                  ? 'border-blue-500 bg-blue-600/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${provider.isLocal ? 'bg-green-500' : 'bg-blue-500'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-200">{provider.name}</p>
                  <p className="text-xs text-gray-400">{provider.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {selectedProvider && !providers.find(p => p.id === selectedProvider)?.isLocal && (
          <div className="mb-6">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API key"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          </div>
        )}

        <div className="flex justify-between">
          <button
            onClick={onComplete}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleSaveAndContinue}
            disabled={!selectedProvider || saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
          >
            {saving ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
