# KTSA Enterprise Security and Compliance

## Access Control

- Enterprise accounts are represented by `EnterpriseTenant`.
- Users belong to exactly one tenant through `AppUser.tenantId`.
- Member permissions use `admin`, `editor`, and `viewer`.
- Admins can invite members, manage tenant data, and access the admin console.
- Editors can operate simulations and create/edit business artifacts.
- Viewers can inspect tenant data without changing operational state.

## Tenant Isolation

Core workspace APIs resolve data through the active tenant. Critical write paths check the authenticated tenant before updating workspaces, team members, reports, share links, and enterprise members.

Remaining production hardening before public SaaS launch:

- Add automated route-level tests for every API.
- Add database-level row security if the deployment platform supports it.
- Add tenant IDs directly to more child tables if reporting workloads require direct filtering.

## Audit Logging

Audit logs currently cover:

- Account registration.
- Tenant creation and workspace backfill.
- Member invitations.
- Workspace updates and restarts.
- Team member creation.
- Finale report generation and sharing.
- Enterprise business data deletion.
- Prompt version updates.

## Data Export and Deletion

Customers can export:

- PDF, Word, PPT, and Markdown reports.
- Read-only shared report links.

Admins can delete enterprise business data while preserving tenant identity and audit trail.

## Sensitive Data Handling

- Session cookies are HTTP-only.
- Passwords use PBKDF2 with per-password salt.
- LLM calls store token usage, model metadata, request hash, and errors; full prompts are not stored in `LlmCallLog`.
- File uploads should remain limited by MIME type and size in production.

## Legal Documents

Before paid enterprise contracts, publish customer-facing versions of:

- Privacy Policy.
- Terms of Service.
- DPA: Data Processing Addendum.
- Security appendix.
- Private deployment runbook.

## Private Deployment

Private deployments should use:

- Dedicated PostgreSQL database.
- Dedicated LLM API key or customer-hosted model gateway.
- Separate object/file storage if uploads are moved out of database text extraction.
- Customer-specific retention period.
- Customer-specific backup location and restore process.
