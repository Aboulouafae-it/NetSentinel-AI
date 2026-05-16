# NetSentinel AI Copilot Privacy and Prompt Safety

Status: v3.5 foundation  
Product stage: MVP / Work in Progress  
Scope: Privacy policy, prompt safety boundaries, redaction requirements, and future approval flow

## Purpose

The NetSentinel AI Copilot is intended to help operators explain alerts, summarize incidents, troubleshoot wireless degradation, interpret logs, and prepare safe investigation checklists. In the v3.5 foundation, the Copilot does not call external AI providers and does not transmit operational data outside the appliance.

The current implementation may display local deterministic summaries from existing records, such as wireless diagnosis fields, alert evidence, incident timeline counts, log categories, and network polling metadata. These summaries must be labeled as rule-based or local context summaries, not AI-generated output.

## Current Safety Position

- No AI provider is configured by default.
- No external API calls are made from the AI Copilot workspace.
- No data leaves the appliance by default.
- No remediation action is executed by the Copilot.
- Operator approval is required before any future provider request.
- Prompt preview, redaction, audit logging, and provider configuration must exist before external provider mode is enabled.

## Data Minimization

Future prompts must include only the minimum selected context needed to answer the operator's question.

Allowed future context examples:

- Selected alert title, severity, status, rule, source, and scrubbed evidence.
- Selected incident title, status, timeline summary, task list, and linked alert references.
- Selected wireless measurement values and deterministic diagnosis evidence.
- Selected asset polling metadata, such as status, latency, packet loss, and last seen.
- Selected log category/action/source/destination fields after redaction.
- Selected cloud/hybrid findings after connectors, RBAC, redaction, and operator approval exist.

Disallowed prompt behavior:

- Bulk exporting all alerts, logs, incidents, or assets by default.
- Sending organization-wide logs without a specific operator selection.
- Sending raw metadata before redaction.
- Sending secrets, credentials, API keys, private keys, authorization headers, database URLs, or tokens.
- Sending cloud account inventories, route tables, firewall rules, VPN details, or public exposure findings without explicit operator selection and approval.

## Explicit Operator Consent

Future external provider mode must require a clear operator action before transmission:

1. Select the context records.
2. Preview the redacted prompt.
3. Confirm the provider and privacy mode.
4. Confirm that the request is advisory only.
5. Log the request metadata for audit without storing secrets.

No background AI analysis should run automatically against sensitive data.

## Sensitive Field Blacklist

The redaction layer must remove or replace fields matching these patterns before prompt creation:

| Field pattern | Required handling |
| --- | --- |
| `password`, `passwd`, `pwd` | Replace with `[redacted]`. |
| `token`, `access_token`, `refresh_token` | Replace with `[redacted]`. |
| `secret`, `client_secret` | Replace with `[redacted]`. |
| `api_key`, `apikey`, `key` when credential-like | Replace with `[redacted]`. |
| `authorization`, `cookie`, `set-cookie` | Replace with `[redacted]`. |
| `private_key` or PEM private-key header content | Block prompt creation. |
| Database connection URLs with passwords | Replace with `[redacted-database-url]`. |
| Raw packet captures or customer data dumps | Block prompt creation. |

The blacklist should be paired with an allowlist for known safe fields so metadata does not leak sensitive values through unexpected keys.

## Local vs External Provider Modes

| Mode | Status | Behavior |
| --- | --- | --- |
| Local deterministic summaries | Current foundation | Uses existing local fields and rule outputs; no provider call. |
| Local model provider | Future | Runs on appliance or approved local host; still requires redaction and audit. |
| External provider | Future | Requires explicit configuration, prompt preview, consent, redaction, rate limits, and audit trail. |
| Enterprise endpoint | Future | Requires organization policy, certificate validation, timeout handling, and audit controls. |

## Safe Prompt Template Requirements

Future prompt templates must:

- State that NetSentinel AI is MVP / Work in Progress.
- Ask for evidence-based, bounded, non-authoritative output.
- Require the model to cite the provided internal evidence.
- Require uncertainty and confidence levels.
- Forbid inventing device states, vendor support, topology, credentials, or incident facts.
- Forbid destructive remediation instructions unless the operator explicitly requested a manual checklist.
- Include a reminder that remediation requires human approval.

## AI Response Disclaimer

Future AI responses should include a visible disclaimer:

> AI output is advisory. Verify evidence, confirm scope, and obtain approval before remediation.

The UI should distinguish:

- Measured facts.
- Rule-based diagnosis.
- Model-generated explanation.
- Operator-approved actions.

## Prompt Injection Controls

Future prompt building must treat logs, alert metadata, incident notes, and device fields as untrusted content. The provider prompt should isolate untrusted evidence and instruct the model not to follow commands embedded inside that evidence.

Examples of untrusted content:

- Syslog messages containing instructions.
- Hostnames or notes that include prompt-like text.
- Alert descriptions imported from external systems.
- Incident comments copied from email or tickets.

## Audit Logging Future

Future external provider use should create audit records containing:

- Operator identity.
- Organization ID.
- Provider name.
- Prompt template ID.
- Context record IDs.
- Redaction status.
- Timestamp.
- Success/failure status.

Audit records must not store raw secrets or unredacted prompts unless an explicit secure retention policy exists.

## No Autonomous Remediation

The Copilot must not:

- Block IP addresses automatically.
- Disable accounts automatically.
- Isolate hosts automatically.
- Modify firewall or radio configuration automatically.
- Run broad scans automatically.
- Change cloud security groups or routing automatically.
- Use cloud credentials or call cloud provider APIs directly.

Future remediation support must use human approval mode, scoped permissions, RBAC, audit logging, and reversible change records.
