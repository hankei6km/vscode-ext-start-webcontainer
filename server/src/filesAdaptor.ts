import { FileSystemAPI } from '@webcontainer/api'
import { Minimatch } from 'minimatch'

export class FilesAdaptor {
  private ws: WebSocket
  private fs: FileSystemAPI
  private ignoreMatcher: Minimatch = new Minimatch(
    '**/{node_modules,.git,build,builds,dist,dists,out,outs,coverage}/**',
    {
      dot: true
    }
  )
  constructor(ws: WebSocket, fs: FileSystemAPI) {
    this.ws = ws
    this.fs = fs
  }

  setup() {
    this.ws.send(
      JSON.stringify({
        type: 'message:command',
        payload: { command: 'setup' }
      })
    )
  }

  async *walk(
    ignoreMatcher: Minimatch,
    dir: string,
    filePathInFiles: string[] = []
  ): AsyncGenerator<[string, string], void, void> {
    for await (const d of await this.fs.readdir(dir, { withFileTypes: true })) {
      const entry = `${dir}/${d.name}` // fs は実際の filesystem ではない。区切りはおそらく `/` 固定。
      if (!ignoreMatcher.match(entry)) {
        if (d.isDirectory()) {
          yield* this.walk(ignoreMatcher, entry, [...filePathInFiles, d.name])
        } else if (d.isFile()) {
          yield [entry, [...filePathInFiles, d.name].join('/')]
        }
      }
    }
  }

  handle() {
    this.ws.addEventListener('message', async (event) => {
      //console.log(`Received message: ${event.data}`)
      const message = JSON.parse(event.data)
      const payload = JSON.parse(message.payload)
      //const payload = message.payload
      switch (payload.command) {
        case 'updateContent':
          {
            // 絶対パスが渡される前提。
            const filePath = payload.path
            const dir = filePath.substring(0, filePath.lastIndexOf('/'))
            await this.fs.mkdir(dir, { recursive: true })
            await this.fs.writeFile(filePath, new Uint8Array(payload.content))
            this.ws.send(
              JSON.stringify({
                type: 'message:command',
                id: message.id,
                payload: {
                  seq: payload.seq
                }
              })
            )
          }
          break
        case 'pickFile':
          {
            const filePath = payload.path
            try {
              const content = await this.fs.readFile(filePath)
              this.ws.send(
                JSON.stringify({
                  type: 'message:command',
                  id: message.id,
                  payload: {
                    command: 'updateContent',
                    content: Array.from(content),
                    seq: payload.seq
                  }
                })
              )
            } catch (e) {
              this.ws.send(
                JSON.stringify({
                  type: 'message:command',
                  id: message.id,
                  payload: {
                    seq: payload.seq
                  }
                })
              )
            }
          }
          break
        case 'pickAllFiles':
          {
            const pickRootPath = payload.path
            const entries: string[] = []
            try {
              for await (const [_filePath, filePathInFiles] of this.walk(
                this.ignoreMatcher,
                pickRootPath
              )) {
                entries.push(filePathInFiles)
              }
              this.ws.send(
                JSON.stringify({
                  type: 'message:command',
                  id: message.id,
                  payload: {
                    command: 'entries',
                    kind: 'file',
                    path: '',
                    entries,
                    seq: payload.seq
                  }
                })
              )
            } catch (e) {
              this.ws.send(
                JSON.stringify({
                  type: 'message:command',
                  id: message.id,
                  payload: {
                    seq: payload.seq,
                    error: (e as any).message
                  }
                })
              )
            }
          }
          break
      }
    })

    this.ws.addEventListener('close', () => {
      console.log('Disconnected from WebSocket server')
    })
  }
}
