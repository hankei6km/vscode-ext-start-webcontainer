import { WebSocketServer } from 'ws'
import { Connector } from './connector'
import type { RelayMessage } from './connector'
import { Chan } from 'chanpuru'

export async function createServer(port = 4000) {
  const wss = new WebSocketServer({
    port
    // verifyClient は info.origin が undefined になる.
    // Service Worker 経由での接続のみ限定されると思うので一旦保留.
  })

  const ch = new Chan<RelayMessage>()
  const con = new Connector()
  wss.on('connection', (ws) => {
    con.handle(ws, ch.receiver())
  })

  con.gather(process.stdin, ch.send)
}
