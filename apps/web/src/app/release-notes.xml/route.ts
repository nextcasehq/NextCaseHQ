import { NextResponse } from 'next/server';
import releaseNotes from '@/content/release-notes.json';

/**
 * RSS 2.0 feed of release notes, for discoverability by feed readers and
 * AI-powered crawlers. Source of truth is content/release-notes.json —
 * update that file when shipping a new release-worthy change.
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nextcasehq.com';

  const items = releaseNotes
    .map(
      (note) => `
    <item>
      <title>${escapeXml(note.title)}</title>
      <link>${baseUrl}/help#${note.slug}</link>
      <guid>${baseUrl}/help#${note.slug}</guid>
      <pubDate>${new Date(note.date).toUTCString()}</pubDate>
      <description>${escapeXml(note.description)}</description>
    </item>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>NextCaseHQ Release Notes</title>
    <link>${baseUrl}</link>
    <description>Product updates and release notes for NextCaseHQ.</description>
    <language>en-in</language>${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
