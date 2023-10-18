import { describe, expect, it, vi } from 'vitest'
import { TerminalAdaptor } from './terminalAdaptor.js'

describe('TerminalAdaptor', () => {
  it('should send from handle()', async () => {
    const ws = {
      send: vi.fn(),
      addEventListener: vi.fn()
    }
    await new Promise<void>((resolve) => {
      const shellProcess = {
        output: {
          pipeTo: vi.fn().mockImplementation(async (writable) => {
            await writable.getWriter().write('test-1')
            resolve()
          })
        },
        input: {
          getWriter: vi.fn()
        },
        resize: vi.fn()
      }
      const terminalAdaptor = new TerminalAdaptor(
        ws as any,
        shellProcess as any
      )
      terminalAdaptor.handle()
    })
    const m = ws.send.mock.calls[1][0]
    expect(JSON.parse(m)).toEqual({
      type: 'message:term',
      id: '',
      payload: {
        command: 'out',
        data: 'test-1'
      }
    })
  })

  it('shoud handle `in` message', async () => {
    const data = await new Promise((resolve) => {
      const ws = {
        send: vi.fn(),
        addEventListener: vi.fn().mockImplementation((event, cb) => {
          if (event === 'message') {
            cb({
              data: JSON.stringify({
                type: 'message:term',
                id: '',
                payload: JSON.stringify({
                  command: 'in',
                  data: 'test-2'
                })
              })
            })
          }
        })
      }
      const shellProcess = {
        output: {
          pipeTo: vi.fn()
        },
        input: {
          getWriter: () => ({
            write: (data: string) => resolve(data)
          })
        },
        resize: vi.fn()
      }
      const terminalAdaptor = new TerminalAdaptor(
        ws as any,
        shellProcess as any
      )
      terminalAdaptor.handle()
    })
    expect(data).toEqual('test-2')
  })

  it('shoud handle `size` message', async () => {
    const [cols, rows] = await new Promise<[number, number]>((resolve) => {
      const ws = {
        send: vi.fn(),
        addEventListener: vi.fn().mockImplementation((event, cb) => {
          if (event === 'message') {
            cb({
              data: JSON.stringify({
                type: 'message:term',
                id: '',
                payload: JSON.stringify({
                  command: 'size',
                  cols: 80,
                  rows: 24
                })
              })
            })
          }
        })
      }
      const shellProcess = {
        output: {
          pipeTo: vi.fn()
        },
        input: {
          getWriter: vi.fn()
        },
        resize: (size: { cols: number; rows: number }) =>
          resolve([size.cols, size.rows])
      }
      const terminalAdaptor = new TerminalAdaptor(
        ws as any,
        shellProcess as any
      )
      terminalAdaptor.handle()
    })
    expect(cols).toEqual(80)
    expect(rows).toEqual(24)
  })
})
