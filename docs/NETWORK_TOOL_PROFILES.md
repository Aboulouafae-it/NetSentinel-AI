# NetSentinel AI OS Network Tool Profiles

**Version:** v3.8 Desktop Appliance Profile
**Status:** Classification Reference — default image remains network/security/wireless focused

This document classifies network tools by category and priority tier.
It is planning documentation only. Packages are not added or removed here.

---

## Classification Tiers

| Tier | Meaning |
|---|---|
| **Core** | Required for the appliance to function at its stated capability level. Already in package list. |
| **Recommended** | Strongly improves diagnostics. Low overhead. Should be in default image. |
| **Optional Heavy** | High value but large footprint or specific use case. Add only on operator request. |
| **Future** | Not yet implemented or staged. Planned for a future milestone. |

---

## 1. Discovery

| Tool | Package | Tier | Notes |
|---|---|---|---|
| `nmap` | `nmap` | Core | Port scan, host discovery, service detection |
| `arp-scan` | `arp-scan` | Core | Layer-2 LAN device discovery |
| `fping` | `fping` | Core | Bulk ICMP sweep, alive-host detection |
| `lldpd` | `lldpd` | Core | LLDP neighbor discovery, topology mapping |
| `netdiscover` | `netdiscover` | Recommended | ARP-based passive discovery |
| `masscan` | `masscan` | Optional Heavy | High-speed port scanner; use only in controlled lab environments |
| `zmap` | `zmap` | Optional Heavy | Internet-scale scanner; not for production LAN use |

---

## 2. ICMP / SNMP

| Tool | Package | Tier | Notes |
|---|---|---|---|
| `fping` | `fping` | Core | Multi-target ICMP, latency and packet loss |
| `mtr` | `mtr` | Core | Combined traceroute + ping statistics |
| `snmpwalk` | `snmp` | Core | SNMP MIB tree walk |
| `snmpget` | `snmp` | Core | Individual OID query |
| `snmpbulkwalk` | `snmp` | Core | Efficient bulk OID retrieval |
| `snmp-mibs-downloader` | `snmp-mibs-downloader` | Recommended | Human-readable MIB names (requires non-free repo) |
| `snmptrap` | `snmp` | Recommended | Receive and inspect SNMP traps |
| `librenms-agent` | — | Future | LibreNMS check integration (not planned) |

---

## 3. Packet Capture

| Tool | Package | Tier | Notes |
|---|---|---|---|
| `tcpdump` | `tcpdump` | Core | Live packet capture, filter-based analysis |
| `tshark` | `tshark` | Recommended | Wireshark CLI for structured capture analysis |
| `wireshark` | `wireshark` | Optional Heavy | Full GUI; large footprint; useful on desktop variant only |
| `ngrep` | `ngrep` | Recommended | grep-style packet filtering |
| `tcpflow` | `tcpflow` | Recommended | TCP stream reconstruction |
| `suricata` | `suricata` | Optional Heavy | IDS/IPS engine; future security milestone |
| `zeek` | `zeek` | Optional Heavy | Network security monitor; future SOC milestone |

---

## 4. DNS / IP Troubleshooting

| Tool | Package | Tier | Notes |
|---|---|---|---|
| `dig` | `dnsutils` | Core | DNS query tool, MX/A/AAAA/TXT lookup |
| `nslookup` | `dnsutils` | Core | Basic DNS resolution tool |
| `host` | `dnsutils` | Core | Simplified DNS lookup |
| `whois` | `whois` | Core | Domain/IP registry lookup |
| `traceroute` | `traceroute` | Core | IP path tracing |
| `ipcalc` | `ipcalc` | Recommended | Subnet calculation |
| `sipcalc` | `sipcalc` | Recommended | Advanced IPv4/IPv6 subnet calculator |

---

## 5. Wireless / RF Support

| Tool | Package | Tier | Notes |
|---|---|---|---|
| `iw` | `iw` | Core | nl80211-based wireless interface control |
| `iwconfig` | `wireless-tools` | Core | Legacy wireless configuration (many older CPEs) |
| `iwlist` | `wireless-tools` | Core | AP scan, channel, signal level |
| `wavemon` | `wavemon` | Recommended | Real-time wireless signal monitor (ncurses) |
| `aircrack-ng` | `aircrack-ng` | Optional Heavy | WEP/WPA audit suite; requires explicit operator justification |
| `kismet` | `kismet` | Optional Heavy | Passive wireless monitor; large footprint |
| `kismet-server` | — | Future | Passive RF sensor integration |
| `rfkill` | `rfkill` | Recommended | Enable/disable wireless/Bluetooth radio blocks |

> **Note:** Automatic RF metric collection from vendor devices (RSSI, SNR, CCQ, noise floor)
> is performed by NetSentinel backend adapters, not by OS-level tools. These tools are for
> operator-initiated field diagnostics, not automated monitoring.

---

## 6. Link / Interface Diagnostics

| Tool | Package | Tier | Notes |
|---|---|---|---|
| `ethtool` | `ethtool` | Core | NIC speed, duplex, driver, ring buffer stats |
| `ip` | `iproute2` | Core | Modern IP/route/link control (replaces `ifconfig`) |
| `nmcli` | `network-manager` | Core | NetworkManager CLI control |
| `bridge-utils` | `bridge-utils` | Recommended | Linux bridge management |
| `vlan` | `vlan` | Recommended | VLAN tagging management |
| `ss` | `iproute2` | Core | Socket statistics (replaces `netstat`) |
| `netstat` | `net-tools` | Recommended | Legacy socket stats; still useful for quick overview |

---

## 7. Security / SOC

| Tool | Package | Tier | Notes |
|---|---|---|---|
| `tcpdump` | `tcpdump` | Core | See Packet Capture |
| `nmap` | `nmap` | Core | Service/OS fingerprinting |
| `fail2ban` | `fail2ban` | Recommended | SSH/log-based brute-force blocking |
| `rkhunter` | `rkhunter` | Optional Heavy | Rootkit scanner; useful for appliance integrity checks |
| `chkrootkit` | `chkrootkit` | Optional Heavy | Additional rootkit scanner |
| `lynis` | `lynis` | Recommended | System hardening audit |
| `clamav` | `clamav` | Optional Heavy | AV scanner; high footprint |
| `suricata` | `suricata` | Optional Heavy | IDS/IPS; future security milestone |
| `crowdsec` | — | Future | Collaborative IPS; planned integration milestone |
| `osquery` | — | Future | OS query layer for security telemetry |

---

## 8. Cloud / Hybrid

| Tool | Package | Tier | Notes |
|---|---|---|---|
| `curl` | `curl` | Core | HTTP/API testing, cloud endpoint probes |
| `jq` | `jq` | Core | JSON output parsing |
| `openssl` | `openssl` | Core | Certificate inspection, TLS checks |
| `ca-certificates` | `ca-certificates` | Core | Root CA bundle for HTTPS verification |
| `wireguard` | `wireguard-tools` | Recommended | VPN tunnel management |
| `openvpn` | `openvpn` | Recommended | OpenVPN client |
| `aws-cli` | — | Optional Heavy | AWS management (requires operator credentials; never in ISO) |
| `azure-cli` | — | Optional Heavy | Azure management (requires operator credentials; never in ISO) |
| `kubectl` | — | Future | Kubernetes cluster management |
| `helm` | — | Future | Kubernetes package management |

> **Security rule:** Cloud CLI tools require operator-provided credentials.
> No credentials, API keys, or cloud tokens are ever baked into the ISO.

---

## 9. Virtualization / Appliance Management

| Tool | Package | Tier | Notes |
|---|---|---|---|
| `docker.io` | `docker.io` | Core | Container runtime for NetSentinel stack |
| `docker-compose` | `docker-compose` | Core | Debian-available Compose orchestration for the live-image profile |
| `git` | `git` | Core | Repository management, update pull |
| `rsync` | `rsync` | Recommended | File sync for backup/restore |
| `chrony` | `chrony` | Core | NTP time synchronization |
| `rsyslog` | `rsyslog` | Core | System log collection and forwarding |
| `qemu-guest-agent` | `qemu-guest-agent` | Recommended | VMware/QEMU guest integration |
| `open-vm-tools` | `open-vm-tools` | Recommended | VMware guest utilities |

## 9.1 Desktop Appliance Packages

v3.8 adds a focused desktop stack for operators:

| Package | Purpose |
|---|---|
| `xfce4` | Lightweight professional desktop |
| `xfce4-terminal` | Terminal fallback and command launchers |
| `thunar` | Local documentation/file access |
| `lightdm` | Live desktop login manager |
| `network-manager-gnome` | NetworkManager applet for WiFi/Ethernet |
| `chromium` / `firefox-esr` | Local console browser, launched only by operator action |

These packages are not a general-purpose desktop bundle. Office suites, games,
media editors, and unrelated tools remain out of scope.

---

## 10. Tier Summary Table

| Tier | Count | Action |
|---|---|---|
| Core | 27 | Already in `package-lists/netsentinel.list.chroot` or must be added |
| Recommended | 18 | Add in next image milestone review |
| Optional Heavy | 12 | Operator installs post-boot; not in default image |
| Future | 6 | Roadmap only; not yet implemented |

---

## 11. Package Audit Workflow

Before each ISO milestone:

1. Review `deploy/live-image/package-lists/netsentinel.list.chroot`
2. Cross-reference with this document
3. Confirm all Core tools are present
4. Decide which Recommended tools to promote for that milestone
5. Document any Optional Heavy tools added and the justification
6. Never add Optional Heavy tools to the default image without explicit review
