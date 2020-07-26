import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	vscode.workspace.onDidChangeConfiguration(onDidChangeConfiguration)
	onDidChangeConfiguration();
}

export function deactivate() { }

let disposable: vscode.Disposable | null = null

function onDidChangeConfiguration() {
	if (vscode.workspace.getConfiguration("elasticTabstopsLite.format").get("enable")) {
		if (!disposable) {
			disposable = vscode.languages.registerDocumentFormattingEditProvider([{ scheme: "file" }, { scheme: "untitled" }], new ElasticTabstops())
		}
	} else if (disposable) {
		disposable.dispose()
		disposable = null
	}
}

class ElasticTabstops implements vscode.DocumentFormattingEditProvider {
	provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.ProviderResult<vscode.TextEdit[]> {
		const doc: string = document.getText()
		const texts: string[][] = []
		const temps: string[] = []
		const editFlags: boolean[] = []
		const result: vscode.TextEdit[] = []

		function scan(level: number, lineStart: number, lineEnd: number) {
			if (lineStart >= lineEnd) {
				return
			}
			for (let i = lineStart, start = lineStart; i <= lineEnd; i++) {
				if ((texts[i - 1].length <= level + 1) && (texts[i].length > level + 1)) {
					start = i
				} else if ((texts[i - 1].length > level + 1) && (texts[i].length <= level + 1)) {
					format(level, start, i)
				}
			}
		}

		function format(level: number, lineStart: number, lineEnd: number) {
			let maxLength = 0
			for (let i = lineStart; i < lineEnd; i++) {
				temps[i] = texts[i][level].trimRight()
				maxLength = Math.max(maxLength, temps[i].length)
			}
			for (let i = lineStart; i < lineEnd; i++) {
				if (texts[i][level].length !== maxLength) {
					texts[i][level] = temps[i].padEnd(maxLength, ' ')
					editFlags[i] = true
				}
			}
			scan(level + 1, lineStart, lineEnd)
		}

		texts.push([""])
		for (let i = 0, start = 0; i <= doc.length; i++) {
			if ((doc[i - 1] === '\n') || (i >= doc.length)) {
				const eol = doc[i - 2] === '\r' ? 2 : 1
				texts.push(doc.slice(start, i - eol).split('\t'))
				start = i
			}
		}
		texts.push([""])
		scan(0, 1, texts.length - 1)
		for (let i = 1; i < texts.length - 1; i++) {
			if (editFlags[i]) {
				const r = new vscode.Range(i - 1, 0, i - 1, Number.MAX_SAFE_INTEGER)
				result.push(vscode.TextEdit.replace(r, texts[i].join('\t')))
			}
		}
		return result
	}
}
