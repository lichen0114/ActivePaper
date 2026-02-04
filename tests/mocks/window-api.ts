import { vi } from 'vitest'

export interface MockProviderInfo {
  id: string
  name: string
  type: 'local' | 'cloud'
  available?: boolean
}

// Default mock providers
export const mockProviders: MockProviderInfo[] = [
  { id: 'ollama', name: 'Ollama (Local)', type: 'local', available: true },
  { id: 'openai', name: 'OpenAI', type: 'cloud', available: false },
  { id: 'anthropic', name: 'Claude', type: 'cloud', available: false },
  { id: 'gemini', name: 'Gemini', type: 'cloud', available: false },
]

// Mock data stores for testing
const mockDocuments: Map<string, MockDocument> = new Map()
const mockConversations: Map<string, MockConversation> = new Map()
const mockConversationMessages: Map<string, MockConversationMessage[]> = new Map()
const mockHighlights: Map<string, MockHighlight> = new Map()
const mockBookmarks: Map<string, MockBookmark> = new Map()
const mockReviewCards: Map<string, MockReviewCard> = new Map()

export interface MockDocument {
  id: string
  filename: string
  filepath: string
  last_opened_at: number
  scroll_position: number
  total_pages: number | null
  created_at: number
}

export interface MockConversation {
  id: string
  document_id: string
  highlight_id: string | null
  selected_text: string
  page_context: string | null
  page_number: number | null
  title: string | null
  created_at: number
  updated_at: number
}

export interface MockConversationMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  action_type: string | null
  created_at: number
}

export interface MockHighlight {
  id: string
  document_id: string
  page_number: number
  start_offset: number
  end_offset: number
  selected_text: string
  color: string
  note: string | null
  created_at: number
  updated_at: number
}

export interface MockBookmark {
  id: string
  document_id: string
  page_number: number
  label: string | null
  created_at: number
}

export interface MockReviewCard {
  id: string
  interaction_id: string
  question: string
  answer: string
  next_review_at: number
  interval_days: number
  ease_factor: number
  review_count: number
  created_at: number
  selected_text?: string
  document_filename?: string
  action_type?: string
}

export interface MockSearchResults {
  documents: Array<{ id: string; filename: string; filepath: string; last_opened_at: number; rank: number }>
  interactions: Array<{ id: string; document_id: string; action_type: string; selected_text: string; response: string; page_number: number | null; created_at: number; filename: string; rank: number; snippet: string }>
  concepts: Array<{ id: string; name: string; created_at: number; rank: number }>
}

// Helper to generate UUIDs for tests
function mockUUID(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Clear all mock stores (call in beforeEach/afterEach)
export function clearMockStores(): void {
  mockDocuments.clear()
  mockConversations.clear()
  mockConversationMessages.clear()
  mockHighlights.clear()
  mockBookmarks.clear()
  mockReviewCards.clear()
}

// Create mock window.api
export function createMockWindowApi() {
  return {
    // AI methods
    askAI: vi.fn(
      async (
        _text: string,
        _context: string,
        _providerId?: string,
        _action?: string,
        _conversationHistory?: unknown[],
        onChunk?: (chunk: string) => void,
        onDone?: () => void,
        _onError?: (error: string) => void
      ) => {
        // Simulate streaming response
        if (onChunk) {
          onChunk('This is ')
          onChunk('a test ')
          onChunk('response.')
        }
        if (onDone) {
          onDone()
        }
      }
    ),

    // Provider methods
    getProviders: vi.fn(async () => mockProviders),
    getCurrentProvider: vi.fn(async () => mockProviders[0]),
    setCurrentProvider: vi.fn(async () => true),
    setApiKey: vi.fn(async () => true),
    hasApiKey: vi.fn(async () => false),
    deleteApiKey: vi.fn(async () => true),

    // File methods
    readFile: vi.fn(async () => new ArrayBuffer(0)),
    getFilePath: vi.fn((file: { name: string }) => `/mock/path/${file.name}`),
    openFileDialog: vi.fn(async () => null),
    onFileOpened: vi.fn(() => () => {}),
    onTabCloseRequested: vi.fn(() => () => {}),

    // Document methods
    getRecentDocuments: vi.fn(async () => Array.from(mockDocuments.values())),
    getAllDocuments: vi.fn(async () => Array.from(mockDocuments.values())),
    getDocumentById: vi.fn(async (id: string) => mockDocuments.get(id) ?? null),
    getOrCreateDocument: vi.fn(async (data: { filename: string; filepath: string; total_pages?: number }) => {
      // Check if already exists
      for (const doc of mockDocuments.values()) {
        if (doc.filepath === data.filepath) {
          doc.last_opened_at = Date.now()
          return doc
        }
      }
      const now = Date.now()
      const newDoc: MockDocument = {
        id: mockUUID(),
        filename: data.filename,
        filepath: data.filepath,
        last_opened_at: now,
        scroll_position: 0,
        total_pages: data.total_pages ?? null,
        created_at: now,
      }
      mockDocuments.set(newDoc.id, newDoc)
      return newDoc
    }),
    updateDocument: vi.fn(async (data: { id: string; scroll_position?: number; total_pages?: number }) => {
      const doc = mockDocuments.get(data.id)
      if (!doc) return false
      if (data.scroll_position !== undefined) doc.scroll_position = data.scroll_position
      if (data.total_pages !== undefined) doc.total_pages = data.total_pages
      return true
    }),

    // Interaction methods
    saveInteraction: vi.fn(async () => ({ id: mockUUID(), created_at: Date.now() })),
    getInteractionsByDocument: vi.fn(async () => []),
    getRecentInteractions: vi.fn(async () => []),
    getActivityByDay: vi.fn(async () => []),
    getDocumentActivityStats: vi.fn(async () => []),

    // Concept methods
    getConceptGraph: vi.fn(async () => ({ nodes: [], links: [] })),
    saveConcepts: vi.fn(async () => []),
    extractConcepts: vi.fn(async () => []),
    getConceptsForDocument: vi.fn(async () => []),
    getDocumentsForConcept: vi.fn(async () => []),

    // Conversation methods
    createConversation: vi.fn(async (data: {
      document_id: string
      selected_text: string
      highlight_id?: string
      page_context?: string
      page_number?: number
      title?: string
    }) => {
      const now = Date.now()
      const conv: MockConversation = {
        id: mockUUID(),
        document_id: data.document_id,
        highlight_id: data.highlight_id ?? null,
        selected_text: data.selected_text,
        page_context: data.page_context ?? null,
        page_number: data.page_number ?? null,
        title: data.title ?? null,
        created_at: now,
        updated_at: now,
      }
      mockConversations.set(conv.id, conv)
      mockConversationMessages.set(conv.id, [])
      return conv
    }),
    getConversationWithMessages: vi.fn(async (id: string) => {
      const conv = mockConversations.get(id)
      if (!conv) return null
      const messages = mockConversationMessages.get(id) ?? []
      return { ...conv, messages }
    }),
    addConversationMessage: vi.fn(async (conversationId: string, role: 'user' | 'assistant', content: string, actionType?: string) => {
      const now = Date.now()
      const msg: MockConversationMessage = {
        id: mockUUID(),
        conversation_id: conversationId,
        role,
        content,
        action_type: actionType ?? null,
        created_at: now,
      }
      const messages = mockConversationMessages.get(conversationId) ?? []
      messages.push(msg)
      mockConversationMessages.set(conversationId, messages)
      // Update conversation updated_at
      const conv = mockConversations.get(conversationId)
      if (conv) conv.updated_at = now
      return msg
    }),
    updateConversationTitle: vi.fn(async (id: string, title: string) => {
      const conv = mockConversations.get(id)
      if (!conv) return false
      conv.title = title
      conv.updated_at = Date.now()
      return true
    }),
    deleteConversation: vi.fn(async (id: string) => {
      const existed = mockConversations.has(id)
      mockConversations.delete(id)
      mockConversationMessages.delete(id)
      return existed
    }),
    getConversationsByDocument: vi.fn(async (documentId: string) => {
      const results: Array<{
        id: string
        document_id: string
        selected_text: string
        title: string | null
        message_count: number
        created_at: number
        updated_at: number
        last_message_preview: string | null
      }> = []
      for (const conv of mockConversations.values()) {
        if (conv.document_id === documentId) {
          const messages = mockConversationMessages.get(conv.id) ?? []
          const lastMsg = messages[messages.length - 1]
          results.push({
            id: conv.id,
            document_id: conv.document_id,
            selected_text: conv.selected_text,
            title: conv.title,
            message_count: messages.length,
            created_at: conv.created_at,
            updated_at: conv.updated_at,
            last_message_preview: lastMsg?.content ?? null,
          })
        }
      }
      return results.sort((a, b) => b.updated_at - a.updated_at)
    }),
    getRecentConversations: vi.fn(async (limit = 10) => {
      const results: Array<{
        id: string
        document_id: string
        selected_text: string
        title: string | null
        message_count: number
        created_at: number
        updated_at: number
        last_message_preview: string | null
      }> = []
      for (const conv of mockConversations.values()) {
        const messages = mockConversationMessages.get(conv.id) ?? []
        const lastMsg = messages[messages.length - 1]
        results.push({
          id: conv.id,
          document_id: conv.document_id,
          selected_text: conv.selected_text,
          title: conv.title,
          message_count: messages.length,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          last_message_preview: lastMsg?.content ?? null,
        })
      }
      return results.sort((a, b) => b.updated_at - a.updated_at).slice(0, limit)
    }),
    getConversationMessages: vi.fn(async (conversationId: string) => {
      return mockConversationMessages.get(conversationId) ?? []
    }),

    // Highlight methods
    createHighlight: vi.fn(async (data: {
      document_id: string
      page_number: number
      start_offset: number
      end_offset: number
      selected_text: string
      color?: string
      note?: string
    }) => {
      const now = Date.now()
      const highlight: MockHighlight = {
        id: mockUUID(),
        document_id: data.document_id,
        page_number: data.page_number,
        start_offset: data.start_offset,
        end_offset: data.end_offset,
        selected_text: data.selected_text,
        color: data.color ?? 'yellow',
        note: data.note ?? null,
        created_at: now,
        updated_at: now,
      }
      mockHighlights.set(highlight.id, highlight)
      return highlight
    }),
    updateHighlight: vi.fn(async (data: { id: string; color?: string; note?: string }) => {
      const highlight = mockHighlights.get(data.id)
      if (!highlight) return null
      if (data.color !== undefined) highlight.color = data.color
      if (data.note !== undefined) highlight.note = data.note
      highlight.updated_at = Date.now()
      return highlight
    }),
    deleteHighlight: vi.fn(async (id: string) => {
      const existed = mockHighlights.has(id)
      mockHighlights.delete(id)
      return existed
    }),
    getHighlightsByDocument: vi.fn(async (documentId: string) => {
      return Array.from(mockHighlights.values()).filter(h => h.document_id === documentId)
    }),
    getHighlightsByPage: vi.fn(async (documentId: string, pageNumber: number) => {
      return Array.from(mockHighlights.values()).filter(
        h => h.document_id === documentId && h.page_number === pageNumber
      )
    }),
    getHighlightsWithNotes: vi.fn(async (documentId: string) => {
      return Array.from(mockHighlights.values()).filter(
        h => h.document_id === documentId && h.note !== null
      )
    }),

    // Bookmark methods
    toggleBookmark: vi.fn(async (data: { document_id: string; page_number: number; label?: string }) => {
      // Check if bookmark exists
      for (const [id, bookmark] of mockBookmarks) {
        if (bookmark.document_id === data.document_id && bookmark.page_number === data.page_number) {
          mockBookmarks.delete(id)
          return null // Removed
        }
      }
      // Create new bookmark
      const now = Date.now()
      const bookmark: MockBookmark = {
        id: mockUUID(),
        document_id: data.document_id,
        page_number: data.page_number,
        label: data.label ?? null,
        created_at: now,
      }
      mockBookmarks.set(bookmark.id, bookmark)
      return bookmark
    }),
    updateBookmarkLabel: vi.fn(async (id: string, label: string | null) => {
      const bookmark = mockBookmarks.get(id)
      if (!bookmark) return false
      bookmark.label = label
      return true
    }),
    deleteBookmark: vi.fn(async (id: string) => {
      const existed = mockBookmarks.has(id)
      mockBookmarks.delete(id)
      return existed
    }),
    getBookmarksByDocument: vi.fn(async (documentId: string) => {
      return Array.from(mockBookmarks.values()).filter(b => b.document_id === documentId)
    }),
    isPageBookmarked: vi.fn(async (documentId: string, pageNumber: number) => {
      return Array.from(mockBookmarks.values()).some(
        b => b.document_id === documentId && b.page_number === pageNumber
      )
    }),

    // Review card methods
    getNextReviewCard: vi.fn(async () => {
      const now = Date.now()
      const dueCards = Array.from(mockReviewCards.values())
        .filter(c => c.next_review_at <= now)
        .sort((a, b) => a.next_review_at - b.next_review_at)
      return dueCards[0] ?? null
    }),
    updateReviewCard: vi.fn(async (data: { cardId: string; quality: number }) => {
      const card = mockReviewCards.get(data.cardId)
      if (!card) return null
      // Simplified SM-2 for mock
      if (data.quality < 3) {
        card.interval_days = 1
        card.review_count = 0
      } else {
        card.review_count++
        card.interval_days = Math.round(card.interval_days * card.ease_factor)
      }
      card.next_review_at = Date.now() + card.interval_days * 24 * 60 * 60 * 1000
      return card
    }),
    createReviewCard: vi.fn(async (data: { interaction_id: string; question: string; answer: string }) => {
      const now = Date.now()
      const card: MockReviewCard = {
        id: mockUUID(),
        interaction_id: data.interaction_id,
        question: data.question,
        answer: data.answer,
        next_review_at: now + 24 * 60 * 60 * 1000,
        interval_days: 1,
        ease_factor: 2.5,
        review_count: 0,
        created_at: now,
      }
      mockReviewCards.set(card.id, card)
      return card
    }),
    getDueReviewCount: vi.fn(async () => {
      const now = Date.now()
      return Array.from(mockReviewCards.values()).filter(c => c.next_review_at <= now).length
    }),
    getAllReviewCards: vi.fn(async () => Array.from(mockReviewCards.values())),

    // Search methods
    searchDocuments: vi.fn(async (_query: string, _limit?: number) => []),
    searchInteractions: vi.fn(async (_query: string, _limit?: number) => []),
    searchConcepts: vi.fn(async (_query: string, _limit?: number) => []),
    searchAll: vi.fn(async (_query: string, _limitPerType?: number): Promise<MockSearchResults> => ({
      documents: [],
      interactions: [],
      concepts: [],
    })),
    searchInteractionsInDocument: vi.fn(async (_documentId: string, _query: string, _limit?: number) => []),
  }
}

// Setup window.api mock
export function setupWindowApiMock(customApi?: ReturnType<typeof createMockWindowApi>) {
  const api = customApi || createMockWindowApi()
  ;(globalThis as typeof globalThis & { window: { api: typeof api } }).window = {
    ...globalThis.window,
    api,
  }
  return api
}

// Reset window.api mock
export function resetWindowApiMock() {
  const api = createMockWindowApi()
  setupWindowApiMock(api)
  return api
}
