import { useState, useEffect, useCallback } from 'react'
import type {
  AIPreferences,
  AIPreferencesUpdate,
  CustomAction,
  CustomActionCreate,
  CustomActionUpdate,
  DocumentAIContext,
  AICustomization,
} from '../types/ai-customization'

export function useAIPreferences(documentId?: string | null) {
  const [preferences, setPreferences] = useState<AIPreferences | null>(null)
  const [customActions, setCustomActions] = useState<CustomAction[]>([])
  const [documentContext, setDocumentContext] = useState<DocumentAIContext | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load preferences and custom actions on mount
  useEffect(() => {
    if (!window.api) return
    let cancelled = false

    const load = async () => {
      try {
        const [prefs, actions] = await Promise.all([
          window.api.getAIPreferences(),
          window.api.getCustomActions(),
        ])
        if (!cancelled) {
          setPreferences(prefs as AIPreferences)
          setCustomActions(actions as CustomAction[])
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Failed to load AI preferences:', err)
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  // Load document context when documentId changes
  useEffect(() => {
    if (!window.api || !documentId) {
      setDocumentContext(null)
      return
    }
    let cancelled = false

    window.api.getDocumentAIContext(documentId).then(ctx => {
      if (!cancelled) setDocumentContext(ctx as DocumentAIContext | null)
    }).catch(err => {
      console.error('Failed to load document AI context:', err)
    })

    return () => { cancelled = true }
  }, [documentId])

  // Preferences CRUD
  const updatePreferences = useCallback(async (updates: AIPreferencesUpdate) => {
    if (!window.api) return
    try {
      const updated = await window.api.updateAIPreferences(updates)
      setPreferences(updated as AIPreferences)
    } catch (err) {
      console.error('Failed to update AI preferences:', err)
    }
  }, [])

  // Custom Actions CRUD
  const createAction = useCallback(async (data: CustomActionCreate) => {
    if (!window.api) return
    try {
      const created = await window.api.createCustomAction(data)
      setCustomActions(prev => [...prev, created as CustomAction])
    } catch (err) {
      console.error('Failed to create custom action:', err)
    }
  }, [])

  const updateAction = useCallback(async (data: CustomActionUpdate) => {
    if (!window.api) return
    try {
      const updated = await window.api.updateCustomAction(data)
      if (updated) {
        setCustomActions(prev => prev.map(a => a.id === data.id ? updated as CustomAction : a))
      }
    } catch (err) {
      console.error('Failed to update custom action:', err)
    }
  }, [])

  const deleteAction = useCallback(async (id: string) => {
    if (!window.api) return
    try {
      await window.api.deleteCustomAction(id)
      setCustomActions(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      console.error('Failed to delete custom action:', err)
    }
  }, [])

  // Document context CRUD
  const setDocContext = useCallback(async (docId: string, instructions: string, enabled?: number) => {
    if (!window.api) return
    try {
      const ctx = await window.api.setDocumentAIContext(docId, instructions, enabled)
      setDocumentContext(ctx as DocumentAIContext)
    } catch (err) {
      console.error('Failed to set document AI context:', err)
    }
  }, [])

  const deleteDocContext = useCallback(async (docId: string) => {
    if (!window.api) return
    try {
      await window.api.deleteDocumentAIContext(docId)
      setDocumentContext(null)
    } catch (err) {
      console.error('Failed to delete document AI context:', err)
    }
  }, [])

  // Build AICustomization object for passing to askAI
  const buildCustomization = useCallback((): AICustomization | undefined => {
    if (!preferences) return undefined

    const customization: AICustomization = {}

    // Response style
    if (preferences.tone !== 'standard') customization.tone = preferences.tone
    if (preferences.response_length !== 'standard') customization.responseLength = preferences.response_length
    if (preferences.response_format !== 'prose') customization.responseFormat = preferences.response_format

    // Custom system prompt
    if (preferences.custom_system_prompt_enabled && preferences.custom_system_prompt) {
      customization.customSystemPrompt = preferences.custom_system_prompt
    }

    // Document-specific context
    if (documentContext?.enabled && documentContext?.context_instructions) {
      customization.documentContext = documentContext.context_instructions
    }

    // Model & parameter overrides
    if (preferences.temperature != null) customization.temperature = preferences.temperature
    if (preferences.max_tokens != null) customization.maxTokens = preferences.max_tokens

    // Check if any non-default values exist
    const hasCustomization = Object.keys(customization).length > 0
    return hasCustomization ? customization : undefined
  }, [preferences, documentContext])

  // Get model override for a specific provider
  const getModelForProvider = useCallback((providerId: string): string | null => {
    if (!preferences) return null
    switch (providerId) {
      case 'openai': return preferences.model_openai
      case 'anthropic': return preferences.model_anthropic
      case 'gemini': return preferences.model_gemini
      case 'ollama': return preferences.model_ollama
      default: return null
    }
  }, [preferences])

  return {
    preferences,
    customActions,
    documentContext,
    isLoading,
    updatePreferences,
    createAction,
    updateAction,
    deleteAction,
    setDocContext,
    deleteDocContext,
    buildCustomization,
    getModelForProvider,
  }
}
