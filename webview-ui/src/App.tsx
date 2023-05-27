import React from 'react'
import { vscode } from './utilities/vscode'
// import { VSCodeButton } from '@vscode/webview-ui-toolkit/react'
import './App.css'

import Nodebox from './components/Nodebox'
import Terminal from './components/Terminal'
import type { PayloadTerm } from './components/Terminal'
import { files } from './files.js'
import { Chan } from 'chanpuru'

function App() {
  const [ch, setCh] = React.useState<Chan<string>>(new Chan<string>(0))
  const [termCh, setTermCh] = React.useState<Chan<PayloadTerm>>(
    new Chan<PayloadTerm>(0)
  )

  React.useEffect(() => {
    const _ch = new Chan<string>(0)
    const _termCh = new Chan<PayloadTerm>(0)
    setCh(_ch)
    setTermCh(_termCh)
    return () => {
      _ch.close()
      _termCh.close()
    }
  }, [setCh, setTermCh])

  // extension からの message を受け取る
  React.useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const message = event.data
      if (message.type === 'message:command') {
        await ch.send(JSON.stringify(message))
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [ch, termCh])

  return (
    <main>
      <Nodebox
        className="nodebox"
        files={files}
        runCommand={{ command: 'vite', args: ['-l', 'error'] }}
        waitPort={5173}
        onPreview={(url) => {
          vscode.postMessage({
            type: 'start',
            id: '',
            payload: { url }
          })
        }}
        inData={ch.receiver()}
        onOut={(data) => {
          const m = JSON.parse(data)
          if (m.type === 'message:command') {
            vscode.postMessage(m)
          } else if (m.type === 'message:term') {
            //await termCh.send(m.payload)
            termCh.send(m.payload)
          }
        }}
      />
      <Terminal
        className="jshTerm"
        inData={termCh.receiver()}
        onData={(data) => {
          const message = {
            type: 'message:term',
            payload: JSON.stringify({
              command: 'in',
              data
            })
          }
          ch.send(JSON.stringify(message))
        }}
        onSize={(size) => {
          const message = {
            type: 'message:term',
            payload: JSON.stringify({
              command: 'size',
              ...size
            })
          }
          ch.send(JSON.stringify(message))
        }}
      />
    </main>
  )
}

export default App
