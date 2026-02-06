import type { AIProvider, CompletionRequest, ConversationMessage } from './index'
import { buildSystemPrompt, buildUserMessage, getTemperature, getMaxTokens, getModel } from './prompt-builder'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_MODEL = 'gpt-4o-mini'

export class OpenAIProvider implements AIProvider {
  id = 'openai'
  name = 'OpenAI'
  type: 'cloud' = 'cloud'

  constructor(private apiKey: string) {}

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey && this.apiKey.length > 0
  }

  async *complete(request: CompletionRequest): AsyncIterable<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const model = getModel(this.id, request.customization, DEFAULT_MODEL)
    const temperature = getTemperature(request.customization, 0.7)
    const max_tokens = getMaxTokens(request.customization, 2048)
    const messages = this.buildMessages(request)

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        max_tokens,
        temperature,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI error: ${response.status} - ${error}`)
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
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const json = JSON.parse(data)
              const content = json.choices?.[0]?.delta?.content
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

  private buildMessages(request: CompletionRequest): Array<{ role: string; content: string }> {
    const systemPrompt = buildSystemPrompt(request.customization)
    const action = request.action || 'explain'

    // If there's conversation history (follow-up), include it
    if (request.conversationHistory && request.conversationHistory.length > 0) {
      return [
        { role: 'system', content: systemPrompt },
        ...request.conversationHistory.map((msg: ConversationMessage) => ({
          role: msg.role,
          content: msg.content
        }))
      ]
    }

    const userMessage = buildUserMessage(
      request.text, request.context, action,
      request.customization, request.customPromptTemplate
    )

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]
  }
}
