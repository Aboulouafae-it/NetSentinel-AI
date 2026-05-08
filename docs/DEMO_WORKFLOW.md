# NetSentinel AI Demo Workflow

This demo uses local Docker Compose and public-alpha features only. Do not use
real secrets or production devices.

## 1. Start The Stack

```bash
cp .env.example .env
docker compose up --build -d
```

Open:

```text
http://localhost:3000/setup
```

## 2. Run First-Run Setup

Create the first organization and admin user. Use a validator-compatible demo
email such as:

```text
admin@netsentinel.local
```

Then log in.

## 3. Visit Dashboard

Confirm dashboard cards load. Fresh installs should show honest empty states.

## 4. Add A Site

Create a site such as `Lab Site` so assets, radios, and wireless links have a
clear location context.

## 5. Add Or Discover An Asset

Use existing asset APIs/discovery path. Then open Assets and verify the asset
appears with status/risk fields.

## 6. Poll Asset

Select an asset and click Poll Now. Confirm last seen, status, latency, or error
state updates.

## 7. Add Radio Device

Open Radio Devices and register a radio with vendor/adapter metadata. Poll it if
credentials are available.

## 8. Add Wireless Link

Create/link wireless records through the current wireless API/UI flow. Attach
near/far radios where available.

## 9. Add Field Measurement

Open Field Measurements, select a wireless link, and enter RSSI/SNR/noise/CCQ
values.

## 10. Generate Diagnosis

Submit the measurement and verify deterministic diagnosis and health score.

## 11. Trigger Poor/Critical Alert

Enter degraded RF values that produce Poor or Critical diagnosis. Verify an alert
is created or deduped.

## 12. Create Incident

Open Alerts, select the alert, and create an incident. Assign an owner, add a
note, add a task, and resolve it.

## 13. Send Sample Fortinet Syslog

Use an authenticated Edge Agent token and submit a FortiGate-style syslog event
to `/api/v1/syslog/ingest`. Then verify Logs, Dashboard security summary, and
alert creation for high-value events.

## 14. Register Agent Heartbeat

Register an Edge Agent, copy the one-time token, submit heartbeat, and confirm
Agents page status updates.

## 15. Review Activity

Return to Dashboard and verify recent activity, logs, alerts, incidents, and
agent updates appear.
