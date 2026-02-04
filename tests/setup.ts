import { afterAll, afterEach, beforeAll, vi } from 'vitest'

// Check if we're in a browser-like environment (jsdom)
const isBrowser = typeof window !== 'undefined'

// Only import these in jsdom environment
let cleanup: () => void
let server: { listen: (opts: { onUnhandledRequest: string }) => void; resetHandlers: () => void; close: () => void }

if (isBrowser) {
  // Import DOM-specific testing utilities
  import('@testing-library/jest-dom')
  const reactTesting = await import('@testing-library/react')
  cleanup = reactTesting.cleanup

  const msw = await import('msw/node')
  const { handlers } = await import('./mocks/handlers')
  server = msw.setupServer(...handlers)
}

// Start server before all tests (only in jsdom)
beforeAll(() => {
  if (isBrowser && server) {
    server.listen({ onUnhandledRequest: 'bypass' })
  }
})

// Reset handlers and cleanup after each test
afterEach(() => {
  if (isBrowser) {
    server?.resetHandlers()
    cleanup?.()
  }
  vi.clearAllMocks()
})

// Close server after all tests
afterAll(() => {
  if (isBrowser && server) {
    server.close()
  }
})

// Only setup browser mocks in jsdom environment
if (isBrowser) {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  // Mock ResizeObserver
  class ResizeObserverMock {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  }
  globalThis.ResizeObserver = ResizeObserverMock

  // Mock scrollTo
  window.scrollTo = vi.fn()

  // Mock getSelection for selection tests
  const mockSelection = {
    toString: vi.fn(() => ''),
    isCollapsed: true,
    getRangeAt: vi.fn(() => ({
      commonAncestorContainer: document.body,
    })),
    removeAllRanges: vi.fn(),
  }
  window.getSelection = vi.fn(() => mockSelection as unknown as Selection)

  // Export mock selection helper for tests
  ;(globalThis as unknown as { mockSelection: typeof mockSelection }).mockSelection = mockSelection
}

// Mock fetch for Node.js environment (providers use native fetch)
if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = vi.fn()
}

// Export mock selection helper for tests (for importing)
export const mockSelection = isBrowser
  ? (globalThis as unknown as { mockSelection: unknown }).mockSelection
  : null
