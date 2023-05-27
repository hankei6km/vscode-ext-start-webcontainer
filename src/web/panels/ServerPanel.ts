import {
  Disposable,
  ProgressLocation,
  Uri,
  ViewColumn,
  Webview,
  WebviewPanel,
  env,
  window,
  workspace
} from 'vscode'
import { getUri } from '../utilities/getUri'
import { getNonce } from '../utilities/getNonce'
import { Loop, LoopMessage } from '../utilities/loop'
import { FilesAdaptor } from '../utilities/filesAdaptor'
import { Chan } from 'chanpuru'
import { PreviewUrls } from '../utilities/previewUrls'
import { starting } from '../utilities/starting'

/**
 * This class manages the state and behavior of HelloWorld webview panels.
 *
 * It contains all the data and methods for:
 *
 * - Creating and rendering HelloWorld webview panels
 * - Properly cleaning up and disposing of webview resources when the panel is closed
 * - Setting the HTML (and by proxy CSS/JavaScript) content of the webview panel
 * - Setting message listeners so data can be passed between the webview and extension
 */
export class ServerPanel {
  public static currentPanel: ServerPanel | undefined
  private readonly _panel: WebviewPanel
  private _disposables: Disposable[] = []
  private _previewUrls: PreviewUrls
  private _filesAdaptors: FilesAdaptor[] = []

  /**
   * The HelloWorldPanel class private constructor (called only from the render method).
   *
   * @param panel A reference to the webview panel
   * @param extensionUri The URI of the directory containing the extension
   */
  private constructor(
    panel: WebviewPanel,
    extensionUri: Uri,
    previewUrls: PreviewUrls
  ) {
    this._panel = panel
    this._previewUrls = previewUrls

    // Set an event listener to listen for when the panel is disposed (i.e. when the user closes
    // the panel or when the panel is closed programmatically)
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables)

    // Set the HTML content for the webview panel
    this._panel.webview.html = this._getWebviewContent(
      this._panel.webview,
      extensionUri
    )

    // Set an event listener to listen for messages passed from the webview context
    this._setWebviewMessageListener(this._panel.webview)
  }

  /**
   * Renders the current webview panel if it exists otherwise a new webview panel
   * will be created and displayed.
   *
   * @param extensionUri The URI of the directory containing the extension.
   */
  public static render(extensionUri: Uri, previewUrls: PreviewUrls) {
    if (ServerPanel.currentPanel) {
      // If the webview panel already exists reveal it
      ServerPanel.currentPanel._panel.reveal(ViewColumn.One)
    } else {
      // If a webview panel does not already exist create and show a new one
      const panel = window.createWebviewPanel(
        // Panel view type
        'serverPanel',
        // Panel title
        'jsh terminal',
        // The editor column the panel should be displayed in
        ViewColumn.One,
        // Extra panel configurations
        {
          // Enable JavaScript in the webview
          enableScripts: true,
          retainContextWhenHidden: true,
          // Restrict the webview to only load resources from the `out` and `webview-ui/build` directories
          localResourceRoots: [
            Uri.joinPath(extensionUri, 'out'),
            Uri.joinPath(extensionUri, 'webview-ui/build')
          ]
        }
      )

      ServerPanel.currentPanel = new ServerPanel(
        panel,
        extensionUri,
        previewUrls
      )
    }
  }

  /**
   * Cleans up and disposes of webview resources when the webview panel is closed.
   */
  public dispose() {
    ServerPanel.currentPanel = undefined

    // Dispose of the current webview panel
    this._panel.dispose()

    // Dispose of all disposables (i.e. commands) for the current webview panel
    while (this._disposables.length) {
      const disposable = this._disposables.pop()
      if (disposable) {
        disposable.dispose()
      }
    }
  }

  /**
   * Defines and returns the HTML that should be rendered within the webview panel.
   *
   * @remarks This is also the place where references to the React webview build files
   * are created and inserted into the webview HTML.
   *
   * @param webview A reference to the extension webview
   * @param extensionUri The URI of the directory containing the extension
   * @returns A template string literal containing the HTML that should be
   * rendered within the webview panel
   */
  private _getWebviewContent(webview: Webview, extensionUri: Uri) {
    // The CSS file from the React build output
    const stylesUri = getUri(webview, extensionUri, [
      'webview-ui',
      'build',
      'assets',
      'index.css'
    ])
    // The JS file from the React build output
    const scriptUri = getUri(webview, extensionUri, [
      'webview-ui',
      'build',
      'assets',
      'index.js'
    ])

    const nonce = getNonce()

    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    // xterm.js は style-src 'unsafe-inline' が必要。
    // https://github.com/xtermjs/xterm.js/issues/4445
    // frame-src の  https://nodebox-runtime.codesandbox.io/ は Nodebox(で動かす vite と websocket)用の iframe で使う。
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; frame-src https://nodebox-runtime.codesandbox.io/;">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>jsh</title>
        </head>
        <body>
          <div id="app">
          </div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `
  }

  /**
   * Sets up an event listener to listen for messages passed from the webview context and
   * executes code based on the message that is recieved.
   *
   * @param webview A reference to the extension webview
   * @param context A reference to the extension context
   */
  private _setWebviewMessageListener(webview: Webview) {
    const ch = new Chan<LoopMessage>(0)
    const loop = new Loop(
      webview.postMessage.bind(webview),
      ch.send,
      ch.receiver()
    )
    const chProgress = starting()

    chProgress.send({ increment: 25, message: 'starting base server' })

    webview.onDidReceiveMessage(
      async (message: any) => {
        const type = message.type

        switch (type) {
          case 'start':
            await chProgress.send({
              increment: 25,
              message: 'starting container'
            })
            const url = message.payload.url
            // window.showInformationMessage(url)
            env.openExternal(Uri.parse(url))
            break

          case 'message:command':
            switch (message.payload.command) {
              case 'setup':
                await chProgress.send({
                  increment: 25,
                  message: 'loading workspace files'
                })
                const files = new FilesAdaptor(
                  message.id,
                  workspace,
                  loop.postCommand.bind(loop)
                )
                this._filesAdaptors.push(files)
                await files.setup()
                chProgress.close()
                webview.postMessage({
                  type: 'message:view',
                  payload: { command: 'termReady' }
                })
                files.watch(this._disposables)
                break
              case 'addPreviewUrl':
                const previewUrl = message.payload.previewUrl
                window.showInformationMessage(
                  `Preview URL added: ${previewUrl}`
                )
                this._previewUrls.addUrl(previewUrl)
                break
              default:
                await loop.handleMessage(message)
            }

            return
          // Add more switch case statements here as more webview message commands
          // are created within the webview context (i.e. inside media/main.js)
        }
      },
      undefined,
      this._disposables
    )
  }

  public async pickAllFiles() {
    if (ServerPanel.currentPanel) {
      for (const files of this._filesAdaptors) {
        await files.pickAllFiles()
      }
    }
  }
}
