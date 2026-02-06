import type { AIProvider, CompletionRequest, ConversationMessage } from './index'
import { buildSystemPrompt, buildUserMessage, getTemperature, getMaxTokens, getModel } from './prompt-builder'

const OLLAMA_BASE_URL = 'http://localhost:11434'
const DEFAULT_MODEL = 'llama3.2'

export class OllamaProvider implements AIProvider {
  id = 'ollama'
  name = 'Ollama (Local)'
  type: 'local' = 'local'

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  async *complete(request: CompletionRequest): AsyncIterable<string> {
    const model = getModel(this.id, request.customization, DEFAULT_MODEL)
    const temperature = getTemperature(request.customization, 0.7)
    const num_predict = getMaxTokens(request.customization, 2048)

    // If there's conversation history, use chat endpoint
    if (request.conversationHistory && request.conversationHistory.length > 0) {
      yield* this.completeChat(request, model, temperature, num_predict)
      return
    }

    const action = request.action || 'explain'
    const systemPrompt = buildSystemPrompt(request.customization)
    const userMessage = buildUserMessage(
      request.text, request.context, action,
      request.customization, request.customPromptTemplate
    )
    const prompt = `${systemPrompt}\n\n${userMessage}`

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
        options: {
          temperature,
          num_predict,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`)
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
          try {
            const json = JSON.parse(line)
            if (json.response) {
              yield json.response
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  private async *completeChat(
    request: CompletionRequest,
    model: string,
    temperature: number,
    num_predict: number,
  ): AsyncIterable<string> {
    const systemPrompt = buildSystemPrompt(request.customization)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...request.conversationHistory!.map((msg: ConversationMessage) => ({
        role: msg.role,
        content: msg.content
      })),
    ]

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        options: {
          temperature,
          num_predict,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`)
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
          try {
            const json = JSON.parse(line)
            if (json.message?.content) {
              yield json.message.content
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}
