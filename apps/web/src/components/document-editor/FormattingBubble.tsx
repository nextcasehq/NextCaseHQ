'use client';

import React from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';

interface FormattingBubbleProps {
  editor: Editor | null;
}

function BubbleButton({ onClick, active, label, children }: { onClick: () => void; active?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`w-7 h-7 rounded-md text-xs font-bold transition-colors ${
        active ? 'bg-[#111111] text-white' : 'text-[#3A3222] hover:bg-[#FBF8F1]'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * A contextual formatting bubble that appears near a text selection
 * (UI/UX Specification §10), supplementing the ribbon with quick access
 * to the most common formatting actions — genuine Tiptap functionality
 * via @tiptap/react's BubbleMenu (MIT), not a decorative mockup.
 */
export function FormattingBubble({ editor }: FormattingBubbleProps) {
  if (!editor) return null;

  return (
    <BubbleMenu editor={editor} className="flex items-center gap-0.5 bg-white border border-[#E7DFC9] rounded-lg shadow-lg px-1 py-1">
      <BubbleButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} label="Bold">
        B
      </BubbleButton>
      <BubbleButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} label="Italic">
        I
      </BubbleButton>
      <BubbleButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} label="Underline">
        U
      </BubbleButton>
      <BubbleButton
        onClick={() => editor.chain().focus().toggleHighlight({ color: '#FEF08A' }).run()}
        active={editor.isActive('highlight')}
        label="Highlight"
      >
        H
      </BubbleButton>
      <span className="w-px h-4 bg-[#E7DFC9] mx-0.5" aria-hidden="true" />
      <BubbleButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} label="Align left">
        ⯇
      </BubbleButton>
      <BubbleButton
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        active={editor.isActive({ textAlign: 'justify' })}
        label="Justify"
      >
        ▤
      </BubbleButton>
    </BubbleMenu>
  );
}
