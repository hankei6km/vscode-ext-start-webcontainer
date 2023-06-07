import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Loop } from './loop.js'

describe('loop', () => {
  it('should handle messages', async () => {
    const postMessage = vi.fn()
    const sender = vi.fn()
    const receiver = async function* () {}
    const loop = new Loop(postMessage, sender, receiver())
    await loop.handleMessage('test-1')
    expect(sender).toHaveBeenCalledWith('test-1')
  })

  it('should post a command and release by seq', async () => {
    const postMessage = vi.fn().mockReturnValue(true)
    const sender = vi.fn()
    let iterator_done = false
    const receiver = async function* () {
      yield {
        id: 'another-id',
        type: 'message:command' as const,
        payload: JSON.stringify({
          seq: 0
        })
      }
      yield {
        id: 'test-1',
        type: 'message:command' as const,
        payload: JSON.stringify({
          seq: 1
        })
      }
      iterator_done = true // ここまで処理されるなら、ダミーでリリースされていない。
      yield {
        id: 'test-1',
        type: 'message:command' as const,
        payload: JSON.stringify({
          seq: 0
        })
      }
    }
    const loop = new Loop(postMessage, sender, receiver())
    const message = {
      id: 'test-1',
      type: 'message:command' as const,
      payload: {
        test: 0
      }
    }
    const r1 = await loop.postCommand(message)
    expect(r1).not.toBeNull()
    if (r1) {
      for await (const _ of r1) {
      }
    }
    expect(iterator_done).toBeTruthy()
    const m = postMessage.mock.calls[0][0]
    m.payload = JSON.parse(m.payload)
    expect(m).toEqual({
      ...message,
      payload: {
        ...message.payload,
        seq: 0
      }
    })
  })

  it('should post a command and release by seq(multiple responces)', async () => {
    const postMessage = vi.fn().mockReturnValue(true)
    const sender = vi.fn()
    let iterator_done = false
    const receiver = async function* () {
      yield {
        id: 'another-id',
        type: 'message:command' as const,
        payload: JSON.stringify({
          seq: 0
        })
      }
      yield {
        id: 'test-1',
        type: 'message:command' as const,
        payload: JSON.stringify({
          seq: 0,
          next: true
        })
      }
      yield {
        id: 'test-1',
        type: 'message:command' as const,
        payload: JSON.stringify({
          seq: 0,
          next: true
        })
      }
      yield {
        id: 'test-1',
        type: 'message:command' as const,
        payload: JSON.stringify({
          seq: 1
        })
      }
      iterator_done = true // ここまで処理されるなら、ダミーでリリースされていない。
      yield {
        id: 'test-1',
        type: 'message:command' as const,
        payload: JSON.stringify({
          seq: 0
        })
      }
    }
    const loop = new Loop(postMessage, sender, receiver())
    const message = {
      id: 'test-1',
      type: 'message:command' as const,
      payload: {
        test: 0
      }
    }
    const r1 = await loop.postCommand(message)
    expect(r1).not.toBeNull()
    let c = 0
    if (r1) {
      for await (const _ of r1) {
        c++
      }
    }
    expect(c).toEqual(3)
    expect(iterator_done).toBeTruthy()
    const m = postMessage.mock.calls[0][0]
    m.payload = JSON.parse(m.payload)
    expect(m).toEqual({
      ...message,
      payload: {
        ...message.payload,
        seq: 0
      }
    })
  })
})
