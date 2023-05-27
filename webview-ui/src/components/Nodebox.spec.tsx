import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Nodebox as NodeboxRuntime } from '@codesandbox/nodebox'
import Nodebox from './Nodebox'
import { Chan } from 'chanpuru'

vi.mock('@codesandbox/nodebox', async () => {
  const Nodebox = vi.fn()
  Nodebox.prototype.connect = vi.fn<[], void>().mockResolvedValue()
  Nodebox.prototype.fs = {
    init: vi.fn<[], void>().mockResolvedValue()
  }
  Nodebox.prototype.shell = {
    create: vi.fn().mockReturnValue({
      runCommand: vi.fn().mockResolvedValue({ id: 'id' }),
      stdout: {
        on: vi.fn()
      },
      stdin: {
        write: vi.fn()
      },
      kill: vi.fn()
    })
  }
  Nodebox.prototype.preview = {
    waitForPort: vi
      .fn()
      .mockResolvedValue({ url: 'http://localhost:3000', port: 3000 })
  }
  return { Nodebox: Nodebox }
})

describe('Nodebox', () => {
  let mockNodeBox: typeof NodeboxRuntime
  beforeEach(async () => {
    mockNodeBox = (await import('@codesandbox/nodebox')).Nodebox
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders iframe with nodebox runtime', async () => {
    const handleOut = vi.fn()
    const g = async function* () {}
    const [iframe, url, unmount] = await new Promise<
      [HTMLElement | null, string, () => void]
    >((resolve) => {
      const { baseElement, unmount } = render(
        <Nodebox
          files={{ 'server.js': "console.log('Hello, world!')" }}
          runCommand={{ command: 'node', args: ['server.js'] }}
          waitPort={3000}
          inData={g()}
          onPreview={(url) => {
            const iframe = baseElement.querySelector('iframe')
            resolve([iframe, url, unmount])
          }}
          onOut={handleOut}
        />
      )
    })
    expect(mockNodeBox).toHaveBeenCalledTimes(1)
    expect(mockNodeBox).toHaveBeenCalledWith({
      iframe
    })
    expect(mockNodeBox.prototype.connect).toHaveBeenCalledTimes(1)
    expect(mockNodeBox.prototype.fs.init).toHaveBeenCalledTimes(1)
    expect(mockNodeBox.prototype.fs.init).toHaveBeenCalledWith({
      'server.js': "console.log('Hello, world!')"
    })
    expect(mockNodeBox.prototype.shell.create).toHaveBeenCalledTimes(1)
    expect(mockNodeBox.prototype.shell.create).toHaveBeenCalledWith()
    expect(
      mockNodeBox.prototype.shell.create().runCommand
    ).toHaveBeenCalledTimes(1)
    expect(
      mockNodeBox.prototype.shell.create().runCommand
    ).toHaveBeenCalledWith('node', ['server.js'])
    expect(
      mockNodeBox.prototype.shell.create().stdout.on
    ).toHaveBeenCalledTimes(1)
    expect(
      mockNodeBox.prototype.shell.create().stdin.write
    ).toHaveBeenCalledTimes(0)
    expect(mockNodeBox.prototype.preview.waitForPort).toHaveBeenCalledTimes(1)
    expect(mockNodeBox.prototype.preview.waitForPort).toHaveBeenCalledWith(
      3000,
      60 * 1000
    )
    expect(url).toBe('http://localhost:3000')
    expect(handleOut).toHaveBeenCalledTimes(0)
    unmount()
    expect(mockNodeBox.prototype.shell.create().kill).toHaveBeenCalledTimes(1)
  })

  it('should handle stdout', async () => {
    let iframe: HTMLIFrameElement | null = null
    const handleOut = vi.fn()
    const ch = new Chan<string>(0)
    ;(async () => {
      ch.send('data: 1')
      ch.send('data: 2')
      ch.close()
    })()

    const g = async function* () {}
    await new Promise<void>((resolve) => {
      ;(
        mockNodeBox.prototype.shell.create().stdout.on as any
      ).mockImplementation(
        (event: string, listener: (data: string) => void) => {
          ;(async () => {
            for await (const data of ch.receiver()) {
              listener(data)
            }
            resolve()
          })()
        }
      )
      const { baseElement } = render(
        <Nodebox
          files={{ 'server.js': "console.log('Hello, world!')" }}
          runCommand={{ command: 'node', args: ['server.js'] }}
          waitPort={3000}
          inData={g()}
          onPreview={(url) => {}}
          onOut={handleOut}
        />
      )
    })
    expect(mockNodeBox).toHaveBeenCalledTimes(1)
    expect(handleOut).toHaveBeenCalledTimes(2)
    expect(handleOut).toHaveBeenNthCalledWith(1, 'data: 1')
    expect(handleOut).toHaveBeenNthCalledWith(2, 'data: 2')
    expect(
      mockNodeBox.prototype.shell.create().stdin.write
    ).toHaveBeenCalledTimes(0)
    expect(mockNodeBox.prototype.shell.create().kill).toHaveBeenCalledTimes(0)
  })

  it('should write data to stdid', async () => {
    let iframe: HTMLIFrameElement | null = null
    const handleOut = vi.fn()
    await new Promise<void>((resolve) => {
      const g = async function* () {
        yield 'data: 1'
        yield 'data: 2'
        resolve()
      }
      const { baseElement } = render(
        <Nodebox
          files={{ 'server.js': "console.log('Hello, world!')" }}
          runCommand={{ command: 'node', args: ['server.js'] }}
          waitPort={3000}
          inData={g()}
          onPreview={(url) => {}}
          onOut={handleOut}
        />
      )
    })
    expect(mockNodeBox).toHaveBeenCalledTimes(1)
    expect(handleOut).toHaveBeenCalledTimes(0)
    expect(
      mockNodeBox.prototype.shell.create().stdin.write
    ).toHaveBeenCalledTimes(2)
    expect(
      mockNodeBox.prototype.shell.create().stdin.write
    ).toHaveBeenNthCalledWith(1, 'data: 1')
    expect(
      mockNodeBox.prototype.shell.create().stdin.write
    ).toHaveBeenNthCalledWith(2, 'data: 2')
    expect(mockNodeBox.prototype.shell.create().kill).toHaveBeenCalledTimes(0)
  })
})
