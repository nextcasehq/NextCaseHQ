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

const MENU_WIDTH_PX = 192;
const MENU_HEIGHT_ESTIMATE_PX = 260;
const VIEWPORT_MARGIN_PX = 8;

/** Right-click context menu for the editor surface (UI/UX Specification §10). */
export function EditorContextMenu({ editor, position, onClose }: EditorContextMenuProps) {
  React.useEffect(() => {
    if (!position) return;
    const close = () => onClose();
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('click', close);
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [position, onClose]);

  if (!editor || !position) return null;

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  // Clamped so a right-click near the right/bottom edge never renders the
  // menu partly off-screen.
  const left = Math.min(position.x, window.innerWidth - MENU_WIDTH_PX - VIEWPORT_MARGIN_PX);
  const top = Math.min(position.y, window.innerHeight - MENU_HEIGHT_ESTIMATE_PX - VIEWPORT_MARGIN_PX);

  return (
    <div
      role="menu"
      aria-label="Editor context menu"
      style={{ top: Math.max(VIEWPORT_MARGIN_PX, top), left: Math.max(VIEWPORT_MARGIN_PX, left) }}
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
