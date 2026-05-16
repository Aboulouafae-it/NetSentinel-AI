# NetSentinel AI Provider Architecture

Status: v3.5 architecture plan  
Product stage: MVP / Work in Progress  
Scope: Future provider abstraction only; no provider calls are implemented in v3.5

## Objective

NetSentinel AI should support privacy-first troubleshooting assistance without making any AI provider mandatory. The provider layer must be disabled by default and must not transmit data until an administrator configures a provider and an operator approves a specific request.

## Current State

- AI Copilot UI exists as a privacy-first foundation.
- Provider status is disabled / not configured.
- External calls are not made from the Copilot workspace.
- Local deterministic summaries may be shown from existing records.
- Backend provider integration is not expanded in v3.5.

## Provider Registry

Future provider support should use a registry pattern:

| Provider type | Status | Notes |
| --- | --- | --- |
| Local deterministic | Current | Uses existing local fields and rule outputs; no model call. |
| Local model | Future | Runs on appliance or approved local infrastructure. |
| Claude | Future | Requires explicit admin configuration and privacy controls. |
| OpenAI | Future | Requires explicit admin configuration and privacy controls. |
| Enterprise endpoint | Future | Self-hosted or private gateway with organization policy. |

Each provider should declare:

- Provider ID and display name.
- Supported tasks.
- Data residency posture.
- Required secret references.
- Maximum prompt size.
- Timeout and retry behavior.
- Rate-limit behavior.
- Whether streaming is supported.
- Whether the provider is local or external.

## Disabled by Default

The default installation must behave as follows:

- No provider credentials are present.
- No provider is selected.
- No external request button is enabled.
- No scheduled AI analysis runs.
- No data leaves the appliance.

Provider configuration must be an explicit administrative action.

## Request Flow

Future provider request flow:

1. Operator selects context records.
2. UI builds a local context preview.
3. Redaction layer removes sensitive fields.
4. Operator previews the final prompt payload.
5. Operator selects provider and confirms transmission.
6. Backend enforces organization scope, RBAC, rate limits, timeout, and audit logging.
7. Provider response is stored or displayed with source context and confidence notes.
8. Any remediation remains manual or approval-gated.

## Redaction Layer

The provider layer must include a mandatory redaction step before prompt construction.

Redaction responsibilities:

- Remove secrets, tokens, credentials, private keys, authorization headers, cookies, and database URLs.
- Truncate oversized metadata.
- Preserve evidence IDs and non-sensitive summaries.
- Mark redacted fields clearly.
- Block requests containing raw captures, dumps, or private keys.

The redaction layer should run server-side before any external provider call. Client-side redaction can improve preview quality but should not be the only enforcement point.

## Prompt Preview

Operators must see:

- Provider name.
- Privacy mode.
- Context record IDs.
- Redaction status.
- Approximate prompt size.
- High-risk field warnings.
- The final redacted prompt or a structured summary of it.

The Send action must be disabled until the operator acknowledges the privacy boundary.

## Tenant and Organization Scoping

Provider requests must be scoped to the current organization:

- Context records must belong to the operator's organization.
- Cross-organization context mixing must be blocked.
- Provider configuration should be organization-scoped unless a system administrator explicitly defines a global provider.
- Audit records must include organization ID and operator identity.

## RBAC Requirements

Suggested roles:

| Role | Allowed Copilot behavior |
| --- | --- |
| Viewer | View local deterministic summaries only. |
| Operator | Select context and request local summaries. |
| Analyst | Use configured provider with approval flow. |
| Admin | Configure provider settings and privacy policy. |
| Auditor | Review Copilot audit trail. |

RBAC must be implemented before provider configuration is treated as enterprise-ready.

## Rate Limits and Abuse Protection

Future provider endpoints should enforce:

- Per-user rate limits.
- Per-organization rate limits.
- Maximum prompt size.
- Maximum context record count.
- Timeout limits.
- Provider error backoff.
- Abuse logging.

The system should fail closed when provider configuration is invalid.

## Timeout and Failure Handling

Provider calls should:

- Use short, configurable timeouts.
- Return clear failure states.
- Avoid retrying sensitive prompts without operator visibility.
- Never block core monitoring workflows.
- Never mark AI failure as an operational outage unless it impacts configured workflows.

## Audit Trail

Audit entries should capture:

- Provider.
- Task type.
- Operator.
- Organization.
- Context IDs.
- Redaction result.
- Timestamp.
- Response status.
- Error class if failed.

Do not store unredacted secrets in audit logs.

## Supported Future Tasks

Initial provider tasks should remain advisory:

- Explain selected alert evidence.
- Summarize selected incident timeline and tasks.
- Explain selected wireless degradation based on measurements.
- Interpret selected syslog/Fortinet events.
- Generate non-destructive investigation checklist.
- Summarize appliance health evidence.

Unsupported until further hardening:

- Autonomous remediation.
- Auto-blocking.
- Auto-isolation.
- Credentialed cloud changes.
- Radio configuration changes.
- Firewall policy changes.

## Implementation Notes

Future backend modules may include:

- `ai_providers` configuration model.
- `ai_requests` audit table.
- Redaction service.
- Prompt template registry.
- Provider adapter interface.
- Provider-specific adapters.
- RBAC policy checks.
- Organization isolation tests.

Frontend modules may include:

- Provider status panel.
- Context selector.
- Prompt preview modal.
- Redaction warnings.
- Response evidence panel.
- Audit history view.

## v3.5 Boundary

v3.5 intentionally does not implement real provider calls. The goal is to establish the workspace, language, privacy boundary, local context availability, and future architecture without risking data leakage or false production claims.
