import React from 'react'
import classNames from 'classnames'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'

// server/src/terminalAdaptor.ts
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

type Props = {
  className?: string
  inData: AsyncIterable<PayloadTerm>
  onData: (data: string) => void
  onSize: (size: { cols: number; rows: number }) => void
}

function Term({ className, inData, onData, onSize }: Props) {
  const terminalRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (terminalRef.current) {
      const terminalEl = terminalRef.current
      const fitAddon = new FitAddon()
      const terminal = new Terminal({
        convertEol: true
      })
      terminal.loadAddon(fitAddon)
      terminal.open(terminalEl)
      fitAddon.fit()
      //terminal.focus()

      fitAddon.fit()
      ;(async () => {
        for await (const data of inData) {
          if (data.command === 'setup') {
            onSize({
              cols: terminal.cols,
              rows: terminal.rows
            })
            terminal.focus()
          } else if (data.command === 'out') {
            terminal.write(data.data)
          }
        }
      })()
      terminal.onData((data) => {
        onData(data)
      })

      const handleCustomKeyEvent = (event: KeyboardEvent) => {
        // if (event.shiftKey && event.ctrlKey && event.keyCode === 80) {
        if (event.shiftKey && event.ctrlKey && event.key === 'p') {
          return false
        }
        if (event.ctrlKey && event.key === 'p') {
          return false
        }
        return true
      }
      // detach 的なものはない？
      terminal.attachCustomKeyEventHandler(handleCustomKeyEvent)

      const handleResize = () => {
        fitAddon.fit()
        onSize({
          cols: terminal.cols,
          rows: terminal.rows
        })
      }

      const handleFocus = () => {
        terminal.focus()
      }

      window.addEventListener('resize', handleResize)
      window.addEventListener('focus', handleFocus)

      return () => {
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('focus', handleFocus)
        terminal.dispose()
        fitAddon.dispose()
      }
    }
  }, [terminalRef.current, inData, onData, onSize])

  return (
    <div ref={terminalRef} className={classNames(className, 'terminal')}></div>
  )
}

export default Term
