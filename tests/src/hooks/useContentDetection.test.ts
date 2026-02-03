import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useContentDetection } from '@/hooks/useContentDetection'

describe('useContentDetection', () => {
  it('updates zones immediately after detection and bounds update', () => {
    const { result } = renderHook(() => useContentDetection({ enabled: true }))

    const text = 'Here is $$E=mc^2$$ in a sentence.'
    const textLayer = document.createElement('div')
    const span = document.createElement('span')
    span.textContent = text

    const rect = new DOMRect(10, 20, 100, 20)
    span.getBoundingClientRect = vi.fn(() => rect) as unknown as () => DOMRect

    textLayer.appendChild(span)

    act(() => {
      result.current.detectPageContent(1, text)
      result.current.updateZoneBounds(1, textLayer)
    })

    expect(result.current.zones).toHaveLength(1)
    expect(result.current.zones[0].type).toBe('equation')
  })
})
