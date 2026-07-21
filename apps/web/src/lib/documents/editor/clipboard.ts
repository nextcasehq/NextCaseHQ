import type { Editor } from '@tiptap/react';

/**
 * Shared clipboard actions for the ribbon's Clipboard group and the
 * editor's right-click context menu — one real implementation via the
 * browser's Clipboard API, not duplicated per caller.
 */
export async function cutSelection(editor: Editor): Promise<void> {
  const { from, to } = editor.state.selection;
  const text = editor.state.doc.textBetween(from, to, '\n');
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard permission denied — the cut still removes the selection.
  }
  editor.chain().focus().deleteSelection().run();
}

export async function copySelection(editor: Editor): Promise<void> {
  const { from, to } = editor.state.selection;
  const text = editor.state.doc.textBetween(from, to, '\n');
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Ignored — clipboard access can be denied by the browser.
  }
}

export async function pasteClipboard(editor: Editor): Promise<void> {
  try {
    const text = await navigator.clipboard.readText();
    if (text) editor.chain().focus().insertContent(text).run();
  } catch {
    // Ignored — clipboard read access can be denied by the browser.
  }
}
