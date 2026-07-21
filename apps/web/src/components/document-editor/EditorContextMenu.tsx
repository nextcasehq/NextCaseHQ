'use client';

import React from 'react';
import type { Editor } from '@tiptap/react';
import { cutSelection, copySelection, pasteClipboard } from '@/lib/documents/editor/clipboard';

interface EditorContextMenuProps {
  editor: Editor | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-[#3A3222] hover:bg-[#FBF8F1] rounded-md"
    >
      {children}
    </button>
  );
}

/** Right-click context menu for the editor surface (UI/UX Specification §10). */
export function EditorContextMenu({ editor, position, onClose }: EditorContextMenuProps) {
  React.useEffect(() => {
    if (!position) return;
    const close = () => onClose();
    window.addEventListener('click', close);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
    return () => window.removeEventListener('click', close);
  }, [position, onClose]);

  if (!editor || !position) return null;

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <div
      role="menu"
      aria-label="Editor context menu"
      style={{ top: position.y, left: position.x }}
      className="no-print fixed z-50 w-48 bg-white border border-[#E7DFC9] rounded-lg shadow-xl p-1.5 space-y-0.5"
    >
      <MenuItem onClick={() => run(() => void cutSelection(editor))}>✂ Cut</MenuItem>
      <MenuItem onClick={() => run(() => void copySelection(editor))}>⧉ Copy</MenuItem>
      <MenuItem onClick={() => run(() => void pasteClipboard(editor))}>📋 Paste</MenuItem>
      <div className="h-px bg-[#F4EEE0] my-1" />
      <MenuItem onClick={() => run(() => editor.chain().focus().toggleBold().run())}>B Bold</MenuItem>
      <MenuItem onClick={() => run(() => editor.chain().focus().toggleItalic().run())}>I Italic</MenuItem>
      <MenuItem onClick={() => run(() => editor.chain().focus().toggleUnderline().run())}>U Underline</MenuItem>
      <div className="h-px bg-[#F4EEE0] my-1" />
      <MenuItem onClick={() => run(() => editor.chain().focus().unsetAllMarks().clearNodes().run())}>Clear formatting</MenuItem>
    </div>
  );
}
