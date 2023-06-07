import type { Webview } from 'vscode'
import { Chan } from 'chanpuru'
import type { ChanSend, ChanRecv } from 'chanpuru'
// '../../../server/ws/connector.js'
export type RelayMessage = {
  id: string
  type: 'log' | 'error' | 'message:command' | 'message:term'
  payload: Record<string, any>
}
export type LoopMessage = Omit<RelayMessage, 'payload'> & {
  payload: (Record<string, any> & { seq: number; next?: boolean }) | string
}

export class Loop {
  private postMessage: Webview['postMessage']
  private seq: number = 0
  private sender: ChanSend<LoopMessage>
  private receiver: ChanRecv<LoopMessage>
  constructor(
    postMessage: Webview['postMessage'],
    sender: ChanSend<LoopMessage>,
    receiver: ChanRecv<LoopMessage>
  ) {
    this.postMessage = postMessage
    this.sender = sender
    this.receiver = receiver
  }
  async handleMessage(message: any) {
    await this.sender(message)
  }
  async postCommand(message: RelayMessage) {
    const seq = this.seq++
    const m: LoopMessage = {
      ...message,
      payload: JSON.stringify({
        ...message.payload,
        seq
      })
    }
    const ch = new Chan<LoopMessage['payload']>(0)
    ;(async () => {
      // typescript 5.1.3 だと for await of を途中で抜けて再度 iterator を使うと
      // そのまま抜けてしまう。
      // next と while では再現しない。
      // typescript 側の問題でもなさそうなのでロジック側にタイミング的な不具合をかかえているかもしれない。
      let n = await this.receiver.next()
      while (!n.done) {
        const data = n.value
        const payload =
          typeof data.payload !== 'string'
            ? data.payload
            : JSON.parse(data.payload)
        if (data.id === message.id && payload.seq === seq) {
          await ch.send(payload)
          if (!payload.next) {
            ch.close()
            break
          }
        }
        n = await this.receiver.next()
      }
    })()
    if (await this.postMessage(m)) {
      return ch.receiver()
    }
    console.error('postMessage failed')
    ch.close()
    return null
  }
}
