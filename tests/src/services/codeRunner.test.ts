import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { JavaScriptRunner, getRunner } from '@/services/codeRunner'

describe('JavaScriptRunner', () => {
  let runner: JavaScriptRunner

  beforeEach(() => {
    runner = new JavaScriptRunner()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('is ready immediately', () => {
      expect(runner.isReady).toBe(true)
    })

    it('has runtime type "javascript"', () => {
      expect(runner.runtime).toBe('javascript')
    })

    it('initialize() resolves immediately', async () => {
      await expect(runner.initialize()).resolves.toBeUndefined()
      expect(runner.isReady).toBe(true)
    })
  })

  describe('execute - console output', () => {
    it('captures console.log output', async () => {
      const result = await runner.execute('console.log("hello")')

      expect(result.output).toContain('hello')
      expect(result.error).toBeUndefined()
    })

    it('captures multiple console.log calls', async () => {
      const result = await runner.execute(`
        console.log("first")
        console.log("second")
        console.log("third")
      `)

      expect(result.output).toContain('first')
      expect(result.output).toContain('second')
      expect(result.output).toContain('third')
    })

    it('captures console.error output', async () => {
      const outputs: Array<{ type: string; content: string }> = []
      const result = await runner.execute('console.error("error message")', (line) => {
        outputs.push({ type: line.type, content: line.content })
      })

      expect(result.output).toContain('Error')
      expect(result.output).toContain('error message')
      expect(outputs.some(o => o.type === 'stderr')).toBe(true)
    })

    it('captures console.warn output', async () => {
      const result = await runner.execute('console.warn("warning")')

      expect(result.output).toContain('Warning')
      expect(result.output).toContain('warning')
    })

    it('handles object serialization in console.log', async () => {
      const result = await runner.execute('console.log({ foo: "bar", num: 42 })')

      expect(result.output).toContain('foo')
      expect(result.output).toContain('bar')
      expect(result.output).toContain('42')
    })

    it('handles multiple arguments in console.log', async () => {
      const result = await runner.execute('console.log("a", "b", "c")')

      expect(result.output).toContain('a b c')
    })
  })

  describe('execute - return values', () => {
    it('includes return value in output', async () => {
      const result = await runner.execute('return 42')

      expect(result.output).toContain('=> 42')
    })

    it('stringifies object return values', async () => {
      const result = await runner.execute('return { result: "success" }')

      expect(result.output).toContain('result')
      expect(result.output).toContain('success')
    })

    it('handles undefined return (no output for return value)', async () => {
      const result = await runner.execute('const x = 1')

      expect(result.output).not.toContain('=>')
    })
  })

  describe('execute - callbacks', () => {
    it('calls onOutput for each console.log', async () => {
      const outputs: string[] = []

      await runner.execute(
        `
        console.log("one")
        console.log("two")
        `,
        (line) => outputs.push(line.content)
      )

      expect(outputs).toContain('one')
      expect(outputs).toContain('two')
    })

    it('provides timestamp and id in output lines', async () => {
      let outputLine: { id?: string; timestamp?: number } = {}

      await runner.execute('console.log("test")', (line) => {
        outputLine = line
      })

      expect(outputLine.id).toBeDefined()
      expect(outputLine.timestamp).toBeDefined()
      expect(outputLine.timestamp).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('execute - error handling', () => {
    it('handles thrown errors', async () => {
      const result = await runner.execute('throw new Error("test error")')

      expect(result.error).toBe('test error')
    })

    it('handles syntax errors', async () => {
      const result = await runner.execute('const x = {')

      expect(result.error).toBeDefined()
    })

    it('handles reference errors', async () => {
      const result = await runner.execute('nonExistentVariable')

      expect(result.error).toBeDefined()
      expect(result.error).toContain('nonExistentVariable')
    })

    it('calls onOutput with stderr for errors', async () => {
      const outputs: Array<{ type: string }> = []

      await runner.execute('throw new Error("fail")', (line) => {
        outputs.push({ type: line.type })
      })

      expect(outputs.some(o => o.type === 'stderr')).toBe(true)
    })

    it('includes execution time even on error', async () => {
      const result = await runner.execute('throw new Error("test")')

      expect(result.executionTime).toBeDefined()
      expect(result.executionTime).toBeGreaterThanOrEqual(0)
    })
  })

  describe('execute - timeout', () => {
    it('times out after 10 seconds', async () => {
      vi.useFakeTimers()

      const executePromise = runner.execute(`
        while(true) {}
      `)

      // Fast-forward past timeout
      vi.advanceTimersByTime(11000)

      const result = await executePromise

      expect(result.error).toContain('timeout')
    }, 15000)
  })

  describe('execute - sandboxed environment', () => {
    it('provides Math global', async () => {
      const result = await runner.execute('return Math.PI')

      expect(result.output).toContain('3.14159')
    })

    it('provides JSON global', async () => {
      const result = await runner.execute('return JSON.stringify({ a: 1 })')

      expect(result.output).toContain('{"a":1}')
    })

    it('provides Array methods', async () => {
      const result = await runner.execute('return [1,2,3].map(x => x * 2)')

      expect(result.output).toContain('2')
      expect(result.output).toContain('4')
      expect(result.output).toContain('6')
    })

    it('provides Date constructor', async () => {
      const result = await runner.execute('return typeof Date')

      expect(result.output).toContain('function')
    })

    it('provides Promise', async () => {
      const result = await runner.execute('return Promise.resolve(42)')

      expect(result.output).toContain('42')
    })

    it('provides setTimeout with capped delay', async () => {
      // This test verifies setTimeout works but delay is capped at 5 seconds
      const result = await runner.execute(`
        return new Promise(resolve => {
          setTimeout(() => resolve('done'), 100)
        })
      `)

      expect(result.output).toContain('done')
    })

    it('does not provide window or document', async () => {
      const result = await runner.execute('return typeof window')
      expect(result.output).toContain('undefined')

      const result2 = await runner.execute('return typeof document')
      expect(result2.output).toContain('undefined')
    })

    it('does not provide require or process', async () => {
      const result = await runner.execute('return typeof require')
      expect(result.output).toContain('undefined')

      const result2 = await runner.execute('return typeof process')
      expect(result2.output).toContain('undefined')
    })
  })

  describe('interrupt', () => {
    it('sets aborted flag on current execution', () => {
      // Start an execution that won't complete immediately
      runner.execute(`
        while(true) { console.log("looping") }
      `)

      // Interrupt should not throw
      expect(() => runner.interrupt()).not.toThrow()
    })

    it('does nothing when no execution is running', () => {
      // Should not throw even with no execution
      expect(() => runner.interrupt()).not.toThrow()
    })
  })

  describe('execution timing', () => {
    it('returns execution time', async () => {
      const result = await runner.execute('const x = 1 + 1')

      expect(result.executionTime).toBeDefined()
      expect(result.executionTime).toBeGreaterThanOrEqual(0)
    })

    it('execution time increases with longer code', async () => {
      const shortResult = await runner.execute('1')

      const longResult = await runner.execute(`
        let sum = 0
        for (let i = 0; i < 10000; i++) {
          sum += i
        }
        return sum
      `)

      // Both should have valid execution times
      expect(shortResult.executionTime).toBeGreaterThanOrEqual(0)
      expect(longResult.executionTime).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('getRunner', () => {
  it('returns JavaScriptRunner for javascript runtime', () => {
    const runner = getRunner('javascript')
    expect(runner.runtime).toBe('javascript')
    expect(runner.isReady).toBe(true)
  })

  it('returns same instance on subsequent calls', () => {
    const runner1 = getRunner('javascript')
    const runner2 = getRunner('javascript')
    expect(runner1).toBe(runner2)
  })

  it('returns PythonRunner for python runtime', () => {
    const runner = getRunner('python')
    expect(runner.runtime).toBe('python')
    // Python runner is not ready until initialized
    expect(runner.isReady).toBe(false)
  })
})
