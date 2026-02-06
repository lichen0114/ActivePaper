import type { AIProvider, CompletionRequest, ConversationMessage } from './index'
import { buildSystemPrompt, buildUserMessage, getTemperature, getMaxTokens, getModel } from './prompt-builder'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const DEFAULT_MODEL = 'gemini-3-pro-preview'

export class GeminiProvider implements AIProvider {
  id = 'gemini'
  name = 'Gemini'
  type: 'cloud' = 'cloud'

  constructor(private apiKey: string) {}

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey && this.apiKey.length > 0
  }

  async *complete(request: CompletionRequest): AsyncIterable<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured')
    }

    const model = getModel(this.id, request.customization, DEFAULT_MODEL)
    const temperature = getTemperature(request.customization, 0.7)
    const maxOutputTokens = getMaxTokens(request.customization, 2048)
    const contents = this.buildContents(request)

    const response = await fetch(`${GEMINI_API_BASE}/${model}:streamGenerateContent?alt=sse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Gemini error: ${response.status} - ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n').filter(line => line.trim())

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6))
              const content = json.candidates?.[0]?.content?.parts?.[0]?.text
              if (content) {
                yield content
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  private buildContents(request: CompletionRequest): Array<{ role: string; parts: Array<{ text: string }> }> {
    const action = request.action || 'explain'

    // If there's conversation history (follow-up), include system context and history
    if (request.conversationHistory && request.conversationHistory.length > 0) {
      const systemPrompt = buildSystemPrompt(request.customization)
      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []

      // Gemini doesn't have a system role, so prepend system prompt as the first user message
      // if it differs from default, then pair with a model acknowledgment
      if (systemPrompt !== 'You are a helpful AI assistant helping a user understand a PDF document.') {
        contents.push({ role: 'user', parts: [{ text: systemPrompt }] })
        contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] })
      }

      contents.push(...request.conversationHistory.map((msg: ConversationMessage) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })))

      return contents
    }

    const userMessage = buildUserMessage(
      request.text, request.context, action,
      request.customization, request.customPromptTemplate
    )
    return [{ role: 'user', parts: [{ text: userMessage }] }]
  }
}
