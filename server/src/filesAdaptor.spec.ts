import { describe, expect, it, vi } from 'vitest'
import { FilesAdaptor } from './filesAdaptor.js'

describe('FilesAdaptor', () => {
  it('should setup', async () => {
    const ws = {
      send: vi.fn()
    }
    const fs = {}
    const filesAdaptor = new FilesAdaptor(ws as any, fs as any)
    filesAdaptor.setup()
    const m = ws.send.mock.calls[0][0]
    expect(JSON.parse(m)).toEqual({
      type: 'message:command',
      payload: { command: 'setup' }
    })
  })

  it('should set handlers', async () => {
    const ws = {
      addEventListener: vi.fn()
    }
    const fs = {}
    const filesAdaptor = new FilesAdaptor(ws as any, fs as any)
    filesAdaptor.handle()
    expect(ws.addEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function)
    )
    expect(ws.addEventListener).toHaveBeenCalledWith(
      'close',
      expect.any(Function)
    )
  })

  it('should handle messages', async () => {
    const fs = {
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined)
    }
    const ack = await new Promise<string>((resolve) => {
      const ws = {
        send: vi.fn().mockImplementation((ack) => {
          resolve(ack)
        }),
        addEventListener: (type: string, handler: any) => {
          if (type === 'message') {
            handler({
              data: JSON.stringify({
                type: 'message:command',
                payload: JSON.stringify({
                  seq: 1,
                  command: 'updateContent',
                  path: '/src/lib/test.ts',
                  content: [116, 101, 115, 116]
                })
              })
            })
          }
        }
      }
      const filesAdaptor = new FilesAdaptor(ws as any, fs as any)
      filesAdaptor.handle()
    })
    expect(fs.mkdir).toHaveBeenCalledWith('/src/lib', { recursive: true })
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/src/lib/test.ts',
      new Uint8Array([116, 101, 115, 116])
    )
    expect(JSON.parse(ack)).toEqual({
      type: 'message:command',
      payload: {
        seq: 1
      }
    })
  })
})
