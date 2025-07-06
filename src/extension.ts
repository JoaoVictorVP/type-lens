import * as vscode from 'vscode';

const ABOVE_CMD = 'typeLens.above';
const cfg = () => vscode.workspace.getConfiguration('typeLens');
const prefix = () => cfg().get<string>('prefix', '// ');
const hintFormat = () => cfg().get<string>('hintFormat', '{word}: {hint}');
const sep = () => cfg().get<string>('separator', ', ');
const placement = () => cfg().get<'eol' | 'above'>('placement', 'eol');
const eolMargin = () => cfg().get<string>('eolMargin', '0 0 0 0.25rem');
const eolFontStyle = () => cfg().get<string>('eolFontStyle', 'normal');
const eolFontWeight = () => cfg().get<string>('eolFontWeight', 'normal');
const eolBorder = () => cfg().get<string>('eolBorder', 'none');
const eolBackgroundColor = () => cfg().get<string>('eolBackgroundColor', 'none');

function processHintStr(hint: string): string {
	hint = hint.trim();
	hint = hint.replace(/\s+/g, ' ');
	hint = hint.replace(/^[ .,;!:?]+|[ .,;!:?]+$/g, '');
	if (hint.length === 0) {
		return '';
	}
	return hint;
}

let eolDecoration: vscode.TextEditorDecorationType;
buildEolDecoration();
function buildEolDecoration() {
	if (eolDecoration) {
		eolDecoration.dispose();
	}
	const eolBgColor = eolBackgroundColor();
	eolDecoration = vscode.window.createTextEditorDecorationType({
		after: {
			color: new vscode.ThemeColor('editorCodeLens.foreground'),
			margin: eolMargin(),
			fontStyle: eolFontStyle(),
			fontWeight: eolFontWeight(),
			border: eolBorder(),
			backgroundColor: eolBgColor === 'none'
				? undefined
				: eolBgColor,
		},
		rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
	});
}

function processInlayHints(hints: vscode.InlayHint[], doc: vscode.TextDocument) {
	const map: Map<number, { label: string, hint: vscode.InlayHint }[]> = new Map();
	for (const h of hints) {
		const txt = typeof h.label === 'string'
			? h.label
			: h.label.map(p => typeof p === 'string' ? p : p.value).join('');

		const entry = map.get(h.position.line);
		const processedHint = processHintStr(txt);
		const finalHint = hintFormat()
			.replace('{word}', wordInfo(h.position, doc))
			.replace('{hint}', processedHint);
		if (entry) {
			entry.push({ label: finalHint, hint: h });
		} else {
			map.set(h.position.line, [{ label: finalHint, hint: h }]);
		}
	}
	return map;
}

function wordInfo(pos: vscode.Position, doc: vscode.TextDocument) {
	const range = doc.getWordRangeAtPosition(pos);
	const word = range ? doc.getText(range) : '';
	return word;
}

class TypeLensCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChange = new vscode.EventEmitter<void>();
    readonly onDidChangeCodeLenses = this._onDidChange.event;

    refresh() { this._onDidChange.fire(); }
	dispose() {
		if (this._onDidChange) {
			this._onDidChange.fire();
		}
		this._onDidChange.dispose();
		vscode.window.visibleTextEditors.forEach(ed => ed.setDecorations(eolDecoration, []));
	}

    async provideCodeLenses(doc: vscode.TextDocument): Promise<vscode.CodeLens[]> {
        const full = new vscode.Range(0, 0, doc.lineCount, 0);
        const hints = await vscode.commands.executeCommand<vscode.InlayHint[]>(
            'vscode.executeInlayHintProvider', doc.uri, full
        );

        const map = processInlayHints(hints, doc);

        const lenses: vscode.CodeLens[] = [];
        for (const [line, pieces] of map) {
			if (pieces.length === 0) { continue; } // skip empty lines
			let first = true;
			for(const { label, hint } of pieces) {
				const title = first
					? `${prefix()}${label}`
					: `${label}`;
				first = false;
				lenses.push(new vscode.CodeLens(
					new vscode.Range(line, 0, line, 0),
					{
						title,
						command: ABOVE_CMD,
						tooltip: hint.tooltip?.toString() ?? '',
						arguments: [doc.uri, hint.position]
					}
				));
			}
        }
        return lenses;
    }
}

const hoverDeco  = vscode.window.createTextEditorDecorationType({});
async function showHoverNow(md: vscode.MarkdownString, pos: vscode.Position) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }
  const prevSelection = editor.selection;
  const range = new vscode.Range(pos, pos);
  editor.selection = new vscode.Selection(pos, pos);
  editor.setDecorations(hoverDeco, [{ range, hoverMessage: md }]);
  await vscode.commands.executeCommand('editor.action.showHover');
  const check = vscode.window.onDidChangeTextEditorSelection(() => {
	editor.setDecorations(hoverDeco, []);
	check.dispose();
	editor.selection = prevSelection;
  }, undefined, []);
}

const whenDisposing: (() => void)[] = [];

export function activate(ctx: vscode.ExtensionContext) {
	ctx.subscriptions.push(
        vscode.commands.registerCommand(ABOVE_CMD, async (uri: vscode.Uri, pos: vscode.Position) => {
			const ogPos = pos;
			pos = new vscode.Position(pos.line, pos.character - 1);
			const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
				'vscode.executeHoverProvider',
				uri,
				pos
			);
			const hoverMarkdown = hovers[0]?.contents?.[0];
			if (hoverMarkdown) {
				let realMarkdown: string;
				if(hoverMarkdown instanceof vscode.MarkdownString) {
					realMarkdown = hoverMarkdown.value;
				} else if (typeof hoverMarkdown === 'string') {
					realMarkdown = hoverMarkdown;
				} else {
					realMarkdown = hoverMarkdown.toString();
				}
				showHoverNow(new vscode.MarkdownString(realMarkdown), ogPos);
			} else {
				showHoverNow(new vscode.MarkdownString('No hover information available.'), ogPos);
			}
		})
    );

    let lensProv: TypeLensCodeLensProvider | undefined;
	let lensProvDisposer: vscode.Disposable | undefined;
	function setupLensProvider() {
		if(lensProv) {
			return;
		}
		if (placement() === 'above') {
			lensProv = new TypeLensCodeLensProvider();
			ctx.subscriptions.push(
				lensProvDisposer = vscode.languages.registerCodeLensProvider({ scheme: '*' }, lensProv)
			);
		}
	}
	function disposeLensProvider() {
		if(!lensProv) {
			return;
		}
		lensProv.dispose();
		lensProv = undefined;
		lensProvDisposer?.dispose();
		lensProvDisposer = undefined;
	}
	whenDisposing.push(() => {
		disposeLensProvider();
		eolDecoration.dispose();
		hoverDeco.dispose();
	});

    const refresh = () => {
        if (placement() === 'eol') {
			disposeLensProvider();
            vscode.window.visibleTextEditors.forEach(refreshEol);
        } else {
			setupLensProvider();
            lensProv?.refresh();
        }
    };

    ctx.subscriptions.push(
        vscode.commands.registerCommand('typeLens.refresh', refresh),
        vscode.window.onDidChangeVisibleTextEditors(refresh),
        vscode.window.onDidChangeTextEditorVisibleRanges(e => {
			return placement() === 'eol' && refreshEol(e.textEditor);
		}),
        vscode.workspace.onDidChangeTextDocument(e => {
            if (placement() === 'eol') {
                const ed = vscode.window.visibleTextEditors.find(ed => ed.document === e.document);
                if (ed) { refreshEol(ed); }
            } else {
                lensProv?.refresh();
            }
        })
    );

	vscode.workspace.onDidChangeConfiguration(e => {
		if (e.affectsConfiguration('typeLens')) {
			buildEolDecoration();
			refresh();
		}
	});

    refresh();
}

async function refreshEol(editor: vscode.TextEditor) {
    if (!editor) { return; }

    const vis = editor.visibleRanges[0] ?? new vscode.Range(0, 0, 0, 0);
    const start = Math.max(0, vis.start.line - 30);
    const end = Math.min(editor.document.lineCount, vis.end.line + 30);
    const rng = new vscode.Range(start, 0, end, 0);

    const hints = await vscode.commands.executeCommand<vscode.InlayHint[]>(
        'vscode.executeInlayHintProvider', editor.document.uri, rng
    );

    const map = processInlayHints(hints, editor.document);

    const decos: vscode.DecorationOptions[] = [];
    for (const [line, pieces] of map) {
		if (pieces.length === 0) { continue; }
        const endPos = editor.document.lineAt(line).range.end;

		let hoverMessage = "";
		for(const { label: _, hint } of pieces) {
			hoverMessage += `${hint.tooltip?.toString() ?? ''}\n`;
		}

		const labels = pieces.map(({ label }) => label);
        decos.push({
            range: new vscode.Range(endPos, endPos),
			hoverMessage: hoverMessage.trim(),
            renderOptions: {
                after: { contentText: ` ${prefix()}${labels.join(sep())}` }
            }
        });
    }

    editor.setDecorations(eolDecoration, decos);
}

export function deactivate() {
	whenDisposing.forEach(fn => fn());
}
