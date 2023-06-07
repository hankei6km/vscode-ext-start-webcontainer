import type { ChanSend } from 'chanpuru'
import type { WebSocket } from 'ws'

export type RelayMessage = {
  id: string
  type: 'log' | 'error' | 'message:command' | 'message:term'
  //seq?: number
  // connetor では payload の内容には関与しない。
  payload: Record<string, unknown> | string
}

export class Output {
  id: string
  constructor(id: string) {
    this.id = id
  }
  log(payload: string) {
    const m: RelayMessage = {
      type: 'log',
      id: this.id,
      payload
    }
    console.log(JSON.stringify(m))
  }
  error(payload: string) {
    const m: RelayMessage = {
      type: 'error',
      id: this.id,
      payload
    }
    console.error(JSON.stringify(m))
  }
  messageCommand(payload: RelayMessage['payload']) {
    const m: RelayMessage = {
      type: 'message:command',
      id: this.id,
      payload
    }
    console.log(JSON.stringify(m))
  }
  messageTerm(payload: RelayMessage['payload']) {
    // string で受け取れる？
    const m: RelayMessage = {
      type: 'message:term',
      id: this.id,
      payload
    }
    console.log(JSON.stringify(m))
  }
}

export class Connector {
  private output: Output
  private _id: string

  constructor() {
    this._id = Math.random().toString(36).slice(2)
    this.output = new Output(this._id)
  }

  get id() {
    return this._id
  }

  async handle(ws: WebSocket, receiver: AsyncIterable<RelayMessage>) {
    ;(async () => {
      for await (const p of receiver) {
        if (p.id === this._id || p.type === 'message:term') {
          ws.send(typeof p !== 'string' ? JSON.stringify(p) : p)
        }
      }
    })()

    ws.on('message', (message) => {
      //this.output.log(`Received message => ${message}`)
      try {
        const p = JSON.parse(message.toString('utf8'))
        if (p.type === 'message:command') {
          this.output.messageCommand(p.payload)
        } else if (p.type === 'message:term') {
          this.output.messageTerm(p.payload)
        }
      } catch (e) {
        throw new Error(`Server: parse a message: ${e}`)
      }
    })

    ws.on('close', () => {
      this.output.log('Client disconnected')
    })
  }

  gather(stdin: NodeJS.Process['stdin'], sender: ChanSend<RelayMessage>) {
    // stdin.setEncoding('utf8') // ここで設定するのもお行儀よくないか。
    stdin.on('data', async (chunk) => {
      try {
        // ndjson も readline も動かないので、とりあえず stdin からの入力を
        // 「改行区切りで受けているだろう」という前提で処理する。
        const p: RelayMessage = JSON.parse(chunk.toString('utf8'))
        if (p.type === 'message:command' || p.type === 'message:term') {
          sender(p)
        }
      } catch (e) {
        throw new Error(`Server: parse stdout: ${e}`)
      }
    })
  }
}
