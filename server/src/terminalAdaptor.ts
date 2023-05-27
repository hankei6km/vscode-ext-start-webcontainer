import type { WebContainerProcess } from '@webcontainer/api'

type PayloadTermSetup = {
  command: 'setup'
}
type PayloadTermIn = {
  command: 'in'
  data: string
}
type PayloadTermOut = {
  command: 'out'
  data: string
}
type PayloadTermSize = {
  command: 'size'
  cols: number
  rows: number
}
export type PayloadTerm =
  | PayloadTermSetup
  | PayloadTermIn
  | PayloadTermOut
  | PayloadTermSize

export class TerminalAdaptor {
  private ws: WebSocket
  private shellProcess: WebContainerProcess
  constructor(ws: WebSocket, shellProcess: WebContainerProcess) {
    this.ws = ws
    this.shellProcess = shellProcess
  }
  setup() {
    // ここでは何もしない。
    // handle() で handler の準備ができた後で setup command を送信している
  }
  handle() {
    const that = this
    this.shellProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          const payload: PayloadTermOut = {
            command: 'out',
            data
          }
          that.ws.send(
            JSON.stringify({
              type: 'message:term',
              id: '',
              payload
            })
          )
        }
      })
    )
    const input = this.shellProcess.input.getWriter()
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.type === 'message:term') {
        const payload: PayloadTerm = JSON.parse(message.payload)
        if (payload.command === 'in') {
          input.write(payload.data)
        } else if (payload.command === 'size') {
          that.shellProcess.resize({
            cols: payload.cols,
            rows: payload.rows
          })
        }
      }
    })
    const payload: PayloadTerm = {
      command: 'setup'
    }
    this.ws.send(
      JSON.stringify({
        type: 'message:term',
        id: '',
        payload
      })
    )
  }
}
