import { ProgressLocation, window } from 'vscode'
import { Chan } from 'chanpuru'

export type Progress = {
  increment: number
  message?: string
}
export function starting() {
  const ch = new Chan<Progress>(0)

  window.withProgress(
    {
      location: ProgressLocation.Notification,
      title: 'Start WebContainer',
      cancellable: false
    },
    (progress, token) => {
      return new Promise<void>(async (resolve) => {
        for await (const p of ch.receiver()) {
          progress.report(p)
        }
        resolve()
      })
    }
  )

  return ch
}
