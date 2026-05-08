// NetSentinel AI — Shared Types

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  role: string;
  organization_id: string | null;
  organization_name: string | null;
}

export interface SetupStatus {
  initialized: boolean;
  organizations: number;
  users: number;
}

export interface ApplianceHealth {
  app: {
    name: string;
    version: string;
    build_date: string | null;
    edition: string;
    environment: string;
    debug: boolean;
    production_ready: boolean;
    config_warnings: string[];
  };
  backend: { status: string; detail?: string };
  database: { status: string; detail?: string };
  redis: { status: string; detail?: string };
  worker: { status: string; detail?: string };
  edge_agents: { status: string; total: number; healthy: number; revoked: number };
  disk: { total_bytes: number; used_bytes: number; free_bytes: number };
  backup: { status: string; latest: string | null };
}

export interface SystemVersion {
  app_version: string;
  build_date: string | null;
  edition: string;
  environment: string;
  git_commit: string | null;
  database_revision: string | null;
}

export interface Organization {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  contact_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  subnet: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  hostname: string;
  ip_address: string | null;
  mac_address: string | null;
  asset_type: 'server' | 'workstation' | 'router' | 'switch' | 'firewall' | 'access_point' | 'printer' | 'iot_device' | 'other';
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  os_info: string | null;
  vendor: string | null;
  description: string | null;
  last_seen: string | null;
  site_id: string | null;
  risk_level: 'normal' | 'warning' | 'at_risk' | 'offline' | 'unknown' | null;
  risk_reasons: string[] | null;
  related_alerts_count: number;
  last_poll_status: string | null;
  last_telemetry_source: string | null;
  last_poll_latency_ms: number | null;
  last_poll_packet_loss_percent: number | null;
  last_poll_error: string | null;
  last_polled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'open' | 'acknowledged' | 'escalated' | 'resolved' | 'dismissed';
  source: string | null;
  rule_name: string | null;
  source_metadata: Record<string, any> | null;
  organization_id: string;
  asset_id: string | null;
  incident_id: string | null;
  wireless_link_id: string | null;
  occurrence_count: number;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'mitigated' | 'resolved' | 'closed';
  assigned_to: string | null;
  resolution_notes: string | null;
  notes: Array<Record<string, any>> | null;
  timeline_events: Array<Record<string, any>> | null;
  tasks: Array<{ id: string; title: string; completed: boolean }> | null;
  impacted_services: string[] | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface AssetStats {
  total: number;
  online: number;
  offline: number;
  degraded: number;
  unmanaged: number;
  at_risk: number;
  uptime_percentage: number;
}

export interface DashboardSummary {
  assets: { total: number; online: number; offline: number; warning: number; unmanaged: number };
  alerts: { open: number; critical: number; high: number; medium: number; low: number };
  incidents: { active: number; by_status: Record<string, number> };
  wireless_links: { total: number };
  radio_devices: { total: number; live_adapter_supported?: number; missing_credentials?: number; missing_metrics?: number };
  security_events?: { fortinet_high_severity: number; vpn_failures: number; ips_malware: number; blocked_traffic: number };
}

export interface DashboardWirelessHealth {
  measurements: number;
  avg_rssi: number | null;
  avg_snr: number | null;
  avg_noise_floor: number | null;
  avg_latency: number | null;
  avg_packet_loss: number | null;
}

export interface DashboardActivity {
  type: string;
  event: string;
  title: string;
  actor?: string | null;
  severity?: string | null;
  timestamp: string;
}

export interface DashboardSystemStatus {
  [key: string]: { status: string };
}

export interface TopologySummary {
  sites: Array<{ id: string; name: string; assets_count: number; has_active_alerts: boolean }>;
  wireless_links: Array<{ id: string; name: string; status: string; has_active_alerts: boolean }>;
}

export interface EdgeAgent {
  id: string;
  organization_id: string;
  site_id: string | null;
  name: string;
  agent_uid: string;
  version: string | null;
  hostname: string | null;
  ip_address: string | null;
  status: 'healthy' | 'degraded' | 'offline' | 'unknown';
  last_seen: string | null;
  health_metadata: Record<string, any> | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertStats {
  total: number;
  open: number;
  critical: number;
  high: number;
}

export interface AntennaProfile {
  id: string;
  name: string;
  gain_dbi: number;
  beamwidth_h_deg: number | null;
  beamwidth_v_deg: number | null;
  polarization: string;
}

export interface PhysicalMount {
  id: string;
  site_id: string;
  name: string;
  elevation_meters: number | null;
  azimuth_heading_deg: number | null;
}

export interface RadioInterface {
  id: string;
  asset_id: string;
  mount_id: string | null;
  antenna_profile_id: string | null;
  mac_address: string;
  mode: string;
  frequency_mhz: number | null;
  channel_width_mhz: number | null;
  tx_power_dbm: number | null;
}

export interface WirelessLink {
  id: string;
  name: string;
  interface_a_id: string;
  interface_b_id: string;
  link_type: string;
  organization_id: string;
  theoretical_max_capacity_mbps: number | null;
  expected_rssi_dbm: number | null;
  near_end_radio_id: string | null;
  far_end_radio_id: string | null;
  status: 'online' | 'offline' | 'degraded' | 'alignment_needed' | 'unknown';
  created_at: string;
  updated_at: string;
}

export interface RadioDevice {
  id: string;
  organization_id: string | null;
  name: string;
  ip_address: string;
  mac_address: string | null;
  vendor: string;
  device_model: string | null;
  firmware_version: string | null;
  role: string;
  frequency_mhz: number | null;
  channel_width_mhz: number | null;
  tx_power_dbm: number | null;
  site_name: string | null;
  link_name: string | null;
  link_side: string | null;
  wireless_link_id: string | null;
  adapter_type: string;
  is_monitored: boolean;
  is_online: boolean | null;
  last_seen: string | null;
  last_poll_source: string | null;
  last_poll_latency_ms: number | null;
  last_poll_error: string | null;
  snmp_info: Record<string, any> | null;
  latest_device_info: Record<string, any> | null;
  latest_interface_status: Record<string, any> | null;
  latest_wireless_metrics: Record<string, any> | null;
  adapter_capabilities: Record<string, any> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WirelessMetric {
  id: string;
  wireless_link_id: string;
  timestamp: string;
  rssi: number | null;
  snr: number | null;
  noise_floor: number | null;
  ccq: number | null;
  tx_capacity: number | null;
  rx_capacity: number | null;
}

export interface FieldDiagnostic {
  id: string;
  wireless_link_id: string;
  diagnostic_type: 'spectrum_scan' | 'alignment_check' | 'interference_analysis' | 'weather_fade_analysis';
  performed_by: string | null;
  findings: string;
  recommendation: string | null;
  created_at: string;
}

export interface MaintenanceLog {
  id: string;
  wireless_link_id: string;
  technician_name: string;
  action_taken: string;
  parts_replaced: string | null;
  cost: number | null;
  created_at: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  metadata_json: Record<string, any> | null;
  asset_id: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedLogs {
  items: LogEntry[];
  total: number;
  page: number;
  size: number;
}

export interface DetectionRule {
  id: string;
  name: string;
  description: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  is_active: boolean;
  target_field: string;
  condition: string;
  pattern: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface IndicatorOfCompromise {
  id: string;
  ioc_type: string;
  value: string;
  description: string | null;
  confidence: number;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

// --- Real Discovery Types (backed by actual ICMP probes) ---

export interface DiscoveryScan {
  id: string;
  subnet: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_hosts: number;
  reachable_hosts: number;
  unreachable_hosts: number;
  duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscoveredHost {
  id: string;
  ip_address: string;
  is_reachable: boolean;
  response_time_ms: number | null;
  hostname_resolved: string | null;
  scan_id: string;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScanResultSummary {
  scan: DiscoveryScan;
  hosts: DiscoveredHost[];
}

// --- Real Field Measurements (manually entered by technicians) ---

export interface FieldMeasurement {
  id: string;
  organization_id: string | null;
  wireless_link_id: string | null;
  link_name: string;
  origin_site: string | null;
  destination_site: string | null;
  vendor: string | null;
  device_model: string | null;
  frequency_mhz: number | null;
  channel_width_mhz: number | null;
  rssi_dbm: number | null;
  snr_db: number | null;
  noise_floor_dbm: number | null;
  ccq_percent: number | null;
  latency_ms: number | null;
  packet_loss_percent: number | null;
  tx_capacity_mbps: number | null;
  rx_capacity_mbps: number | null;
  link_status: 'operational' | 'degraded' | 'down' | 'maintenance';
  technician_name: string | null;
  notes: string | null;
  diagnosis: WirelessDiagnosis;
  created_at: string;
  updated_at: string;
}

export interface WirelessDiagnosis {
  health_score: number;
  status: 'Excellent' | 'Good' | 'Degraded' | 'Poor' | 'Critical';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  likely_root_cause: string;
  recommended_actions: string[];
  evidence: string[];
}
