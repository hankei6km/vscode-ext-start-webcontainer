import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Connector, Output, RelayMessage } from './connector.js'
import { Chan } from 'chanpuru'

const saveLog = console.log
const saveError = console.error

beforeEach(() => {
  console.log = vi.fn()
  console.error = vi.fn()
})

afterEach(() => {
  console.log = saveLog
  console.error = saveError
})

describe('Ouptput', () => {
  it('should output as log', () => {
    const output = new Output('test-id')

    output.log('test')
    // JSON.stringifty の出力内の object の field の位置が常に同じとは限らない
    // expect(console.log).toHaveBeenCalledWith(
    //   '{"type":"log","id":"test-id","payload":"test"}'
    // )
    const line = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]
    // line が 1 行であることを確認
    expect(line.split('\n').length).toBe(1)
    expect(JSON.parse(line)).toEqual({
      type: 'log',
      id: 'test-id',
      payload: 'test'
    })
  })

  it('should output as error', () => {
    const output = new Output('test-id')

    output.error('test')
    const line = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(line.split('\n').length).toBe(1)
    expect(JSON.parse(line)).toEqual({
      type: 'error',
      id: 'test-id',
      payload: 'test'
    })
  })

  it('should output as mesage command', () => {
    const output = new Output('test-id')

    output.messageCommand('test')
    const line = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(line.split('\n').length).toBe(1)
    expect(JSON.parse(line)).toEqual({
      type: 'message:command',
      id: 'test-id',
      payload: 'test'
    })
  })

  it('should output as mesage command(object)', () => {
    const output = new Output('test-id')

    output.messageCommand({
      text: 'test'
    })
    const line = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(line.split('\n').length).toBe(1)
    expect(JSON.parse(line)).toEqual({
      type: 'message:command',
      id: 'test-id',
      payload: {
        text: 'test'
      }
    })
  })

  it('should output as mesage term', () => {
    const output = new Output('test-id')

    output.messageTerm('test')
    const line = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(line.split('\n').length).toBe(1)
    expect(JSON.parse(line)).toEqual({
      type: 'message:term',
      id: 'test-id',
      payload: 'test'
    })
  })

  it('should output as mesage term(object)', () => {
    const output = new Output('test-id')

    output.messageTerm({
      text: 'test'
    })
    const line = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(line.split('\n').length).toBe(1)
    expect(JSON.parse(line)).toEqual({
      type: 'message:term',
      id: 'test-id',
      payload: {
        text: 'test'
      }
    })
  })
})

describe('Connector', async () => {
  it('should handle(server to container)', async () => {
    const connector = new Connector()
    const ws = {
      send: vi.fn(),
      on: vi.fn()
    }

    await new Promise<void>(async (resolve) => {
      const g: () => AsyncGenerator<RelayMessage, void, unknown> =
        async function* () {
          yield {
            type: 'message:command',
            id: connector.id,
            payload: 'test-1'
          }
          yield {
            type: 'message:command',
            id: 'another-id',
            payload: 'test-2'
          }
          yield {
            type: 'message:term',
            id: connector.id,
            payload: 'test-3'
          }
          resolve()
        }
      await connector.handle(ws as any, g())
      expect(ws.on).toHaveBeenCalledWith('message', expect.any(Function))
      expect(ws.on).toHaveBeenCalledWith('close', expect.any(Function))
    })
    expect(ws.send).toBeCalledTimes(2)
    expect(JSON.parse(ws.send.mock.calls[0][0])).toEqual({
      type: 'message:command',
      id: connector.id,
      payload: 'test-1'
    })
    expect(JSON.parse(ws.send.mock.calls[1][0])).toEqual({
      type: 'message:term',
      id: connector.id,
      payload: 'test-3'
    })
  })

  it('should handle(container to server)', async () => {
    const connector = new Connector()
    await new Promise<void>((resolve) => {
      const ws = {
        on: vi.fn().mockImplementation((event, cb) => {
          if (event === 'message') {
            cb(
              JSON.stringify({
                type: 'message:command',
                id: '',
                payload: 'test-1'
              })
            )
            cb(
              JSON.stringify({
                type: 'message:log',
                id: '',
                payload: 'test-2'
              })
            )
            cb(
              JSON.stringify({
                type: 'message:term',
                id: '',
                payload: 'test-3'
              })
            )
            resolve()
          }
        })
      }
      const g = async function* () {}
      connector.handle(ws as any, g())
    })
    expect(console.log).toBeCalledTimes(2)
    const lineCommand = (console.log as ReturnType<typeof vi.fn>).mock
      .calls[0][0]
    expect(lineCommand.split('\n').length).toBe(1)
    expect(JSON.parse(lineCommand)).toEqual({
      type: 'message:command',
      id: connector.id,
      payload: 'test-1'
    })
    const lineTerm = (console.log as ReturnType<typeof vi.fn>).mock.calls[1][0]
    expect(lineTerm.split('\n').length).toBe(1)
    expect(JSON.parse(lineTerm)).toEqual({
      type: 'message:term',
      id: connector.id,
      payload: 'test-3'
    })
  })

  it('shourd gather messages from stdin', async () => {
    const ch = new Chan<RelayMessage>(0)
    const connector = new Connector()
    const stdin = {
      on: vi.fn().mockImplementation((event, cb) => {
        cb(
          Buffer.from(
            JSON.stringify({
              type: 'message:command',
              id: 'id-1',
              payload: 'test-1'
            })
          )
        )
        cb(
          Buffer.from(
            JSON.stringify({
              type: 'log',
              id: 'id-2',
              payload: 'test-2'
            })
          )
        )
        cb(
          Buffer.from(
            JSON.stringify({
              type: 'message:term',
              id: 'id-3',
              payload: 'test-3'
            })
          )
        )
        ch.close()
      })
    }
    connector.gather(stdin as any, ch.send)
    const res: RelayMessage[] = []
    for await (const m of ch.receiver()) {
      res.push(m)
    }
    expect(res).toEqual([
      {
        type: 'message:command',
        id: 'id-1',
        payload: 'test-1'
      },
      {
        type: 'message:term',
        id: 'id-3',
        payload: 'test-3'
      }
    ])
  })
})
