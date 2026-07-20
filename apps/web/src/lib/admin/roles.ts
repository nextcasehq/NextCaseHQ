export const PERMISSIONS = [
  'view_users',
  'manage_users',
  'view_firms',
  'manage_firms',
  'configure_plans',
  'adjust_ai_credits',
  'view_credit_ledger',
  'manage_templates',
  'manage_legal_search_config',
  'manage_integrations',
  'view_matter_metadata',
  'view_confidential_matter_content',
  'manage_security_settings',
  'view_audit_logs',
  'export_audit_logs',
  'manage_feature_flags',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  view_users: 'View users',
  manage_users: 'Manage users',
  view_firms: 'View firms',
  manage_firms: 'Manage firms',
  configure_plans: 'Configure plans',
  adjust_ai_credits: 'Adjust AI Credits',
  view_credit_ledger: 'View credit ledger',
  manage_templates: 'Manage templates',
  manage_legal_search_config: 'Manage legal-search configuration',
  manage_integrations: 'Manage integrations',
  view_matter_metadata: 'View Matter Register metadata',
  view_confidential_matter_content: 'View confidential matter content',
  manage_security_settings: 'Manage security settings',
  view_audit_logs: 'View audit logs',
  export_audit_logs: 'Export audit logs',
  manage_feature_flags: 'Manage feature flags',
};

export interface RoleDefinition {
  key: string;
  name: string;
  description: string;
  permissions: Permission[];
}

/**
 * Least-privilege by design: even Platform Administrator does NOT include
 * `view_confidential_matter_content` — confidential legal content access
 * (arguments, evidence, advocate notes, client instructions) is
 * deliberately excluded from every platform-administration role and is
 * not grantable here, per "Confidential legal content access must be
 * separately controlled from platform administration." Enforcement of
 * this matrix must happen server-side in a production implementation
 * (see ADMIN.md notes in the PR description) — this table is the
 * authoritative reference definition, not itself the enforcement point.
 */
export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    key: 'PLATFORM_ADMIN',
    name: 'Platform Administrator',
    description: 'Full platform administration — excludes confidential matter content by design.',
    permissions: [
      'view_users', 'manage_users', 'view_firms', 'manage_firms', 'configure_plans', 'adjust_ai_credits',
      'view_credit_ledger', 'manage_templates', 'manage_legal_search_config', 'manage_integrations',
      'view_matter_metadata', 'manage_security_settings', 'view_audit_logs', 'export_audit_logs', 'manage_feature_flags',
    ],
  },
  {
    key: 'SUPPORT_ADMIN',
    name: 'Support Administrator',
    description: 'Non-confidential account support: search, status, non-sensitive usage metadata.',
    permissions: ['view_users', 'view_firms', 'view_matter_metadata', 'view_audit_logs'],
  },
  {
    key: 'BILLING_ADMIN',
    name: 'Billing Administrator',
    description: 'Plans, AI Credit costs, and the credit ledger — no user/firm management.',
    permissions: ['configure_plans', 'adjust_ai_credits', 'view_credit_ledger', 'view_audit_logs'],
  },
  {
    key: 'SECURITY_ADMIN',
    name: 'Security Administrator',
    description: 'Security configuration, session/account controls, and full audit export.',
    permissions: ['manage_security_settings', 'manage_users', 'view_audit_logs', 'export_audit_logs'],
  },
  {
    key: 'ADVOCATE',
    name: 'Advocate',
    description: 'Standard end-user account — no Admin Panel access.',
    permissions: [],
  },
  {
    key: 'FIRM_ADMIN',
    name: 'Firm Administrator',
    description: "Manages their own firm's users only — not a platform-wide role.",
    permissions: ['view_users', 'manage_users', 'view_matter_metadata'],
  },
  {
    key: 'FIRM_STAFF',
    name: 'Firm Staff',
    description: 'Standard end-user account within a firm — no Admin Panel access.',
    permissions: [],
  },
  {
    key: 'LITIGANT',
    name: 'Litigant',
    description: 'Standard end-user account — no Admin Panel access.',
    permissions: [],
  },
  {
    key: 'READ_ONLY_AUDITOR',
    name: 'Read-only Auditor',
    description: 'Read-only oversight: audit logs, user/firm lists — no mutation permissions at all.',
    permissions: ['view_audit_logs', 'export_audit_logs', 'view_users', 'view_firms'],
  },
];

export function getRoleDefinition(key: string): RoleDefinition | undefined {
  return ROLE_DEFINITIONS.find((r) => r.key === key);
}

export function roleHasPermission(roleKey: string, permission: Permission): boolean {
  return getRoleDefinition(roleKey)?.permissions.includes(permission) ?? false;
}
