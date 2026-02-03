import { useState, useCallback } from 'react'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface ConversationState {
  messages: Message[]
  selectedText: string
  pageContext: string
}

export function useConversation() {
  const [conversation, setConversation] = useState<ConversationState | null>(null)

  const startConversation = useCallback((selectedText: string, pageContext: string) => {
    setConversation({ messages: [], selectedText, pageContext })
  }, [])

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    setConversation(prev => prev ? {
      ...prev,
      messages: [...prev.messages, { role, content }]
    } : null)
  }, [])

  const updateLastAssistantMessage = useCallback((content: string) => {
    setConversation(prev => {
      if (!prev) return null
      const messages = [...prev.messages]
      const lastIndex = messages.length - 1
      if (lastIndex >= 0 && messages[lastIndex].role === 'assistant') {
        messages[lastIndex] = { ...messages[lastIndex], content }
      }
      return { ...prev, messages }
    })
  }, [])

  const appendToLastAssistantMessage = useCallback((chunk: string) => {
    setConversation(prev => {
      if (!prev) return null
      const messages = [...prev.messages]
      const lastIndex = messages.length - 1
      if (lastIndex >= 0 && messages[lastIndex].role === 'assistant') {
        messages[lastIndex] = {
          ...messages[lastIndex],
          content: messages[lastIndex].content + chunk
        }
      }
      return { ...prev, messages }
    })
  }, [])

  const clearConversation = useCallback(() => {
    setConversation(null)
  }, [])

  return {
    conversation,
    startConversation,
    addMessage,
    updateLastAssistantMessage,
    appendToLastAssistantMessage,
    clearConversation,
  }
}
