import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FilesAdaptor } from './filesAdaptor.js'
import { FileType, type Uri } from 'vscode'
import { Minimatch } from 'minimatch'

vi.mock('vscode', async () => {
  return {
    Uri: {
      file: (path: string) => ({
        path
      }),
      joinPath: (uri: Uri, path: string) => ({
        path: `${uri.path}/${path}`
      })
    },
    FileType: {
      File: 1,
      Directory: 2
    }
  }
})

describe('filesAdaptor', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should walk file tree', async () => {
    const { Uri, FileType } = await import('vscode')
    const workspace = {
      fs: {
        readDirectory: vi
          .fn()
          .mockResolvedValueOnce([
            ['test-1', FileType.File],
            ['test-2', FileType.Directory],
            ['test-3', FileType.File]
          ])
          .mockResolvedValueOnce([
            ['test-4', FileType.File],
            ['test-5', FileType.File]
          ])
      }
    }
    const filesAdaptor = new FilesAdaptor('test-1', workspace as any, vi.fn())
    const files: any[] = []
    for await (const [file, filePathInFiles] of filesAdaptor.walk(
      new Minimatch(
        '**/{node_modules,.git,build,builds,dist,dists,out,outs,coverage}/**',
        {
          dot: true
        }
      ),
      Uri.file('/workspace'),
      []
    )) {
      files.push(file)
    }
    expect(files).toEqual([
      {
        path: '/workspace/test-1'
      },
      {
        path: '/workspace/test-2/test-4'
      },
      {
        path: '/workspace/test-2/test-5'
      },
      {
        path: '/workspace/test-3'
      }
    ])
  })

  it('should setup', async () => {
    const workspace = {
      workspaceFolders: [
        {
          uri: {
            path: '/workspace'
          }
        }
      ],
      fs: {
        readDirectory: vi
          .fn()
          .mockResolvedValueOnce([['test-1', FileType.File]]),
        readFile: vi
          .fn()
          .mockResolvedValue(new Uint8Array([116, 101, 115, 116])) // "test"
      }
    }
    const postCommand = vi.fn()
    const filesAdaptor = new FilesAdaptor(
      'test-1',
      workspace as any,
      postCommand
    )
    await filesAdaptor.setup()
    expect(postCommand).toHaveBeenCalledWith({
      id: 'test-1',
      type: 'message:command',
      payload: {
        kind: 'file',
        path: '/test-1',
        command: 'updateContent',
        content: [116, 101, 115, 116]
      }
    })
  })

  it('should watch', async () => {
    const workspace = {
      onDidChangeTextDocument: vi.fn().mockImplementation((fn) => {
        fn({
          document: {
            uri: {
              path: '/workspace/test-1'
            }
          }
        })
      }),
      getWorkspaceFolder: vi.fn().mockReturnValue({
        uri: {
          path: '/workspace'
        }
      }),
      fs: {
        readFile: vi
          .fn()
          .mockResolvedValue(new Uint8Array([116, 101, 115, 116])) // "test"
      }
    }
    const command = await new Promise((resolve) => {
      const postCommand = vi.fn().mockImplementation((command) => {
        resolve(command)
      })
      const filesAdaptor = new FilesAdaptor(
        'test-1',
        workspace as any,
        postCommand
      )
      filesAdaptor.watch([])
    })
    expect(workspace.onDidChangeTextDocument).toHaveBeenCalledWith(
      expect.any(Function),
      undefined,
      []
    )
    expect(command).toEqual({
      id: 'test-1',
      type: 'message:command',
      payload: {
        kind: 'file',
        path: '/test-1',
        command: 'updateContent',
        content: [116, 101, 115, 116]
      }
    })
  })

  it('should pick a file', async () => {
    const workspace = {
      workspaceFolders: [
        {
          uri: {
            path: '/workspace'
          }
        }
      ],
      fs: {
        readDirectory: vi
          .fn()
          .mockResolvedValueOnce([['test-2', FileType.File]]),
        readFile: vi.fn().mockResolvedValue(new Uint8Array([])),
        writeFile: vi.fn().mockResolvedValue(undefined)
      }
    }
    const g = async function* () {
      yield {
        kind: 'file',
        path: '/test-2',
        command: 'updateContent',
        content: [116, 101, 115, 116]
      }
    }
    const postCommand = vi
      .fn()
      .mockResolvedValueOnce((async function* () {})()) // setup で利用される ack 的なもの
      .mockResolvedValueOnce(g()) // pickFile で利用される mock
    const filesAdaptor = new FilesAdaptor(
      'test-1',
      workspace as any,
      postCommand
    )
    await filesAdaptor.setup()
    await filesAdaptor.pickFile('/test-2')
    expect(workspace.fs.writeFile).toHaveBeenCalledWith(
      {
        path: '/workspace/test-2'
      },
      new Uint8Array([116, 101, 115, 116])
    )
  })
})
