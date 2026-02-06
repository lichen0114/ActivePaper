import type { AIProvider, CompletionRequest, ConversationMessage } from './index'
import { buildSystemPrompt, buildUserMessage, getMaxTokens, getModel } from './prompt-builder'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-3-5-haiku-latest'

export class AnthropicProvider implements AIProvider {
  id = 'anthropic'
  name = 'Claude'
  type: 'cloud' = 'cloud'

  constructor(private apiKey: string) {}

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey && this.apiKey.length > 0
  }

  async *complete(request: CompletionRequest): AsyncIterable<string> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured')
    }

    const model = getModel(this.id, request.customization, DEFAULT_MODEL)
    const max_tokens = getMaxTokens(request.customization, 2048)
    const { systemPrompt, messages } = this.buildMessages(request)

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens,
        system: systemPrompt,
        messages,
        stream: true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic error: ${response.status} - ${error}`)
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
              if (json.type === 'content_block_delta' && json.delta?.text) {
                yield json.delta.text
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

  private buildMessages(request: CompletionRequest): { systemPrompt: string; messages: Array<{ role: string; content: string }> } {
    const systemPrompt = buildSystemPrompt(request.customization)
    const action = request.action || 'explain'

    // If there's conversation history (follow-up), include it
    if (request.conversationHistory && request.conversationHistory.length > 0) {
      const messages = request.conversationHistory.map((msg: ConversationMessage) => ({
        role: msg.role,
        content: msg.content
      }))
      return { systemPrompt, messages }
    }

    const userMessage = buildUserMessage(
      request.text, request.context, action,
      request.customization, request.customPromptTemplate
    )

    return { systemPrompt, messages: [{ role: 'user', content: userMessage }] }
  }
}
