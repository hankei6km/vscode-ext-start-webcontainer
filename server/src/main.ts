//import * as path from 'node:path' // module resolution 調べる
import './style.css'
import { WebContainer } from '@webcontainer/api'
import { files } from './files'
import { FilesAdaptor } from './filesAdaptor'
import { TerminalAdaptor } from './terminalAdaptor'

const app = document.querySelector('#app')
if (app === null) throw new Error('app not found')
app.innerHTML = `
  <div class="container">
  Return to the vscode tab without closing this tab.
  </div>
`

let webcontainerInstance: WebContainer

window.addEventListener('load', async () => {
  // Call only once
  webcontainerInstance = await WebContainer.boot()
  await webcontainerInstance.mount(files)

  /*const exitCode = await installDependencies(terminal);
  if (exitCode !== 0) {
    throw new Error("Installation failed");
  }

  startDevServer(terminal);*/
  // Wait for `server-ready` event
  webcontainerInstance.on('server-ready', (_port, url) => {
    //iframeEl.src = url
    ws.send(
      JSON.stringify({
        type: 'message:command',
        payload: { command: 'addPreviewUrl', previewUrl: url }
      })
    )
  })

  const ws = new WebSocket('ws://localhost:4000')

  ws.addEventListener('open', async () => {
    console.log('Connected to WebSocket server')

    const filesAdaptor = new FilesAdaptor(ws, webcontainerInstance.fs)
    filesAdaptor.setup()
    filesAdaptor.handle()

    const shellProcess = await webcontainerInstance.spawn('jsh', {
      terminal: {
        cols: 40,
        rows: 40
      }
    })
    const terminalAdaptor = new TerminalAdaptor(ws, shellProcess)
    terminalAdaptor.setup()
    terminalAdaptor.handle()
  })
})
