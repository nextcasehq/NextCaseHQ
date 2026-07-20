'use client';

import React, { useState } from 'react';
import { EXISTING_MATTER_OPTIONS, type ExistingMatterOption } from './templates-data';
import type { EntryChoice } from './types';

interface StartScreenProps {
  onChooseEntry: (choice: EntryChoice) => void;
  onLinkExisting: (matter: ExistingMatterOption, nextPath: 'draft-new' | 'upload-existing') => void;
}

const CARDS: { choice: EntryChoice; icon: string; title: string; description: string }[] = [
  {
    choice: 'draft-new',
    icon: '📝',
    title: 'Draft a New Document',
    description: 'Start from a ready-made template or a blank page.',
  },
  {
    choice: 'upload-existing',
    icon: '📄',
    title: 'Upload an Existing Document',
    description: 'Add a document you already received or filed elsewhere.',
  },
  {
    choice: 'link-existing',
    icon: '🔗',
    title: 'Link Existing Matter',
    description: 'Continue work under a matter you already have.',
  },
];

export default function StartScreen({ onChooseEntry, onLinkExisting }: StartScreenProps) {
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [selectedMatterId, setSelectedMatterId] = useState('');

  const selectedMatter = EXISTING_MATTER_OPTIONS.find((m) => m.id === selectedMatterId) || null;

  const handleCardClick = (choice: EntryChoice) => {
    if (choice === 'link-existing') {
      setShowLinkPicker(true);
      return;
    }
    onChooseEntry(choice);
  };

  if (showLinkPicker) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-lg bg-white border border-[#E7DFC9]/80 rounded-2xl p-6 md:p-8 space-y-5">
          <div>
            <button
              onClick={() => setShowLinkPicker(false)}
              className="text-[10px] font-bold uppercase tracking-widest text-[#B0A588] hover:text-[#8A6D2F]"
            >
              ← Back
            </button>
            <h2 className="text-lg font-black uppercase tracking-widest text-[#111111] mt-2">Link Existing Matter</h2>
            <p className="text-xs text-[#8A7A56] mt-1">Choose a matter to continue work under. Case details are already known for this matter.</p>
          </div>

          <select
            value={selectedMatterId}
            onChange={(e) => setSelectedMatterId(e.target.value)}
            className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium text-[#3A3222]"
          >
            <option value="">Select a matter...</option>
            {EXISTING_MATTER_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>

          {selectedMatter && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">What would you like to do?</p>
              <button
                onClick={() => onLinkExisting(selectedMatter, 'draft-new')}
                className="w-full text-left px-4 py-3 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg hover:bg-[#F4EEE0] transition-all text-xs font-bold text-[#3A3222]"
              >
                📝 Draft a New Document under this matter
              </button>
              <button
                onClick={() => onLinkExisting(selectedMatter, 'upload-existing')}
                className="w-full text-left px-4 py-3 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg hover:bg-[#F4EEE0] transition-all text-xs font-bold text-[#3A3222]"
              >
                📄 Upload a Document under this matter
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest text-[#111111]">How would you like to begin?</h2>
          <p className="text-xs md:text-sm text-[#8A7A56]">Every path leads to the same Matter Register.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CARDS.map((card) => (
            <button
              key={card.choice}
              onClick={() => handleCardClick(card.choice)}
              className="text-left bg-white border border-[#E7DFC9]/80 rounded-2xl p-6 hover:border-[#8A6D2F] hover:shadow-lg transition-all space-y-3"
            >
              <span className="text-3xl">{card.icon}</span>
              <h3 className="text-sm font-black uppercase tracking-wider text-[#111111]">{card.title}</h3>
              <p className="text-xs text-[#8A7A56] leading-relaxed">{card.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
