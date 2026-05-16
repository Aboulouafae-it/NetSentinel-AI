'use client';

import Link from 'next/link';
import useSWR from 'swr';
import {
  Boxes,
  Cloud,
  CloudCog,
  Container,
  GitBranch,
  Globe2,
  KeyRound,
  Network,
  RefreshCw,
  Route,
  ScrollText,
  ShieldOff,
  Waypoints,
} from 'lucide-react';
import { fetcher } from '@/lib/api';
import type { TopologySummary } from '@/lib/types';
import {
  ActionButton,
  EmptyState,
  ErrorState,
  KpiCard,
  KpiGrid,
  LiveStatusPill,
  LoadingSkeleton,
  MetricCard,
  ModuleHeader,
  PageShell,
  SectionHeader,
} from '@/components/ui';

type ProviderStatus = 'Future' | 'Not configured';

type ProviderReadiness = {
  name: string;
  status: ProviderStatus;
  scope: string[];
  credentials: string;
  risk: 'Medium' | 'High';
  privacy: string;
  checks: string[];
};

const panelStyle: React.CSSProperties = { padding: 18 };
const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  padding: '10px 0',
  borderBottom: '1px solid var(--border-subtle)',
  fontSize: '0.86rem',
};

export default function CloudHybridPage() {
  const topology = useSWR<TopologySummary>('/dashboard/topology-summary', fetcher);
  const sitesCount = topology.data?.sites.length ?? 0;
  const onPremAssets = topology.data?.sites.reduce((sum, site) => sum + site.assets_count, 0) ?? 0;
  const wirelessLinks = topology.data?.wireless_links.length ?? 0;

  return (
    <PageShell>
      <ModuleHeader
        eyebrow="Cloud & Hybrid foundation"
        title="Cloud & Hybrid"
        subtitle="Cloud networks, VPN tunnels, public exposure, cloud security findings, and hybrid topology planning without credentials or external provider calls."
        icon={<Cloud size={30} color="var(--brand-cyan)" />}
        actions={<>
          <LiveStatusPill label="Roadmap foundation" state="planned" />
          <LiveStatusPill label="No credentials configured" state="offline" />
          <LiveStatusPill label="External cloud calls disabled" state="planned" />
          <ActionButton onClick={() => topology.mutate()}><RefreshCw size={16} /> Refresh</ActionButton>
        </>}
      />

      {topology.error && <div style={{ marginBottom: 16 }}><ErrorState message="Unable to load local topology summary. Cloud connector state remains disabled." /></div>}
      {topology.isLoading && <div style={{ marginBottom: 16 }}><LoadingSkeleton label="Loading local on-prem topology context..." /></div>}

      <KpiGrid min={165}>
        <KpiCard label="Provider Readiness" value="Future" sub="AWS, Azure, GCP, Cloudflare planned" toneColor="var(--text-muted)" />
        <KpiCard label="Hybrid Connectivity" value="Planned" sub="VPN and tunnel model only" toneColor="var(--brand-cyan)" />
        <KpiCard label="Public Exposure" value="Disabled" sub="No cloud scanning or external calls" toneColor="var(--status-warning)" />
        <KpiCard label="Cloud Security Findings" value="0" sub="No cloud data imported" toneColor="var(--text-muted)" />
        <KpiCard label="VPN Tunnel Health" value="Future" sub="No tunnel connector configured" toneColor="var(--brand-primary)" />
        <KpiCard label="Future Cloud Logs" value="Roadmap" sub="CloudTrail, flow logs, audit logs" toneColor="var(--status-online)" />
      </KpiGrid>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(320px, 0.85fr)', gap: 18, marginTop: 18, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 18 }}>
          <ProviderReadinessPanel />
          <HybridTopologyPanel sitesCount={sitesCount} onPremAssets={onPremAssets} wirelessLinks={wirelessLinks} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <VpnTunnelPanel />
            <PublicExposurePanel />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <CloudLogsPanel />
            <AiCloudTroubleshootingPanel />
          </div>
        </div>

        <div style={{ display: 'grid', gap: 18 }}>
          <CredentialSafetyPanel />
          <ToolProfilePanel />
          <section className="card" style={panelStyle}>
            <SectionHeader title={<><ShieldOff size={18} /> Implementation Boundary</>} />
            <EmptyState
              title="No cloud inventory is active"
              message="This workspace organizes future connector scope only. It does not scan cloud accounts, import resources, store credentials, or call provider APIs."
            />
          </section>
        </div>
      </div>
    </PageShell>
  );
}

function ProviderReadinessPanel() {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><CloudCog size={18} /> Provider Readiness</>} />
      <p style={panelCopy}>All providers are roadmap-only in v3.6. Credential profiles, RBAC, encrypted storage, rate limits, and audit logging are required before connector activation.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(285px, 1fr))', gap: 12 }}>
        {PROVIDERS.map(provider => <ProviderCard key={provider.name} provider={provider} />)}
      </div>
    </section>
  );
}

function ProviderCard({ provider }: { provider: ProviderReadiness }) {
  return (
    <div style={{ padding: 14, border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'rgba(0,0,0,0.16)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <strong>{provider.name}</strong>
        <span style={statusBadgeStyle}>{provider.status}</span>
      </div>
      <DetailsLine label="Credential requirement" value={provider.credentials} />
      <DetailsLine label="Data export risk" value={<span style={{ color: provider.risk === 'High' ? 'var(--status-critical)' : 'var(--status-warning)' }}>{provider.risk}</span>} />
      <TinyHeading>Intended scope</TinyHeading>
      <CompactList items={provider.scope} />
      <TinyHeading>Planned checks</TinyHeading>
      <CompactList items={provider.checks} />
      <p style={{ ...panelCopy, marginTop: 10 }}>{provider.privacy}</p>
    </div>
  );
}

function HybridTopologyPanel({ sitesCount, onPremAssets, wirelessLinks }: { sitesCount: number; onPremAssets: number; wirelessLinks: number }) {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><Waypoints size={18} /> Hybrid Topology Foundation</>} />
      <p style={panelCopy}>On-prem summary uses the existing real topology endpoint. Cloud-side nodes and tunnel relationships are future model placeholders only.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 14 }}>
        <MetricCard label="On-prem sites" value={sitesCount} />
        <MetricCard label="On-prem assets" value={onPremAssets} />
        <MetricCard label="Wireless links" value={wirelessLinks} />
        <MetricCard label="Cloud resources" value="Not imported" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <TopologyColumn title="On-prem" icon={<Network size={16} />} items={['Assets', 'Firewall/router', 'Wireless backhaul', 'Edge agents']} status="Real inventory where available" />
        <TopologyColumn title="Connection" icon={<GitBranch size={16} />} items={['VPN tunnel future', 'Cloudflare tunnel future', 'Site-to-site future', 'Edge agent path future']} status="No tunnel connector configured" />
        <TopologyColumn title="Cloud" icon={<Cloud size={16} />} items={['VPC/VNet future', 'Subnets future', 'Security groups future', 'Public endpoints future']} status="No cloud inventory imported" />
      </div>
      <div style={{ marginTop: 12 }}><PanelLink href="/network">Review Network Operations</PanelLink></div>
    </section>
  );
}

function TopologyColumn({ title, icon, items, status }: { title: string; icon: React.ReactNode; items: string[]; status: string }) {
  return (
    <div style={{ padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'var(--bg-base)' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}><span style={{ color: 'var(--brand-cyan)' }}>{icon}</span><strong>{title}</strong></div>
      <CompactList items={items} />
      <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: 8 }}>{status}</div>
    </div>
  );
}

function VpnTunnelPanel() {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><Route size={18} /> VPN Tunnel Health Roadmap</>} action={<PanelLink href="/network">Network</PanelLink>} />
      <p style={panelCopy}>Status: future. No WireGuard, OpenVPN, IPsec, AWS, Azure, GCP, or Cloudflare tunnel connector is configured from this page.</p>
      <RoadmapRows rows={[
        ['Tunnel state', 'Up/down and peer status'],
        ['Transport quality', 'Latency and packet loss'],
        ['IPsec hints', 'Phase 1/phase 2 mismatch and NAT-T issues'],
        ['Routing drift', 'Route table mismatch and asymmetric paths'],
        ['Policy mismatch', 'Firewall or security group path blocked'],
        ['Public endpoint drift', 'Changed public IP or tunnel endpoint'],
      ]} />
    </section>
  );
}

function PublicExposurePanel() {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><Globe2 size={18} /> Public Exposure Roadmap</>} action={<PanelLink href="/security">Security</PanelLink>} />
      <p style={panelCopy}>Not scanning cloud now. Future checks require explicit credentials, scope approval, and audit logging.</p>
      <RoadmapRows rows={[
        ['SSH/RDP exposure', 'Detect 0.0.0.0/0 on administrative ports'],
        ['Public admin panels', 'Identify internet-facing management surfaces'],
        ['Permissive firewall rules', 'Review cloud firewall/security group drift'],
        ['Unknown public IPs', 'Flag public endpoints not mapped to known assets'],
        ['Exposed databases', 'Detect public database ports and services'],
        ['Storage exposure future', 'S3/blob/bucket public access review'],
      ]} />
    </section>
  );
}

function CloudLogsPanel() {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><ScrollText size={18} /> Cloud Logs & Security Events</>} action={<PanelLink href="/logs">Logs</PanelLink>} />
      <p style={panelCopy}>Cloud log ingestion is future. Existing Security Operations will be the review surface once cloud events are normalized.</p>
      <RoadmapRows rows={[
        ['AWS', 'CloudTrail and VPC Flow Logs future'],
        ['Azure', 'Activity Logs and NSG Flow Logs future'],
        ['GCP', 'Audit Logs and VPC Flow Logs future'],
        ['Cloudflare', 'Security logs and tunnel events future'],
        ['NetSentinel flow', 'Logs -> Alerts -> Incidents -> Reports'],
      ]} />
    </section>
  );
}

function AiCloudTroubleshootingPanel() {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><Boxes size={18} /> AI-Assisted Cloud Troubleshooting Future</>} action={<PanelLink href="/ai-copilot">AI Copilot</PanelLink>} />
      <p style={panelCopy}>No AI provider is configured and no external calls are made. Future cloud analysis requires redaction, prompt preview, operator approval, and evidence citations.</p>
      <RoadmapRows rows={[
        ['VPN down explanation', 'Use tunnel status, route, policy, and peer evidence'],
        ['Exposure risk explanation', 'Explain public endpoint and firewall findings'],
        ['Security group triage', 'Summarize overly permissive or drifted rules'],
        ['Route troubleshooting', 'Compare VPC/VNet route tables and on-prem paths'],
        ['Hybrid reasoning', 'Correlate on-prem assets, tunnels, alerts, and cloud inventory'],
      ]} />
    </section>
  );
}

function CredentialSafetyPanel() {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><KeyRound size={18} /> Safe Credential Posture</>} />
      <RoadmapRows rows={[
        ['ISO posture', 'No cloud credentials should be baked into appliance images'],
        ['Repository posture', 'No API keys, tokens, or cloud key files in source control'],
        ['Storage prerequisite', 'Encrypted credential vault/design required before connectors'],
        ['Connector scope', 'Organization-scoped, read-only profiles by default'],
        ['Audit prerequisite', 'Credential use and provider polling must be auditable'],
        ['Operator control', 'Explicit configuration required before any external cloud call'],
      ]} />
    </section>
  );
}

function ToolProfilePanel() {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><Container size={18} /> Optional Tool Profiles</>} />
      <p style={panelCopy}>Documentation-only list. No packages are added or installed in v3.6.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {['awscli', 'azure-cli', 'gcloud', 'kubectl', 'terraform', 'trivy', 'syft', 'grype', 'cloudflared', 'wireguard-tools', 'openvpn'].map(tool => (
          <div key={tool} style={{ padding: '8px 10px', border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'rgba(0,0,0,0.16)', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.82rem' }}>{tool}</div>
        ))}
      </div>
    </section>
  );
}

function RoadmapRows({ rows }: { rows: Array<[string, string]> }) {
  return <div>{rows.map(([label, value]) => <DetailsLine key={label} label={label} value={value} />)}</div>;
}

function DetailsLine({ label, value }: { label: string; value: React.ReactNode }) {
  return <div style={rowStyle}><span style={{ color: 'var(--text-muted)' }}>{label}</span><span style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>{value}</span></div>;
}

function CompactList({ items }: { items: string[] }) {
  return <div style={{ display: 'grid', gap: 6 }}>{items.map(item => <div key={item} style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{item}</div>)}</div>;
}

function TinyHeading({ children }: { children: React.ReactNode }) {
  return <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', margin: '12px 0 6px' }}>{children}</div>;
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} style={{ color: 'var(--brand-cyan)', fontWeight: 800, fontSize: '0.78rem' }}>{children}</Link>;
}

const panelCopy: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.55, margin: '0 0 12px' };
const statusBadgeStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  border: '1px solid rgba(148,163,184,0.35)',
  background: 'rgba(148,163,184,0.1)',
  borderRadius: 999,
  padding: '4px 8px',
  fontSize: '0.7rem',
  fontWeight: 800,
  textTransform: 'uppercase',
};

const PROVIDERS: ProviderReadiness[] = [
  {
    name: 'AWS',
    status: 'Not configured',
    scope: ['VPCs', 'Subnets', 'Security Groups', 'Route Tables', 'VPN Gateways', 'Public IPs'],
    credentials: 'Future read-only IAM role/profile',
    risk: 'High',
    privacy: 'Cloud account metadata must remain local unless an operator explicitly approves export.',
    checks: ['Public ingress', 'Route drift', 'VPN state', 'VPC Flow Logs future'],
  },
  {
    name: 'Azure',
    status: 'Not configured',
    scope: ['VNets', 'NSGs', 'Route Tables', 'VPN Gateways', 'Public IPs'],
    credentials: 'Future Reader service principal',
    risk: 'High',
    privacy: 'Tenant, subscription, and resource identifiers require organization-scoped handling.',
    checks: ['NSG exposure', 'VPN gateway health', 'Activity Logs future', 'Public IP review'],
  },
  {
    name: 'Google Cloud',
    status: 'Not configured',
    scope: ['VPCs', 'Firewall Rules', 'Routes', 'VPN', 'Public IPs'],
    credentials: 'Future viewer service account',
    risk: 'High',
    privacy: 'Service account keys must not be stored until encrypted credential profiles exist.',
    checks: ['Firewall exposure', 'Cloud VPN state', 'Audit Logs future', 'Route analysis'],
  },
  {
    name: 'Cloudflare',
    status: 'Not configured',
    scope: ['DNS', 'Tunnel', 'WAF/security events future', 'Public exposure hints'],
    credentials: 'Future zone-scoped read-only token',
    risk: 'Medium',
    privacy: 'Zone and DNS data can reveal public attack surface and must be scoped tightly.',
    checks: ['Tunnel health', 'DNS drift', 'WAF events future', 'Public endpoint hints'],
  },
  {
    name: 'Kubernetes',
    status: 'Future',
    scope: ['Cluster inventory', 'Namespaces', 'Services', 'Ingress', 'Workloads'],
    credentials: 'Future kubeconfig/profile policy',
    risk: 'High',
    privacy: 'Cluster credentials and workload metadata require vaulting and RBAC before use.',
    checks: ['Exposed services', 'Ingress risk', 'Image posture future', 'Policy drift'],
  },
  {
    name: 'Container Security',
    status: 'Future',
    scope: ['Images', 'SBOMs', 'Vulnerabilities', 'Runtime signals future'],
    credentials: 'Future registry/read-only scanner profile',
    risk: 'Medium',
    privacy: 'Image names, registries, and SBOMs can expose internal architecture.',
    checks: ['Image vulnerability scans', 'SBOM review', 'Registry exposure', 'Runtime findings future'],
  },
];
