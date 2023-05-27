import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Terminal from './Terminal'
import type { Terminal as TerminalRuntime } from 'xterm'

vi.mock('xterm', async () => {
  const Terminal = vi.fn()
  Terminal.prototype.loadAddon = vi.fn()
  Terminal.prototype.open = vi.fn()
  Terminal.prototype.focus = vi.fn()
  Terminal.prototype.dispose = vi.fn()
  Terminal.prototype.onData = vi.fn()
  Terminal.prototype.write = vi.fn()
  Terminal.prototype.attachCustomKeyEventHandler = vi.fn()
  return { Terminal }
})

describe('Terminal', () => {
  let mockTerminal: typeof TerminalRuntime
  beforeEach(async () => {
    mockTerminal = (await import('xterm')).Terminal
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders terminal', async () => {
    const handleData = vi.fn()
    const handleSize = vi.fn()
    const g = async function* () {}
    const { baseElement, unmount } = render(
      <Terminal inData={g()} onData={handleData} onSize={handleSize} />
    )
    unmount()
    expect(
      mockTerminal.prototype.attachCustomKeyEventHandler
    ).toHaveBeenCalledWith(expect.any(Function))
    expect(mockTerminal.prototype.dispose).toHaveBeenCalled()
  })

  it('should write data', async () => {
    const handleData = vi.fn()
    const handleSize = vi.fn()
    await new Promise<void>((resolve) => {
      const g = async function* () {
        yield { command: 'out' as const, data: 'test-1' }
        resolve()
      }
      const { baseElement, unmount } = render(
        <Terminal inData={g()} onData={handleData} onSize={handleSize} />
      )
    })
    expect(mockTerminal.prototype.write).toHaveBeenCalledWith('test-1')
  })

  it('should emit data', async () => {
    const handleData = vi.fn()
    const handleSize = vi.fn()
    await new Promise<void>((resolve) => {
      ;(
        mockTerminal.prototype.onData as any as ReturnType<typeof vi.fn>
      ).mockImplementation((callback: (data: string) => void) => {
        callback('test-2')
        resolve()
      })

      const g = async function* () {}
      const { baseElement, unmount } = render(
        <Terminal inData={g()} onData={handleData} onSize={handleSize} />
      )
    })
  })

  it('should emit resize', async () => {
    const handleData = vi.fn()
    const handleSize = vi.fn()
    const g = async function* () {}
    const { baseElement, unmount } = render(
      <Terminal inData={g()} onData={handleData} onSize={handleSize} />
    )
    fireEvent(window, new Event('resize'))
    expect(handleSize).toBeCalledTimes(1) // cols と rows が正しいかは確認していない。
  })

  it('should emit resize by setup command', async () => {
    const handleData = vi.fn()
    const handleSize = vi.fn()
    await new Promise<void>((resolve) => {
      const g = async function* () {
        yield { command: 'setup' as const }
        resolve()
      }
      const { baseElement, unmount } = render(
        <Terminal inData={g()} onData={handleData} onSize={handleSize} />
      )
    })
    expect(handleSize).toBeCalledTimes(1) // cols と rows が正しいかは確認していない。
  })
})
