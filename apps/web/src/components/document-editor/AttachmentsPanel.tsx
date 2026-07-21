'use client';

import React from 'react';

interface AttachedFile {
  id: string;
  name: string;
  sizeBytes: number;
  kind: 'pdf' | 'docx' | 'image' | 'other';
}

const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.gif', '.webp'];

function classifyFile(name: string): AttachedFile['kind'] {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'docx';
  if (/\.(png|jpe?g|gif|webp)$/.test(lower)) return 'image';
  return 'other';
}

const FILE_ICON: Record<AttachedFile['kind'], string> = {
  pdf: '📄',
  docx: '📝',
  image: '🖼',
  other: '📎',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Attachments panel — UI only, per the UI/UX Specification §4. Files are
 * held in local component state as a session-only staging list; nothing
 * is uploaded to `/api/documents/upload` or any other endpoint here.
 * Wiring this list into that existing endpoint (or a dedicated
 * draft-attachment endpoint) is explicitly future work, so this panel
 * says so plainly rather than implying a persistence it doesn't have.
 */
export function AttachmentsPanel() {
  const [files, setFiles] = React.useState<AttachedFile[]>([]);
  const [isDragActive, setIsDragActive] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const next: AttachedFile[] = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      sizeBytes: file.size,
      kind: classifyFile(file.name),
    }));
    if (next.length > 0) setFiles((prev) => [...prev, ...next]);
  };

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  return (
    <div className="space-y-3" aria-label="Attachments">
      <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">Attachments</h2>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragActive(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
          isDragActive ? 'border-[#8A6D2F] bg-[#FBF6EA]' : 'border-[#E7DFC9] bg-[#FBF8F1]/60'
        }`}
      >
        <p className="text-[10px] font-semibold text-[#8A7A56] mb-2">Drag &amp; drop files here</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-3 py-1.5 bg-white border border-[#E7DFC9] text-[#8A6D2F] text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-[#FBF8F1] transition-all"
        >
          Upload
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
          aria-label="Upload attachment"
        />
        <p className="text-[9px] text-[#B0A588] mt-2">PDF, DOCX, and images</p>
      </div>

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((file) => (
            <li key={file.id} className="flex items-center gap-2 bg-white border border-[#E7DFC9] rounded-lg px-2.5 py-2">
              <span className="text-base shrink-0" aria-hidden="true">
                {FILE_ICON[file.kind]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-[#3A3222] truncate">{file.name}</p>
                <p className="text-[9px] text-[#B0A588]">{formatSize(file.sizeBytes)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                aria-label={`Remove ${file.name}`}
                className="text-[#B0A588] hover:text-red-600 text-xs font-bold shrink-0"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[9px] text-[#B0A588] italic leading-snug">
        Attached for this session only — not yet saved to your account. Matter linkage and AI context integration are planned for a future milestone.
      </p>
    </div>
  );
}
