import { useState } from 'react'
import type { CustomAction, CustomActionCreate, CustomActionUpdate } from '../../types/ai-customization'

interface CustomActionsTabProps {
  actions: CustomAction[]
  onCreate: (data: CustomActionCreate) => void
  onUpdate: (data: CustomActionUpdate) => void
  onDelete: (id: string) => void
}

const EMOJI_OPTIONS = ['\u{1F527}', '\u{1F4DD}', '\u{1F50D}', '\u{1F4A1}', '\u{2753}', '\u{1F310}', '\u{1F4CA}', '\u{2705}', '\u{1F914}', '\u{1F3AF}', '\u{1F4AC}', '\u{1F4D6}']

export default function CustomActionsTab({ actions, onCreate, onUpdate, onDelete }: CustomActionsTabProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('\u{1F527}')
  const [template, setTemplate] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const resetForm = () => {
    setName('')
    setEmoji('\u{1F527}')
    setTemplate('')
    setIsAdding(false)
    setEditingId(null)
    setShowEmojiPicker(false)
  }

  const handleCreate = () => {
    if (!name.trim() || !template.trim()) return
    onCreate({ name: name.trim(), emoji, prompt_template: template.trim() })
    resetForm()
  }

  const handleUpdate = () => {
    if (!editingId || !name.trim() || !template.trim()) return
    onUpdate({ id: editingId, name: name.trim(), emoji, prompt_template: template.trim() })
    resetForm()
  }

  const startEdit = (action: CustomAction) => {
    setEditingId(action.id)
    setName(action.name)
    setEmoji(action.emoji)
    setTemplate(action.prompt_template)
    setIsAdding(false)
  }

  const startAdd = () => {
    resetForm()
    setIsAdding(true)
    setTemplate('{text}')
  }

  return (
    <div>
      <p className="text-sm text-gray-400 mb-4">
        Create custom actions that appear in the selection toolbar. Use <code className="text-xs bg-gray-700 px-1 rounded">{'{text}'}</code> for
        selected text and <code className="text-xs bg-gray-700 px-1 rounded">{'{context}'}</code> for surrounding context.
      </p>

      {/* Action list */}
      <div className="space-y-2 mb-4">
        {actions.map((action) => (
          <div
            key={action.id}
            className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
          >
            {editingId === action.id ? (
              <div className="flex-1">
                {renderForm(false)}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{action.emoji}</span>
                  <div>
                    <p className="text-sm text-gray-200">{action.name}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[300px]">{action.prompt_template}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdate({ id: action.id, enabled: action.enabled ? 0 : 1 })}
                    className={`text-xs ${action.enabled ? 'text-green-400' : 'text-gray-500'}`}
                  >
                    {action.enabled ? 'On' : 'Off'}
                  </button>
                  <button
                    onClick={() => startEdit(action)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(action.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {actions.length === 0 && !isAdding && (
          <p className="text-sm text-gray-500 text-center py-4">
            No custom actions yet. Create one to add it to the selection toolbar.
          </p>
        )}
      </div>

      {/* Add form */}
      {isAdding && (
        <div className="p-3 bg-gray-700/50 rounded-lg mb-4">
          {renderForm(true)}
        </div>
      )}

      {/* Add button */}
      {!isAdding && !editingId && (
        <button
          onClick={startAdd}
          className="w-full py-2 border border-dashed border-gray-600 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
        >
          + Add Custom Action
        </button>
      )}
    </div>
  )

  function renderForm(isNew: boolean) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {/* Emoji picker */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-10 h-10 flex items-center justify-center bg-gray-800 rounded-lg text-lg hover:bg-gray-700 transition-colors"
            >
              {emoji}
            </button>
            {showEmojiPicker && (
              <div className="absolute top-12 left-0 z-10 p-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl grid grid-cols-6 gap-1">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => { setEmoji(e); setShowEmojiPicker(false) }}
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 text-lg"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Name input */}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Action name (e.g., Generate Quiz)"
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            autoFocus
          />
        </div>

        {/* Template textarea */}
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder='e.g., Generate 5 quiz questions about: {text}'
          className="w-full h-20 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 font-mono"
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={resetForm}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={isNew ? handleCreate : handleUpdate}
            disabled={!name.trim() || !template.trim()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg disabled:opacity-50"
          >
            {isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    )
  }
}
