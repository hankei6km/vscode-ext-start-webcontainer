import { commands, ExtensionContext, Uri, window } from 'vscode'
import { ServerPanel } from './panels/ServerPanel'
import { PreviewUrls } from './utilities/previewUrls'

export function activate(context: ExtensionContext) {
  const previewUrls = new PreviewUrls()

  const startWebContainer = commands.registerCommand(
    'start-webcontainer.startWebContainer',
    () => {
      ServerPanel.render(context.extensionUri, previewUrls)
    }
  )
  context.subscriptions.push(startWebContainer)

  const openWebContainerPreview = commands.registerCommand(
    'start-webcontainer.openWebContainerPreview',
    async () => {
      let i = 0
      const result = await window.showQuickPick(previewUrls.getUrls(), {
        placeHolder: 'select a url to open simple browser'
        //onDidSelectItem: (item) =>
        //  window.showInformationMessage(`Focus ${++i}: ${item}`)
      })
      //window.showInformationMessage(`Got: ${result}`)
      if (result) {
        await commands.executeCommand('simpleBrowser.show', Uri.parse(result))
      }
    }
  )
  context.subscriptions.push(openWebContainerPreview)

  const pickAllFiles = commands.registerCommand(
    'start-webcontainer.pickAllFiles',
    async () => {
      ServerPanel.currentPanel?.pickAllFiles()
    }
  )
  context.subscriptions.push(pickAllFiles)
}
