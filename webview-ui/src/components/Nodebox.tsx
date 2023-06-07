import React from 'react'
import { Nodebox as NodeboxRuntime } from '@codesandbox/nodebox'
import type { FilesMap, ShellProcess } from '@codesandbox/nodebox'
import { vscode } from '../utilities/vscode'

type Props = {
  className?: string
  files: FilesMap
  runCommand: {
    command: string
    args: string[]
  }
  waitPort: number
  inData: AsyncIterable<string>
  onPreview: (url: string) => void
  onOut: (data: string) => void
}

function Nodebox({
  className,
  files,
  runCommand,
  waitPort,
  inData,
  onPreview,
  onOut: onData
}: Props) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  React.useEffect(() => {
    if (!iframeRef.current) return
    const iframe = iframeRef.current
    const nodebox = new NodeboxRuntime({ iframe })
    let shell: ShellProcess | null = null

    nodebox.connect().then(async () => {
      await nodebox.fs.init(files)
      shell = nodebox.shell.create()
      shell.stdout.on('data', (data) => {
        onData(data)
      })
      const { id } = await shell.runCommand(runCommand.command, runCommand.args)
      const { url, port } = await nodebox.preview.waitForPort(
        waitPort,
        60 * 1000
      )
      onPreview(url)
      for await (const data of inData) {
        shell.stdin.write(data)
      }
    })
    return () => {
      if (shell) {
        shell.kill()
        shell = null
      }
    }
  }, [
    iframeRef.current,
    files,
    runCommand,
    waitPort,
    onPreview,
    inData,
    onData
  ])

  return <iframe ref={iframeRef} className={className}></iframe>
}

export default Nodebox
