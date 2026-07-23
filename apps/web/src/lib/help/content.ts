import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

/**
 * The Help Centre's content lives inside apps/web (src/content/help/*.md)
 * rather than being read from the repo-root docs/knowledge-base/ folder at
 * runtime — a production deployment only ships apps/web, so the in-app
 * Help Centre must be self-contained. docs/knowledge-base/ remains the
 * authored source of truth; scripts/docs/sync-help-content.js copies from
 * there into this directory (run it after editing any knowledge-base
 * markdown file, same idea as a build step, not a runtime dependency).
 */

export interface HelpArticleMeta {
  slug: string;
  title: string;
  description: string;
}

export const HELP_ARTICLES: HelpArticleMeta[] = [
  { slug: 'user-manual', title: 'User Manual', description: 'The complete guide to using NextCaseHQ — matters, proceedings, Court Notes, drafting, AI, and search.' },
  { slug: 'admin-manual', title: 'Administrator Manual', description: 'Deployment, configuration, environment variables, backups, updates, monitoring, and maintenance.' },
  { slug: 'workflow-library', title: 'Workflow Library', description: 'Step-by-step walkthroughs for civil, criminal, family, commercial, arbitration, tribunal, and advisory matters.' },
  { slug: 'faq', title: 'Frequently Asked Questions', description: 'Answers to common questions from advocates, firms, clerks, and administrators.' },
  { slug: 'glossary', title: 'Glossary', description: 'Legal and product terminology used throughout NextCaseHQ.' },
];

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content', 'help');

export function getHelpArticleMeta(slug: string): HelpArticleMeta | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug);
}

export function getHelpArticleRawContent(slug: string): string | null {
  const filePath = path.join(CONTENT_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

export function getHelpArticleHtml(slug: string): string | null {
  const raw = getHelpArticleRawContent(slug);
  if (raw === null) return null;
  return marked.parse(raw, { async: false }) as string;
}

/** A flat, lowercased index of every article's heading + surrounding text,
 *  used by the Help Centre's client-side search — built server-side once
 *  per request rather than shipping the raw markdown to the client twice. */
export interface HelpSearchEntry {
  slug: string;
  title: string;
  heading: string;
  excerpt: string;
}

export function buildHelpSearchIndex(): HelpSearchEntry[] {
  const entries: HelpSearchEntry[] = [];
  for (const meta of HELP_ARTICLES) {
    const raw = getHelpArticleRawContent(meta.slug);
    if (!raw) continue;
    const lines = raw.split('\n');
    let currentHeading = meta.title;
    let buffer: string[] = [];
    const flush = () => {
      if (buffer.length > 0) {
        entries.push({
          slug: meta.slug,
          title: meta.title,
          heading: currentHeading,
          excerpt: buffer.join(' ').slice(0, 220),
        });
      }
      buffer = [];
    };
    for (const line of lines) {
      const headingMatch = line.match(/^#{1,3}\s+(.*)$/);
      if (headingMatch) {
        flush();
        currentHeading = headingMatch[1].trim();
      } else if (line.trim()) {
        buffer.push(line.trim());
      }
    }
    flush();
  }
  return entries;
}
