// NetSentinel AI — Shared Types

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  organization_id: string | null;
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
  site_id: string;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  source: string | null;
  rule_name: string | null;
  organization_id: string;
  asset_id: string | null;
  incident_id: string | null;
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
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface AssetStats {
  total: number;
  online: number;
  offline: number;
  degraded: number;
  uptime_percentage: number;
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
  status: 'online' | 'offline' | 'degraded' | 'alignment_needed' | 'unknown';
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
  created_at: string;
  updated_at: string;
}
