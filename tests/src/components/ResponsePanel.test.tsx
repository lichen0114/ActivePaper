import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ResponsePanel from '@/components/ResponsePanel'

describe('ResponsePanel', () => {
  const defaultProps = {
    isOpen: true,
    response: '',
    isLoading: false,
    error: null,
    selectedText: '',
    messages: [] as Array<{ role: 'user' | 'assistant'; content: string }>,
    onClose: vi.fn(),
    onFollowUp: vi.fn(),
    history: [],
    onHistorySelect: vi.fn(),
    currentAction: 'explain' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('visibility', () => {
    it('should render when isOpen is true', () => {
      render(<ResponsePanel {...defaultProps} />)

      expect(screen.getByText('Copilot')).toBeInTheDocument()
    })

    it('should be hidden when isOpen is false', () => {
      const { container } = render(<ResponsePanel {...defaultProps} isOpen={false} />)

      // Panel should have translate-x-full when closed
      const aside = container.querySelector('aside')
      expect(aside).toHaveClass('translate-x-full')
    })
  })

  describe('loading state', () => {
    it('should show loading indicator when isLoading is true', () => {
      render(<ResponsePanel {...defaultProps} isLoading={true} />)

      expect(screen.getByText('Thinking...')).toBeInTheDocument()
    })

    it('should show analyzing message when loading with no response and no messages', () => {
      render(<ResponsePanel {...defaultProps} isLoading={true} messages={[]} />)

      expect(screen.getByText('Analyzing your selection...')).toBeInTheDocument()
    })

    it('should not show analyzing message when there is a response', () => {
      render(
        <ResponsePanel {...defaultProps} isLoading={true} response="Some response" />
      )

      expect(screen.queryByText('Analyzing your selection...')).not.toBeInTheDocument()
    })

    it('should not show analyzing message when there are messages', () => {
      render(
        <ResponsePanel
          {...defaultProps}
          isLoading={true}
          messages={[{ role: 'assistant', content: 'Some content' }]}
        />
      )

      expect(screen.queryByText('Analyzing your selection...')).not.toBeInTheDocument()
    })
  })

  describe('response display', () => {
    it('should render markdown response when no messages', () => {
      render(<ResponsePanel {...defaultProps} response="**Bold text** and *italic*" />)

      // ReactMarkdown should render the bold text
      expect(screen.getByText('Bold text')).toBeInTheDocument()
    })

    it('should render code blocks', () => {
      const { container } = render(
        <ResponsePanel
          {...defaultProps}
          response="```javascript\nconst x = 1;\n```"
        />
      )

      // ReactMarkdown renders code blocks in pre/code elements
      const codeElement = container.querySelector('code')
      expect(codeElement).toBeInTheDocument()
      expect(codeElement?.textContent).toContain('const x = 1')
    })

    it('should apply typing cursor class when loading', () => {
      const { container } = render(
        <ResponsePanel {...defaultProps} isLoading={true} response="Loading..." />
      )

      const markdownContent = container.querySelector('.markdown-content-enhanced')
      expect(markdownContent).toHaveClass('typing-cursor')
    })

    it('should not apply typing cursor class when not loading', () => {
      const { container } = render(
        <ResponsePanel {...defaultProps} isLoading={false} response="Done" />
      )

      const markdownContent = container.querySelector('.markdown-content-enhanced')
      expect(markdownContent).not.toHaveClass('typing-cursor')
    })
  })

  describe('error display', () => {
    it('should display error message', () => {
      render(<ResponsePanel {...defaultProps} error="Connection failed" />)

      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText('Connection failed')).toBeInTheDocument()
    })

    it('should display error styling', () => {
      render(<ResponsePanel {...defaultProps} error="Test error" />)

      const errorContainer = screen.getByText('Test error').closest('div')
      expect(errorContainer).toBeInTheDocument()
    })
  })

  describe('selected text preview', () => {
    it('should display selected text when provided', () => {
      render(
        <ResponsePanel {...defaultProps} selectedText="This is selected text" />
      )

      expect(screen.getByText('This is selected text')).toBeInTheDocument()
    })

    it('should not display selected text section when empty', () => {
      const { container } = render(<ResponsePanel {...defaultProps} selectedText="" />)

      // QuoteCard should not be rendered
      const quoteCard = container.querySelector('.border-l-\\[3px\\]')
      expect(quoteCard).not.toBeInTheDocument()
    })
  })

  describe('close button', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn()
      render(<ResponsePanel {...defaultProps} onClose={onClose} />)

      // Find close button by title
      const closeButton = screen.getByTitle('Close')
      fireEvent.click(closeButton)

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('auto-scroll behavior', () => {
    it('should have content container for scrolling', () => {
      const { container } = render(
        <ResponsePanel {...defaultProps} response="Test content" />
      )

      const scrollContainer = container.querySelector('.overflow-y-auto')
      expect(scrollContainer).toBeInTheDocument()
    })
  })

  describe('combinations of states', () => {
    it('should show error even when there is a response', () => {
      render(
        <ResponsePanel
          {...defaultProps}
          response="Partial response"
          error="Stream interrupted"
        />
      )

      expect(screen.getByText('Partial response')).toBeInTheDocument()
      expect(screen.getByText('Stream interrupted')).toBeInTheDocument()
    })

    it('should show selected text with loading state', () => {
      render(
        <ResponsePanel
          {...defaultProps}
          selectedText="Selected"
          isLoading={true}
        />
      )

      expect(screen.getByText('Selected')).toBeInTheDocument()
      expect(screen.getByText('Thinking...')).toBeInTheDocument()
    })

    it('should show all elements together', () => {
      render(
        <ResponsePanel
          {...defaultProps}
          selectedText="Selected text"
          response="Response content"
          isLoading={true}
        />
      )

      expect(screen.getByText('Selected text')).toBeInTheDocument()
      expect(screen.getByText('Response content')).toBeInTheDocument()
      expect(screen.getByText('Thinking...')).toBeInTheDocument()
    })
  })

  describe('conversation messages', () => {
    it('should render user and assistant messages', () => {
      render(
        <ResponsePanel
          {...defaultProps}
          messages={[
            { role: 'user', content: 'User question' },
            { role: 'assistant', content: 'Assistant response' },
          ]}
        />
      )

      expect(screen.getByText('User question')).toBeInTheDocument()
      expect(screen.getByText('Assistant response')).toBeInTheDocument()
    })
  })

  describe('follow-up input', () => {
    it('should render follow-up input', () => {
      render(<ResponsePanel {...defaultProps} />)

      expect(screen.getByPlaceholderText('Ask a follow-up...')).toBeInTheDocument()
    })

    it('should call onFollowUp when form is submitted', () => {
      const onFollowUp = vi.fn()
      render(<ResponsePanel {...defaultProps} onFollowUp={onFollowUp} />)

      const input = screen.getByPlaceholderText('Ask a follow-up...')
      fireEvent.change(input, { target: { value: 'Follow up question' } })
      fireEvent.submit(input.closest('form')!)

      expect(onFollowUp).toHaveBeenCalledWith('Follow up question')
    })

    it('should not call onFollowUp when input is empty', () => {
      const onFollowUp = vi.fn()
      render(<ResponsePanel {...defaultProps} onFollowUp={onFollowUp} />)

      const input = screen.getByPlaceholderText('Ask a follow-up...')
      fireEvent.submit(input.closest('form')!)

      expect(onFollowUp).not.toHaveBeenCalled()
    })

    it('should disable input when loading', () => {
      render(<ResponsePanel {...defaultProps} isLoading={true} />)

      const input = screen.getByPlaceholderText('Ask a follow-up...')
      expect(input).toBeDisabled()
    })
  })

  describe('history button', () => {
    it('should render history button', () => {
      render(<ResponsePanel {...defaultProps} />)

      expect(screen.getByTitle('History')).toBeInTheDocument()
    })
  })

  describe('action label', () => {
    it('should display action label for explain', () => {
      render(<ResponsePanel {...defaultProps} currentAction="explain" />)

      expect(screen.getByText('Explanation')).toBeInTheDocument()
    })

    it('should display action label for summarize', () => {
      render(<ResponsePanel {...defaultProps} currentAction="summarize" />)

      expect(screen.getByText('Summary')).toBeInTheDocument()
    })

    it('should display action label for define', () => {
      render(<ResponsePanel {...defaultProps} currentAction="define" />)

      expect(screen.getByText('Definition')).toBeInTheDocument()
    })
  })
})
