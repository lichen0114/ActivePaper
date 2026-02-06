export type ResponseTone = 'standard' | 'formal' | 'casual' | 'technical' | 'eli5' | 'academic'
export type ResponseLength = 'concise' | 'standard' | 'detailed'
export type ResponseFormat = 'prose' | 'bullets' | 'step_by_step' | 'qa'

export interface AICustomization {
  tone?: ResponseTone
  responseLength?: ResponseLength
  responseFormat?: ResponseFormat
  customSystemPrompt?: string | null
  documentContext?: string | null
  temperature?: number | null
  maxTokens?: number | null
  model?: string | null
}

export interface AIPreferences {
  id: string
  tone: ResponseTone
  response_length: ResponseLength
  response_format: ResponseFormat
  custom_system_prompt: string | null
  custom_system_prompt_enabled: number
  temperature: number | null
  max_tokens: number | null
  model_openai: string | null
  model_anthropic: string | null
  model_gemini: string | null
  model_ollama: string | null
  created_at: number
  updated_at: number
}

export interface AIPreferencesUpdate {
  tone?: string
  response_length?: string
  response_format?: string
  custom_system_prompt?: string | null
  custom_system_prompt_enabled?: number
  temperature?: number | null
  max_tokens?: number | null
  model_openai?: string | null
  model_anthropic?: string | null
  model_gemini?: string | null
  model_ollama?: string | null
}

export interface CustomAction {
  id: string
  name: string
  emoji: string
  prompt_template: string
  sort_order: number
  enabled: number
  created_at: number
  updated_at: number
}

export interface CustomActionCreate {
  name: string
  emoji?: string
  prompt_template: string
  sort_order?: number
}

export interface CustomActionUpdate {
  id: string
  name?: string
  emoji?: string
  prompt_template?: string
  sort_order?: number
  enabled?: number
}

export interface DocumentAIContext {
  document_id: string
  context_instructions: string
  enabled: number
  created_at: number
  updated_at: number
}
