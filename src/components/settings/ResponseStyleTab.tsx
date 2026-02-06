import type { AIPreferences, AIPreferencesUpdate } from '../../types/ai-customization'

interface ResponseStyleTabProps {
  preferences: AIPreferences | null
  onUpdate: (updates: AIPreferencesUpdate) => void
}

const TONES = [
  { value: 'standard', label: 'Standard' },
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'technical', label: 'Technical' },
  { value: 'eli5', label: 'ELI5' },
  { value: 'academic', label: 'Academic' },
] as const

const LENGTHS = [
  { value: 'concise', label: 'Concise' },
  { value: 'standard', label: 'Standard' },
  { value: 'detailed', label: 'Detailed' },
] as const

const FORMATS = [
  { value: 'prose', label: 'Prose' },
  { value: 'bullets', label: 'Bullet Points' },
  { value: 'step_by_step', label: 'Step-by-Step' },
  { value: 'qa', label: 'Q&A' },
] as const

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              value === opt.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ResponseStyleTab({ preferences, onUpdate }: ResponseStyleTabProps) {
  if (!preferences) {
    return <div className="text-gray-500 text-sm">Loading preferences...</div>
  }

  return (
    <div>
      <p className="text-sm text-gray-400 mb-4">
        Set defaults for how AI responses are styled. These apply to Explain, Summarize, Define, and custom actions.
      </p>

      <ChipGroup
        label="Tone"
        options={TONES}
        value={preferences.tone}
        onChange={(tone) => onUpdate({ tone })}
      />

      <ChipGroup
        label="Response Length"
        options={LENGTHS}
        value={preferences.response_length}
        onChange={(response_length) => onUpdate({ response_length })}
      />

      <ChipGroup
        label="Format"
        options={FORMATS}
        value={preferences.response_format}
        onChange={(response_format) => onUpdate({ response_format })}
      />
    </div>
  )
}
