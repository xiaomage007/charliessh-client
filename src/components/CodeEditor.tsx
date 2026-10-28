import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/editor/editor.worker.js?worker'
import tsWorker from 'monaco-editor/language/typescript/ts.worker.js?worker'

// 桌面端离线环境无法访问 CDN，改为使用本地打包的 Monaco
// 注意 worker 路径不能带 esm/vs 前缀：monaco-editor 的 exports 为 "./*": "./esm/vs/*.js"
const monacoGlobal = self as unknown as {
  MonacoEnvironment: { getWorker: (_moduleId: string, label: string) => Worker }
}

monacoGlobal.MonacoEnvironment = {
  getWorker: (_moduleId, label) =>
    label === 'typescript' || label === 'javascript' ? new tsWorker() : new editorWorker(),
}

loader.config({ monaco })

export function CodeEditor() {
  return (
    <div className="flex-1 flex flex-col bg-[#1e1e1e]">
      {/* 编辑器标题栏 */}
      <div className="h-9 bg-[#252526] border-b border-[#3c3c3c] flex items-center px-2">
        <div className="px-3 py-1 text-sm text-white bg-[#1e1e1e] border-t-2 border-[#007acc] rounded-t">
          editor.js
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          theme="vs-dark"
          defaultValue={`// CharlieSSH Code Editor
// 使用 AI Agent 协助编写代码

function hello() {
  console.log("Hello from CharlieSSH!");
}
`}
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            padding: { top: 10 },
          }}
        />
      </div>
    </div>
  )
}
