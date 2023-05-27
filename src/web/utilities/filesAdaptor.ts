import { FileType, Uri } from 'vscode'
import type { Disposable, workspace as workspaceType } from 'vscode'
import type { Loop } from './loop'
import { Minimatch } from 'minimatch'

type PayloadFileKind = 'file' | 'directory'
type PayloadFileBase = {
  kind: PayloadFileKind
  path: string
}
type PayloadFileUpdateContent = {
  command: 'updateContent'
  content: number[]
}
type PayloadFilePickFile = {
  command: 'pickFile'
}
type PayloadFilePickAllFiles = {
  command: 'pickAllFiles'
}
type PayloadFileEntrires = {
  command: 'entries'
  entries: string[]
}

export type PayloadFile = PayloadFileBase &
  (
    | PayloadFileUpdateContent
    | PayloadFilePickFile
    | PayloadFilePickAllFiles
    | PayloadFileEntrires
  )

export class FilesAdaptor {
  private workspace: typeof workspaceType
  private _id: string
  private postCommand: Loop['postCommand']
  private ignoreMatcher: Minimatch = new Minimatch(
    '**/{node_modules,.git,build,builds,dist,dists,out,outs,coverage}/**',
    {
      dot: true
    }
  )
  private filePathMap: Record<string, Uri> = {}
  private pollPickFiles: string[] = ['/package.json', '/package-lock.json']
  // ローカルファイルの fs provider だとエディターで開いていないと変更が検知できない( onDidChange が発生しない)。
  // 込み入ってくるので pickFile 後の処理スキップは一旦保留。
  // private skip: Record<string, number> = {}
  constructor(
    id: string,
    workspace: typeof workspaceType,
    postCommand: Loop['postCommand']
  ) {
    this._id = id
    this.workspace = workspace
    this.postCommand = postCommand
  }

  private makePayloadFilease(kind: PayloadFileKind, path: string) {
    return {
      kind,
      path
    }
  }

  // private setSkip(path: string) {
  //   if (this.skip[path] === undefined) {
  //     this.skip[path] = 0
  //   }
  //   this.skip[path]++
  // }
  // private releaseSkip(path: string) {
  //   if (this.skip[path] !== undefined) {
  //     this.skip[path]--
  //     if (this.skip[path] === 0) {
  //       delete this.skip[path]
  //     }
  //   }
  // }
  // private chkSkip(path: string): boolean {
  //   if (this.skip[path] === undefined || this.skip[path] === 0) {
  //     return false
  //   }
  //   this.releaseSkip(path)
  //   return true
  // }

  async *walk(
    ignoreMatcher: Minimatch,
    dir: Uri,
    filePathInFiles: string[] = []
  ): AsyncGenerator<[Uri, string], void, void> {
    //const folder = this.workspace.workspaceFolders?.[0]
    //if (folder) {
    for await (const [
      fileName,
      fileType
    ] of await this.workspace.fs.readDirectory(dir)) {
      const entry = Uri.joinPath(dir, fileName)
      if (!ignoreMatcher.match(entry.path)) {
        if (fileType === FileType.Directory) {
          yield* this.walk(ignoreMatcher, entry, [...filePathInFiles, fileName])
        } else if (fileType === FileType.File) {
          yield [entry, [...filePathInFiles, fileName].join('/')]
        }
      }
    }
    //}
  }

  async setup() {
    const folder = this.workspace.workspaceFolders?.[0]
    if (folder) {
      // workspace.findFiles を使った場合、
      // リモートリポジトリでコミットされていない新規ファイルが扱えない。
      for await (const [file, filePathInFiles] of this.walk(
        this.ignoreMatcher,
        folder.uri,
        []
      )) {
        // file.path から folder.uri.pahh を取り除く。
        const filePath = file.path.replace(folder?.uri.path ?? '', '')
        this.filePathMap[filePath] = file
        const r = await this.workspace.fs.readFile(file)
        const content: number[] = Array.from(r)
        const payload: PayloadFile = {
          ...this.makePayloadFilease('file', filePath),
          command: 'updateContent',
          content
        }
        const receiver = await this.postCommand({
          type: 'message:command',
          id: this._id,
          payload
        })
        if (receiver) {
          for await (const _res of receiver) {
          }
        }
      }
    }
  }

  watch(disposables: Disposable[] = []) {
    //this.workspace
    //  .createFileSystemWatcher('**/**', true, true, true)
    //  .onDidCreate((uri) => {
    //    console.log(`onDidCreate: ${uri.path}`)
    //  })
    //this.workspace
    //  .createFileSystemWatcher('**/**', true, true, true)
    //  .onDidChange((uri) => {
    //    console.log(`onDidChange: ${uri.path}`)
    //  })
    //this.workspace
    //  .createFileSystemWatcher('**/**', true, true, true)
    //  .onDidDelete((uri) => {
    //    console.log(`onDidDelete: ${uri.path}`)
    //  })
    this.workspace.onDidChangeTextDocument(
      async (event) => {
        const uri = event.document.uri
        const folder = this.workspace.getWorkspaceFolder(uri)
        const filePath = uri.path.replace(folder?.uri.path ?? '', '')
        this.filePathMap[filePath] = uri
        console.log(`onDidChangeTextDocument: ${filePath}`)
        // if (this.chkSkip(filePath)) {
        //   return
        // }
        const r = await this.workspace.fs.readFile(uri)
        const content: number[] = Array.from(r)
        const payload: PayloadFile = {
          ...this.makePayloadFilease('file', filePath),
          command: 'updateContent',
          content
        }
        // postCommand が終了する前でも次の event が発生する。
        // 現状では追い越すことはないと思うが要注意。
        const receiver = await this.postCommand({
          type: 'message:command',
          id: this._id,
          payload
        })
        if (receiver) {
          for await (const _res of receiver) {
          }
        }
      },
      undefined,
      disposables
    )
    // バックグラウンドで開始していると fs の provider が ローカルのときに確認のダイアログが表示される。
    // あまりよくないので、一旦保留。
    // ;(async () => {
    //   while (1) {
    //     await new Promise<void>((resolve) => {
    //       setTimeout(async () => {
    //         for (const pickFilePath of this.pollPickFiles) {
    //           await this.pickFile(pickFilePath)
    //         }
    //         resolve()
    //       }, 10000)
    //     })
    //   }
    // })()
  }

  async pickFile(pickFilePath: string) {
    try {
      const payload: PayloadFile = {
        ...this.makePayloadFilease('file', pickFilePath),
        command: 'pickFile'
      }
      const receiver = await this.postCommand({
        type: 'message:command',
        id: this._id,
        payload
      })
      if (receiver) {
        for await (const res of receiver) {
          if (typeof res !== 'string' && res.command === 'updateContent') {
            const content: number[] = res.content
            const uri = this.filePathMap[pickFilePath]
            if (uri !== undefined) {
              await this.workspace.fs.writeFile(uri, Uint8Array.from(content))
              // const prevStat = await this.workspace.fs.stat(uri)
              // await this.workspace.fs.writeFile(uri, Uint8Array.from(content))
              // const curStat = await this.workspace.fs.stat(uri)
              // if (prevStat.mtime === curStat.mtime) {
              //   this.releaseSkip(pickFilePath)
              // }
            }
          }
        }
      }
    } catch (e) {
      // this.releaseSkip(pickFilePath)
      console.error(e)
    }
  }

  async pickAllFiles() {
    try {
      // ここをやっている間は onDidChangeTextDocument が発生しないようにしたい。
      const folder = this.workspace.workspaceFolders?.[0]
      if (folder === undefined) {
        throw new Error('workspaceFolders is undefined')
      }
      const payload: PayloadFile = {
        ...this.makePayloadFilease('directory', '/'),
        command: 'pickAllFiles'
      }
      const receiver = await this.postCommand({
        type: 'message:command',
        id: this._id,
        payload
      })
      if (receiver) {
        for await (const res of receiver) {
          if (typeof res !== 'string' && res.command === 'entries') {
            for (const entry of res.entries) {
              this.filePathMap[entry] = Uri.joinPath(folder.uri, entry)
              await this.pickFile(entry)
            }
          }
        }
      }
    } catch (e) {
      // this.releaseSkip(pickFilePath)
      console.error(e)
    }
  }
}
