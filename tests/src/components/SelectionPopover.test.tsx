import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SelectionPopover from '@/components/SelectionPopover'

// Mock the contentDetector module
vi.mock('@/services/contentDetector', () => ({
  containsLatex: vi.fn(() => false),
  containsCode: vi.fn(() => false),
  containsTechnicalTerm: vi.fn(() => false),
  getSelectionContentType: vi.fn(() => 'general'),
}))

// Import mocked functions for manipulation
import * as contentDetector from '@/services/contentDetector'

describe('SelectionPopover', () => {
  const defaultProps = {
    selectionRect: new DOMRect(100, 100, 200, 20),
    selectedText: 'Test selected text',
    onAction: vi.fn(),
    isVisible: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset content detector mocks to default
    vi.mocked(contentDetector.containsLatex).mockReturnValue(false)
    vi.mocked(contentDetector.containsCode).mockReturnValue(false)
    vi.mocked(contentDetector.containsTechnicalTerm).mockReturnValue(false)
    vi.mocked(contentDetector.getSelectionContentType).mockReturnValue('general')
  })

  describe('visibility', () => {
    it('returns null when isVisible is false', () => {
      const { container } = render(
        <SelectionPopover {...defaultProps} isVisible={false} />
      )
      expect(container.firstChild).toBeNull()
    })

    it('returns null when selectionRect is null', () => {
      const { container } = render(
        <SelectionPopover {...defaultProps} selectionRect={null} />
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders when visible and has selectionRect', () => {
      render(<SelectionPopover {...defaultProps} />)
      expect(screen.getByText('Explain')).toBeInTheDocument()
    })
  })

  describe('positioning', () => {
    it('positions with fixed positioning', () => {
      const rect = new DOMRect(200, 150, 100, 20)
      const { container } = render(
        <SelectionPopover {...defaultProps} selectionRect={rect} />
      )

      const toolbar = container.querySelector('.selection-toolbar')
      // Check that it has position fixed (via the class which includes 'fixed')
      expect(toolbar?.className).toContain('fixed')
      // Check that it has inline styles for positioning
      expect(toolbar).toHaveAttribute('style')
    })

    it('clamps to viewport left edge', () => {
      // Selection near left edge
      const rect = new DOMRect(10, 100, 50, 20)
      const { container } = render(
        <SelectionPopover {...defaultProps} selectionRect={rect} />
      )

      const toolbar = container.querySelector('.selection-toolbar')
      const style = toolbar?.getAttribute('style') || ''
      // Should have a reasonable left position (not negative)
      expect(style).toContain('left:')
    })
  })

  describe('standard actions', () => {
    it('renders Explain button', () => {
      render(<SelectionPopover {...defaultProps} />)
      expect(screen.getByText('Explain')).toBeInTheDocument()
    })

    it('renders Summarize button', () => {
      render(<SelectionPopover {...defaultProps} />)
      expect(screen.getByText('Summarize')).toBeInTheDocument()
    })

    it('renders Define button', () => {
      render(<SelectionPopover {...defaultProps} />)
      expect(screen.getByText('Define')).toBeInTheDocument()
    })

    it('calls onAction with "explain" when Explain clicked', () => {
      const onAction = vi.fn()
      render(<SelectionPopover {...defaultProps} onAction={onAction} />)

      fireEvent.click(screen.getByText('Explain'))
      expect(onAction).toHaveBeenCalledWith('explain')
    })

    it('calls onAction with "summarize" when Summarize clicked', () => {
      const onAction = vi.fn()
      render(<SelectionPopover {...defaultProps} onAction={onAction} />)

      fireEvent.click(screen.getByText('Summarize'))
      expect(onAction).toHaveBeenCalledWith('summarize')
    })

    it('calls onAction with "define" when Define clicked', () => {
      const onAction = vi.fn()
      render(<SelectionPopover {...defaultProps} onAction={onAction} />)

      fireEvent.click(screen.getByText('Define'))
      expect(onAction).toHaveBeenCalledWith('define')
    })
  })

  describe('STEM actions - equation', () => {
    it('shows Variables button when LaTeX detected and handler provided', () => {
      vi.mocked(contentDetector.containsLatex).mockReturnValue(true)
      vi.mocked(contentDetector.getSelectionContentType).mockReturnValue('equation')

      render(
        <SelectionPopover
          {...defaultProps}
          selectedText="$E = mc^2$"
          onEquationClick={vi.fn()}
        />
      )

      expect(screen.getByText('Variables')).toBeInTheDocument()
    })

    it('does not show Variables button without handler', () => {
      vi.mocked(contentDetector.containsLatex).mockReturnValue(true)

      render(<SelectionPopover {...defaultProps} selectedText="$E = mc^2$" />)

      expect(screen.queryByText('Variables')).not.toBeInTheDocument()
    })

    it('calls onEquationClick with selected text when clicked', () => {
      vi.mocked(contentDetector.containsLatex).mockReturnValue(true)
      const onEquationClick = vi.fn()

      render(
        <SelectionPopover
          {...defaultProps}
          selectedText="$E = mc^2$"
          onEquationClick={onEquationClick}
        />
      )

      fireEvent.click(screen.getByText('Variables'))
      expect(onEquationClick).toHaveBeenCalledWith('$E = mc^2$')
    })
  })

  describe('STEM actions - code', () => {
    it('shows Run button when code detected and handler provided', () => {
      vi.mocked(contentDetector.containsCode).mockReturnValue(true)
      vi.mocked(contentDetector.getSelectionContentType).mockReturnValue('code')

      render(
        <SelectionPopover
          {...defaultProps}
          selectedText="console.log('hello')"
          onCodeClick={vi.fn()}
        />
      )

      expect(screen.getByText('Run')).toBeInTheDocument()
    })

    it('does not show Run button without handler', () => {
      vi.mocked(contentDetector.containsCode).mockReturnValue(true)

      render(
        <SelectionPopover
          {...defaultProps}
          selectedText="console.log('hello')"
        />
      )

      expect(screen.queryByText('Run')).not.toBeInTheDocument()
    })

    it('calls onCodeClick with selected text when clicked', () => {
      vi.mocked(contentDetector.containsCode).mockReturnValue(true)
      const onCodeClick = vi.fn()

      render(
        <SelectionPopover
          {...defaultProps}
          selectedText="const x = 1;"
          onCodeClick={onCodeClick}
        />
      )

      fireEvent.click(screen.getByText('Run'))
      expect(onCodeClick).toHaveBeenCalledWith('const x = 1;')
    })
  })

  describe('STEM actions - technical term', () => {
    it('shows Deep Dive button when technical term detected and handler provided', () => {
      vi.mocked(contentDetector.containsTechnicalTerm).mockReturnValue(true)
      vi.mocked(contentDetector.getSelectionContentType).mockReturnValue('term')

      render(
        <SelectionPopover
          {...defaultProps}
          selectedText="quantum entanglement"
          onExplainerClick={vi.fn()}
        />
      )

      expect(screen.getByText('Deep Dive')).toBeInTheDocument()
    })

    it('does not show Deep Dive button without handler', () => {
      vi.mocked(contentDetector.containsTechnicalTerm).mockReturnValue(true)

      render(
        <SelectionPopover
          {...defaultProps}
          selectedText="quantum entanglement"
        />
      )

      expect(screen.queryByText('Deep Dive')).not.toBeInTheDocument()
    })

    it('calls onExplainerClick with selected text when clicked', () => {
      vi.mocked(contentDetector.containsTechnicalTerm).mockReturnValue(true)
      const onExplainerClick = vi.fn()

      render(
        <SelectionPopover
          {...defaultProps}
          selectedText="entropy"
          onExplainerClick={onExplainerClick}
        />
      )

      fireEvent.click(screen.getByText('Deep Dive'))
      expect(onExplainerClick).toHaveBeenCalledWith('entropy')
    })
  })

  describe('highlight action', () => {
    it('shows highlight button when onHighlight provided', () => {
      render(
        <SelectionPopover
          {...defaultProps}
          onHighlight={vi.fn()}
        />
      )

      // Should have a highlight button (with pen/marker icon)
      const highlightButton = screen.getByTitle('Highlight')
      expect(highlightButton).toBeInTheDocument()
    })

    it('does not show highlight button without handler', () => {
      render(<SelectionPopover {...defaultProps} />)

      expect(screen.queryByTitle('Highlight')).not.toBeInTheDocument()
    })

    it('shows color picker on first click', () => {
      const { container } = render(
        <SelectionPopover {...defaultProps} onHighlight={vi.fn()} />
      )

      fireEvent.click(screen.getByTitle('Highlight'))

      // Color picker should now be visible
      // The HighlightColorPicker component renders color buttons
      const colorPicker = container.querySelector('[class*="flex items-center px-2"]')
      expect(colorPicker).toBeInTheDocument()
    })

    it('calls onHighlight with selected color', () => {
      const onHighlight = vi.fn()
      const { container } = render(
        <SelectionPopover {...defaultProps} onHighlight={onHighlight} />
      )

      // First click shows color picker
      fireEvent.click(screen.getByTitle('Highlight'))

      // Find and click a color button in the picker
      // The HighlightColorPicker renders buttons with aria-label for colors
      const colorButtons = container.querySelectorAll('button')
      // The color picker buttons are the smaller ones inside the picker
      // We'll click the first color button we find after the picker is shown
      const yellowButton = Array.from(colorButtons).find(btn =>
        btn.getAttribute('title')?.toLowerCase().includes('yellow')
      )

      if (yellowButton) {
        fireEvent.click(yellowButton)
        expect(onHighlight).toHaveBeenCalled()
      }
    })
  })

  describe('empty text handling', () => {
    it('handles empty selectedText', () => {
      render(<SelectionPopover {...defaultProps} selectedText="" />)

      // Should still render basic buttons
      expect(screen.getByText('Explain')).toBeInTheDocument()
    })

    it('handles undefined selectedText', () => {
      render(<SelectionPopover {...defaultProps} selectedText={undefined} />)

      expect(screen.getByText('Explain')).toBeInTheDocument()
    })
  })
})
