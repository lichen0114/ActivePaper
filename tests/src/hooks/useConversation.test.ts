import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useConversation } from '@/hooks/useConversation'

describe('useConversation', () => {
  let mockWindowApi: {
    createConversation: ReturnType<typeof vi.fn>
    getConversationWithMessages: ReturnType<typeof vi.fn>
    addConversationMessage: ReturnType<typeof vi.fn>
    getConversationsByDocument: ReturnType<typeof vi.fn>
    deleteConversation: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockWindowApi = {
      createConversation: vi.fn(async (data: { document_id: string; selected_text: string }) => ({
        id: `conv-${Date.now()}`,
        document_id: data.document_id,
        highlight_id: null,
        selected_text: data.selected_text,
        page_context: null,
        page_number: null,
        title: null,
        created_at: Date.now(),
        updated_at: Date.now(),
      })),
      getConversationWithMessages: vi.fn(async (id: string) => ({
        id,
        document_id: 'doc-1',
        highlight_id: null,
        selected_text: 'Test text',
        page_context: 'Test context',
        page_number: 1,
        title: 'Test Title',
        created_at: Date.now() - 1000,
        updated_at: Date.now(),
        messages: [
          { id: 'msg-1', conversation_id: id, role: 'user', content: 'Hello', action_type: null, created_at: Date.now() - 500 },
          { id: 'msg-2', conversation_id: id, role: 'assistant', content: 'Hi there!', action_type: null, created_at: Date.now() },
        ],
      })),
      addConversationMessage: vi.fn(async (conversationId: string, role: string, content: string, actionType?: string) => ({
        id: `msg-${Date.now()}`,
        conversation_id: conversationId,
        role,
        content,
        action_type: actionType || null,
        created_at: Date.now(),
      })),
      getConversationsByDocument: vi.fn(async () => [
        {
          id: 'conv-1',
          document_id: 'doc-1',
          selected_text: 'First conversation',
          title: 'Title 1',
          message_count: 5,
          created_at: Date.now() - 2000,
          updated_at: Date.now() - 1000,
          last_message_preview: 'Last message in conv 1',
        },
        {
          id: 'conv-2',
          document_id: 'doc-1',
          selected_text: 'Second conversation',
          title: null,
          message_count: 2,
          created_at: Date.now() - 1000,
          updated_at: Date.now(),
          last_message_preview: 'Last message in conv 2',
        },
      ]),
      deleteConversation: vi.fn(async () => true),
    }
    ;(window as Window & { api: typeof mockWindowApi }).api = mockWindowApi
  })

  afterEach(() => {
    vi.clearAllMocks()
    delete (window as Window & { api?: typeof mockWindowApi }).api
  })

  describe('initial state', () => {
    it('starts with null conversation', () => {
      const { result } = renderHook(() => useConversation())

      expect(result.current.conversationId).toBeNull()
      expect(result.current.conversation).toBeNull()
      expect(result.current.conversations).toEqual([])
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('startConversation', () => {
    it('creates conversation via API', async () => {
      const { result } = renderHook(() => useConversation())

      let conversationId: string | null = null

      await act(async () => {
        conversationId = await result.current.startConversation(
          'Selected text',
          'Page context',
          'doc-1',
          5
        )
      })

      expect(mockWindowApi.createConversation).toHaveBeenCalledWith({
        document_id: 'doc-1',
        selected_text: 'Selected text',
        page_context: 'Page context',
        page_number: 5,
      })
      expect(conversationId).toBeDefined()
      expect(result.current.conversationId).toBe(conversationId)
    })

    it('sets local state with conversation details', async () => {
      const { result } = renderHook(() => useConversation())

      await act(async () => {
        await result.current.startConversation(
          'Selected text',
          'Page context',
          'doc-1',
          5
        )
      })

      expect(result.current.conversation).not.toBeNull()
      expect(result.current.conversation!.selectedText).toBe('Selected text')
      expect(result.current.conversation!.pageContext).toBe('Page context')
      expect(result.current.conversation!.pageNumber).toBe(5)
      expect(result.current.conversation!.messages).toEqual([])
    })

    it('falls back to in-memory on API failure', async () => {
      mockWindowApi.createConversation.mockRejectedValue(new Error('API error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useConversation())

      await act(async () => {
        const id = await result.current.startConversation(
          'Selected text',
          'Page context',
          'doc-1'
        )
        expect(id).toBeNull()
      })

      // Should still set up conversation state locally
      expect(result.current.conversation).not.toBeNull()
      expect(result.current.conversationId).toBeNull() // But no ID
      expect(result.current.conversation!.selectedText).toBe('Selected text')

      consoleSpy.mockRestore()
    })
  })

  describe('loadConversation', () => {
    it('loads conversation with messages from API', async () => {
      const { result } = renderHook(() => useConversation())

      await act(async () => {
        await result.current.loadConversation('conv-existing')
      })

      expect(mockWindowApi.getConversationWithMessages).toHaveBeenCalledWith('conv-existing')
      expect(result.current.conversationId).toBe('conv-existing')
      expect(result.current.conversation!.messages).toHaveLength(2)
      expect(result.current.conversation!.messages[0].role).toBe('user')
      expect(result.current.conversation!.messages[1].role).toBe('assistant')
    })

    it('sets isLoading during load', async () => {
      const { result } = renderHook(() => useConversation())

      // Make the API call slow
      mockWindowApi.getConversationWithMessages.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return {
          id: 'conv-1',
          document_id: 'doc-1',
          selected_text: 'Text',
          messages: [],
        }
      })

      act(() => {
        result.current.loadConversation('conv-1')
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('handles load failure gracefully', async () => {
      mockWindowApi.getConversationWithMessages.mockRejectedValue(new Error('Load failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useConversation())

      await act(async () => {
        await result.current.loadConversation('conv-1')
      })

      expect(result.current.isLoading).toBe(false)
      // Should not crash, conversation remains null
      consoleSpy.mockRestore()
    })
  })

  describe('listConversations', () => {
    it('fetches conversations for a document', async () => {
      const { result } = renderHook(() => useConversation())

      await act(async () => {
        await result.current.listConversations('doc-1')
      })

      expect(mockWindowApi.getConversationsByDocument).toHaveBeenCalledWith('doc-1')
      expect(result.current.conversations).toHaveLength(2)
    })
  })

  describe('addMessage', () => {
    it('updates local state immediately', async () => {
      const { result } = renderHook(() => useConversation())

      await act(async () => {
        await result.current.startConversation('Text', 'Context', 'doc-1')
      })

      await act(async () => {
        await result.current.addMessage('user', 'My question')
      })

      expect(result.current.conversation!.messages).toHaveLength(1)
      expect(result.current.conversation!.messages[0].role).toBe('user')
      expect(result.current.conversation!.messages[0].content).toBe('My question')
    })

    it('queues message for persistence', async () => {
      const { result } = renderHook(() => useConversation())

      await act(async () => {
        await result.current.startConversation('Text', 'Context', 'doc-1')
      })

      const convId = result.current.conversationId

      await act(async () => {
        await result.current.addMessage('user', 'Question', 'explain')
      })

      // The persistence happens via useEffect when isLoading is false
      await waitFor(() => {
        expect(mockWindowApi.addConversationMessage).toHaveBeenCalledWith(
          convId,
          'user',
          'Question',
          'explain'
        )
      })
    })
  })

  describe('updateLastAssistantMessage', () => {
    it('replaces content of last assistant message', async () => {
      const { result } = renderHook(() => useConversation())

      await act(async () => {
        await result.current.startConversation('Text', 'Context', 'doc-1')
        await result.current.addMessage('user', 'Question')
        await result.current.addMessage('assistant', 'Initial response')
      })

      act(() => {
        result.current.updateLastAssistantMessage('Updated response')
      })

      const messages = result.current.conversation!.messages
      expect(messages[messages.length - 1].content).toBe('Updated response')
    })

    it('does nothing if last message is not assistant', async () => {
      const { result } = renderHook(() => useConversation())

      await act(async () => {
        await result.current.startConversation('Text', 'Context', 'doc-1')
        await result.current.addMessage('user', 'Question')
      })

      act(() => {
        result.current.updateLastAssistantMessage('This should not apply')
      })

      const messages = result.current.conversation!.messages
      expect(messages[0].content).toBe('Question')
    })
  })

  describe('appendToLastAssistantMessage', () => {
    it('appends chunk to last assistant message', async () => {
      const { result } = renderHook(() => useConversation())

      await act(async () => {
        await result.current.startConversation('Text', 'Context', 'doc-1')
        await result.current.addMessage('assistant', 'Start')
      })

      act(() => {
        result.current.appendToLastAssistantMessage(' middle')
      })

      act(() => {
        result.current.appendToLastAssistantMessage(' end')
      })

      const messages = result.current.conversation!.messages
      expect(messages[0].content).toBe('Start middle end')
    })
  })

  describe('clearConversation', () => {
    it('resets conversation state', async () => {
      const { result } = renderHook(() => useConversation())

      await act(async () => {
        await result.current.startConversation('Text', 'Context', 'doc-1')
        await result.current.addMessage('user', 'Question')
      })

      act(() => {
        result.current.clearConversation()
      })

      expect(result.current.conversationId).toBeNull()
      expect(result.current.conversation).toBeNull()
    })
  })

  describe('deleteConversation', () => {
    it('calls API and removes from list', async () => {
      const { result } = renderHook(() => useConversation())

      await act(async () => {
        await result.current.listConversations('doc-1')
      })

      expect(result.current.conversations).toHaveLength(2)

      await act(async () => {
        await result.current.deleteConversation('conv-1')
      })

      expect(mockWindowApi.deleteConversation).toHaveBeenCalledWith('conv-1')
      expect(result.current.conversations).toHaveLength(1)
      expect(result.current.conversations[0].id).toBe('conv-2')
    })

    it('clears active conversation if deleted', async () => {
      const { result } = renderHook(() => useConversation())

      await act(async () => {
        await result.current.startConversation('Text', 'Context', 'doc-1')
      })

      const convId = result.current.conversationId!

      await act(async () => {
        await result.current.deleteConversation(convId)
      })

      expect(result.current.conversationId).toBeNull()
      expect(result.current.conversation).toBeNull()
    })

    it('handles delete failure gracefully', async () => {
      mockWindowApi.deleteConversation.mockRejectedValue(new Error('Delete failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useConversation())

      await act(async () => {
        await result.current.listConversations('doc-1')
      })

      const originalLength = result.current.conversations.length

      await act(async () => {
        await result.current.deleteConversation('conv-1')
      })

      // Should not remove from list on failure
      expect(result.current.conversations).toHaveLength(originalLength)
      consoleSpy.mockRestore()
    })
  })
})
