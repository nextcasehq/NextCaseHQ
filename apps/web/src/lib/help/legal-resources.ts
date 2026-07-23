import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

/**
 * The Legal Resource Centre is deliberately a separate content set from
 * the product Help Centre (lib/help/content.ts) — one is "how do I use
 * NextCaseHQ," the other is "how does this kind of legal work actually
 * proceed." Categories that would just duplicate existing Help Centre
 * content (Glossary, Workflow Guides, FAQ) link there instead of being
 * rewritten here — see RESOURCE_CATEGORIES below.
 */

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content', 'legal-resources');

export function getResourceRawContent(slug: string): string | null {
  const filePath = path.join(CONTENT_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

export function getResourceHtml(slug: string): string | null {
  const raw = getResourceRawContent(slug);
  if (raw === null) return null;
  return marked.parse(raw, { async: false }) as string;
}

export interface ResourceCategory {
  title: string;
  description: string;
  href: string;
  status: 'available' | 'planned';
}

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    title: 'Practice Guides & Checklists',
    description: 'Step-by-step procedural checklists for civil, criminal, family, commercial, arbitration, tribunal, and advisory work.',
    href: '/legal-resources/practice-guides',
    status: 'available',
  },
  {
    title: 'Workflow Guides',
    description: 'How each kind of matter progresses inside NextCaseHQ, from intake to disposal.',
    href: '/help/workflow-library',
    status: 'available',
  },
  {
    title: 'Legal Glossary',
    description: 'Legal and product terminology used across NextCaseHQ.',
    href: '/help/glossary',
    status: 'available',
  },
  {
    title: 'Frequently Asked Questions',
    description: 'Common questions from advocates, firms, clerks, and administrators.',
    href: '/help/faq',
    status: 'available',
  },
  {
    title: 'AI Drafting Guides',
    description: 'How NextCaseHQ\'s AI drafting assistant works, and how to get the most out of it.',
    href: '/help/user-manual#ai-assistant',
    status: 'available',
  },
  {
    title: 'Acts & Rules',
    description: 'Not yet available. NextCaseHQ does not have a verified, licensed source of primary legislative text today — this section will be populated once one is in place, rather than with unverified content.',
    href: '',
    status: 'planned',
  },
  {
    title: 'Government Notifications & Circulars',
    description: 'Not yet available, for the same reason as Acts & Rules above.',
    href: '',
    status: 'planned',
  },
  {
    title: 'Court Fee & Limitation References',
    description: 'Not yet available — these vary by state/forum and change over time; publishing unverified figures would be worse than not publishing them.',
    href: '',
    status: 'planned',
  },
];
