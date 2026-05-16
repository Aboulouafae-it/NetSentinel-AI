# NetSentinel AI Cloud & Hybrid Roadmap

**Version:** v2.5 Planning
**Status:** Roadmap — v3.6 foundation workspace implemented; connectors not implemented

> **Critical notice:** Cloud integrations require explicit operator configuration.
> No cloud API keys, cloud credentials, or cloud tokens are included in the ISO.
> Cloud support is roadmap and foundation planning. It is not production-ready
> in the current release.

## v3.6 Workspace Status

The Cloud & Hybrid workspace exists at `/cloud-hybrid` as a product foundation page.

Implemented in v3.6:

- Provider readiness model for AWS, Azure, Google Cloud, Cloudflare, Kubernetes future, and container security future.
- Hybrid topology foundation that may show real on-prem site, asset, and wireless link counts from the existing local topology summary endpoint.
- VPN tunnel health roadmap panel.
- Public exposure and cloud firewall/security group roadmap panel.
- Cloud logs and security events roadmap panel.
- AI-assisted cloud troubleshooting future panel with no provider configured.
- Optional tool profile summary for documentation only.
- Safe credential posture panel.

Not implemented in v3.6:

- No cloud credentials are collected or stored.
- No cloud provider APIs are called.
- No cloud inventory is imported.
- No VPN tunnel connector is configured.
- No public exposure scan is performed.
- No cloud logs are ingested.
- No cloud security findings are created.
- No packages such as cloud CLIs, scanners, or Kubernetes tools are installed.

Required before connector activation:

- Encrypted credential vault/design.
- Organization-scoped credential profiles.
- Read-only connector permissions by default.
- RBAC and audit logging.
- Rate limits, connector timeouts, and failure handling.
- Tests for organization isolation and provider error paths.
- Clear operator approval before any external cloud call.

---

## 1. Scope and Philosophy

NetSentinel AI OS is a **hybrid-aware** appliance. It runs locally but can
monitor and correlate cloud-hosted infrastructure alongside on-premises networks.

Design principles:

- All cloud integrations are **opt-in** and require operator-provided credentials
- Cloud monitoring is **read-only by default** — NetSentinel does not modify cloud resources
- Credentials are stored in the appliance's secure config path (`/opt/netsentinel/config/`)
  and never baked into the ISO
- Cloud operations follow the same visibility model as on-premises: assets, alerts, incidents, logs
- AI-assisted troubleshooting applies equally to cloud and hybrid topology problems

---

## 2. AWS VPC Roadmap

### 2.1 Goal

Monitor AWS VPC infrastructure from the NetSentinel appliance with read-only credentials.

### 2.2 Target Visibility

| Data | Source | Status |
|---|---|---|
| VPC and subnet topology | EC2 API / VPC API | Future |
| Instance inventory | EC2 DescribeInstances | Future |
| Security group rules | EC2 DescribeSecurityGroups | Future |
| Routing tables | EC2 DescribeRouteTables | Future |
| Internet Gateway / NAT status | EC2 DescribeInternetGateways | Future |
| VPN / Direct Connect status | EC2 DescribeVpnConnections | Future |
| CloudWatch metrics | CloudWatch API | Future |
| VPC Flow Logs | CloudWatch Logs / S3 | Future |
| IAM anomaly detection | GuardDuty / CloudTrail | Future |

### 2.3 Integration Path

1. Operator creates a **read-only IAM role** with minimum required permissions
2. Operator enters AWS Access Key ID, Secret Access Key, and region in NetSentinel config
3. NetSentinel polls AWS APIs on a configurable interval
4. Results appear in the asset inventory (EC2 instances as assets)
5. Security group rule changes trigger alerts if policy drift is detected

### 2.4 Public Exposure Detection

A future scan will identify:

- EC2 instances with `0.0.0.0/0` ingress rules on non-standard ports
- S3 buckets with public ACLs
- RDS instances accessible from the internet
- Elastic IPs without associated resources

### 2.5 Required IAM Permissions (Minimum Viable)

```
ec2:DescribeInstances
ec2:DescribeVpcs
ec2:DescribeSubnets
ec2:DescribeSecurityGroups
ec2:DescribeRouteTables
ec2:DescribeInternetGateways
ec2:DescribeVpnConnections
cloudwatch:GetMetricStatistics
cloudwatch:ListMetrics
logs:DescribeLogGroups
logs:GetLogEvents
```

---

## 3. Azure VNet Roadmap

### 3.1 Goal

Monitor Azure Virtual Network infrastructure from the NetSentinel appliance.

### 3.2 Target Visibility

| Data | Source | Status |
|---|---|---|
| VNet and subnet topology | Azure Resource Manager API | Future |
| VM inventory | Compute API | Future |
| NSG rules and flow logs | Network Watcher | Future |
| Application Gateway status | Application Gateway API | Future |
| VPN Gateway status | VPN Gateway API | Future |
| Public IP exposure | Azure Resource Manager | Future |
| Azure Monitor alerts | Monitor API | Future |
| Azure Defender findings | Security Center API | Future |

### 3.3 Integration Path

1. Operator registers an Azure **App Registration** (service principal) with Reader role
2. Operator provides Tenant ID, Client ID, Client Secret, and Subscription ID
3. NetSentinel polls Azure APIs via Microsoft Graph or ARM REST API
4. Azure VMs appear as assets in NetSentinel inventory
5. NSG rule changes or public exposure drift trigger alerts

---

## 4. Google Cloud VPC Roadmap

### 4.1 Goal

Monitor Google Cloud VPC and Compute Engine infrastructure.

### 4.2 Target Visibility

| Data | Source | Status |
|---|---|---|
| VPC network topology | Compute Engine API | Future |
| VM instance inventory | Compute Engine API | Future |
| Firewall rules | Compute Engine firewall API | Future |
| Cloud VPN tunnels | VPN API | Future |
| Cloud NAT status | Cloud NAT API | Future |
| Cloud Logging | Cloud Logging API | Future |
| Security Command Center | SCC API | Future |

### 4.3 Integration Path

1. Operator creates a **GCP service account** with `roles/viewer` minimum
2. Operator provides service account JSON key (stored in `/opt/netsentinel/config/`, never in ISO)
3. NetSentinel queries GCP APIs for inventory and security posture
4. GCP Compute instances appear as assets

---

## 5. Cloudflare Roadmap

### 5.1 Goal

Monitor Cloudflare-protected zones and tunnel health.

### 5.2 Target Visibility

| Data | Source | Status |
|---|---|---|
| DNS record inventory | Cloudflare API | Future |
| Cloudflare Tunnel health | Cloudflare API | Future |
| WAF rule status | Cloudflare API | Future |
| Rate limiting alerts | Cloudflare API | Future |
| Access policy review | Cloudflare Access API | Future |
| Traffic analytics | Cloudflare Analytics API | Future |

### 5.3 Integration Path

1. Operator provides Cloudflare API Token (zone-scoped, read-only)
2. NetSentinel periodically checks tunnel health and DNS records
3. Tunnel downtime triggers a Critical alert in NetSentinel

---

## 6. VPN Tunnel Monitoring

### 6.1 Supported Tunnel Types (Planned)

| Type | Monitoring Method | Status |
|---|---|---|
| WireGuard | `wg show` command output | Planned |
| OpenVPN | Status file / management socket | Planned |
| IPsec / StrongSwan | `ipsec statusall` or `swanctl --list-sas` | Planned |
| AWS Site-to-Site VPN | CloudWatch / VPN API | Future |
| Azure VPN Gateway | Azure Monitor | Future |
| Cloudflare WARP / Tunnel | Cloudflare API | Future |

### 6.2 Local VPN Monitoring (Appliance-side)

On the NetSentinel appliance, local tunnel status can be checked immediately:

```bash
wg show               # WireGuard tunnels
ipsec statusall       # IPsec tunnels
systemctl status openvpn@<profile>   # OpenVPN
```

These outputs can feed into `appliance-status` output in a future version.

---

## 7. Cloud Firewall / Security Group Checks

### 7.1 Planned Checks

| Check | Trigger |
|---|---|
| `0.0.0.0/0` on SSH (port 22) | Alert: Critical — publicly exposed SSH |
| `0.0.0.0/0` on RDP (port 3389) | Alert: Critical — publicly exposed RDP |
| `0.0.0.0/0` on database ports (3306, 5432, 6379) | Alert: Critical — database publicly exposed |
| Security group with no attached resources | Informational: Unused security group |
| Policy drift (rule added vs last snapshot) | Alert: Security group changed |

### 7.2 Snapshot and Drift Detection

NetSentinel will store a last-known-good snapshot of cloud firewall rules. On each poll,
new or modified rules are compared. Differences generate alerts with before/after diff.

---

## 8. Hybrid Topology

### 8.1 Goal

Show on-premises and cloud assets in the same topology view, with clear context labels.

| Context | Label |
|---|---|
| On-premises assets | `on-prem` |
| AWS assets | `aws:<region>` |
| Azure assets | `azure:<region>` |
| GCP assets | `gcp:<region>` |
| Cloudflare protected | `cloudflare:zone` |

### 8.2 Hybrid Connectivity View (Future)

A future topology panel will show:

- On-premises → cloud VPN tunnels
- Public internet exposure points
- Cloudflare tunnel endpoints
- Alert correlation across environments

---

## 9. Cloud Logs Ingestion

### 9.1 Planned Sources

| Source | Ingest Method | Status |
|---|---|---|
| AWS CloudTrail | CloudWatch Logs / S3 pull | Future |
| AWS VPC Flow Logs | CloudWatch Logs | Future |
| Azure Activity Log | Azure Monitor API | Future |
| Azure NSG Flow Logs | Network Watcher | Future |
| GCP Cloud Audit Logs | Cloud Logging API | Future |
| Cloudflare Logpush | HTTP endpoint receiver | Future |

### 9.2 Log Normalization

Cloud logs will be normalized to the NetSentinel log schema:
- Source IP
- Destination IP
- Action (allow / deny)
- Service / port
- Resource identity
- Timestamp (UTC)
- Provider label

---

## 10. Kubernetes / Container Security (Future Scope)

| Feature | Status |
|---|---|
| Kubernetes cluster asset inventory | Future |
| Pod/workload status monitoring | Future |
| Container vulnerability scanning | Future |
| Network policy audit | Future |
| Helm release tracking | Future |
| Kubernetes RBAC review | Future |
| Runtime anomaly detection (Falco) | Future — far future |

This scope is deferred until on-premises and cloud VPC monitoring are validated.

---

## 11. AI-Assisted Cloud Troubleshooting

NetSentinel's AI troubleshooting engine applies to cloud scenarios:

| Query Example | AI Action |
|---|---|
| "Why is my AWS instance unreachable?" | Check security groups, route tables, VPN tunnel status |
| "Why is my Cloudflare tunnel down?" | Check tunnel health, origin reachability, DNS |
| "Is anything publicly exposed that shouldn't be?" | Cross-check firewall rules against policy |
| "What changed in my cloud environment since yesterday?" | Diff security group and routing snapshots |

No cloud queries are executed without operator-configured credentials.
AI troubleshooting context never includes raw API credentials.

---

## 12. Implementation Timeline (Indicative)

| Milestone | Scope |
|---|---|
| v2.x Foundation | Local on-premises monitoring (current) |
| v3.0 Cloud Foundation | AWS VPC and basic Cloudflare tunnel monitoring |
| v3.1 Multi-Cloud | Azure VNet + GCP VPC |
| v3.2 Hybrid Topology | Unified topology view, VPN tunnel monitoring |
| v3.3 Cloud Logs | CloudTrail, VPC Flow Logs, NSG logs |
| v4.0 AI Cloud Assist | AI-assisted cloud troubleshooting and drift detection, gated by provider configuration, redaction, and operator approval |
| v4.x Kubernetes | Container and workload security monitoring |

These milestones are planning estimates. They depend on adapter validation,
fixture capture from real cloud environments, and security review before release.
