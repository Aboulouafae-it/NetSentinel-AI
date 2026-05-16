#!/usr/bin/env bash
# ============================================================================
# NetSentinel AI Control Center
# Terminal Menu — v2.8
#
# Network Operations • Cybersecurity • Wireless Diagnostics • Hybrid Cloud
#
# This script provides a polished terminal menu for the NetSentinel AI OS
# appliance. It uses whiptail if available, with a fallback text menu.
#
# Safety:
#   - No scans run automatically without operator confirmation
#   - No secrets exposed
#   - No destructive commands
#   - Missing tools handled gracefully
#   - Works in Live Demo mode and Installed Appliance mode
# ============================================================================
set -uo pipefail

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
readonly MENU_TITLE="NetSentinel AI Control Center"
readonly MENU_SUBTITLE="Network Operations • Cybersecurity • Wireless Diagnostics • Hybrid Cloud"
readonly APP_ROOT="${NETSENTINEL_INSTALL_DIR:-/opt/netsentinel}"
readonly LOG_DIR="/var/log/netsentinel"
readonly CONSOLE_PORT="${NETSENTINEL_CONSOLE_PORT:-3000}"
readonly DOCS_SYSTEM="/opt/netsentinel/docs"
readonly VERSION="v2.8"

# ---------------------------------------------------------------------------
# Terminal helpers
# ---------------------------------------------------------------------------
BOLD=""
DIM=""
CYAN=""
GREEN=""
YELLOW=""
RED=""
RESET=""

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1; then
    BOLD="$(tput bold 2>/dev/null || true)"
    DIM="$(tput dim 2>/dev/null || true)"
    CYAN="$(tput setaf 6 2>/dev/null || true)"
    GREEN="$(tput setaf 2 2>/dev/null || true)"
    YELLOW="$(tput setaf 3 2>/dev/null || true)"
    RED="$(tput setaf 1 2>/dev/null || true)"
    RESET="$(tput sgr0 2>/dev/null || true)"
fi

has_whiptail() {
    command -v whiptail >/dev/null 2>&1
}

has_command() {
    command -v "$1" >/dev/null 2>&1
}

get_appliance_ip() {
    local ip
    ip=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' | head -1)
    if [[ -z "${ip}" ]]; then
        ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi
    echo "${ip:-<appliance-ip>}"
}

has_desktop() {
    [[ -n "${DISPLAY:-}" ]] || [[ -n "${WAYLAND_DISPLAY:-}" ]]
}

press_enter() {
    echo ""
    echo "${DIM}Press Enter to return to the menu...${RESET}"
    read -r
}

print_header() {
    clear
    echo ""
    echo "${BOLD}${CYAN}  ╔══════════════════════════════════════════════════════════════╗${RESET}"
    echo "${BOLD}${CYAN}  ║           ${MENU_TITLE}                ║${RESET}"
    echo "${BOLD}${CYAN}  ║  ${DIM}${MENU_SUBTITLE}${BOLD}${CYAN}  ║${RESET}"
    echo "${BOLD}${CYAN}  ╚══════════════════════════════════════════════════════════════╝${RESET}"
    echo ""
}

print_section_header() {
    local title="$1"
    echo ""
    echo "${BOLD}${CYAN}──────────────────────────────────────────${RESET}"
    echo "${BOLD}${CYAN}  ${title}${RESET}"
    echo "${BOLD}${CYAN}──────────────────────────────────────────${RESET}"
    echo ""
}

tool_check() {
    local tool="$1"
    local label="${2:-$1}"
    if has_command "${tool}"; then
        echo "  ${GREEN}✓${RESET} ${label}"
    else
        echo "  ${DIM}✗ ${label} (not installed)${RESET}"
    fi
}

confirm_action() {
    local prompt="$1"
    echo ""
    read -r -p "${YELLOW}${prompt} [y/N]: ${RESET}" answer
    [[ "${answer}" =~ ^[Yy]$ ]]
}

# ============================================================================
# Menu Section: 1 — Launch NetSentinel AI Console
# ============================================================================
section_launch_console() {
    print_section_header "Launch NetSentinel AI Console"

    local ip
    ip=$(get_appliance_ip)

    echo "  ${BOLD}NetSentinel AI Console URLs:${RESET}"
    echo ""
    echo "  Local:   ${GREEN}http://localhost:${CONSOLE_PORT}/setup${RESET}"
    echo "  LAN:     ${GREEN}http://${ip}:${CONSOLE_PORT}/setup${RESET}"
    echo ""
    echo "  After first-run setup completes, use:"
    echo "  Local:   http://localhost:${CONSOLE_PORT}/"
    echo "  LAN:     http://${ip}:${CONSOLE_PORT}/"
    echo ""

    if has_desktop && has_command xdg-open; then
        if confirm_action "Open console in browser?"; then
            xdg-open "http://localhost:${CONSOLE_PORT}/setup" 2>/dev/null &
            echo "  ${GREEN}Browser launched.${RESET}"
        fi
    else
        echo "  ${DIM}No desktop session detected. Open the URL above from a browser"
        echo "  on any device on the same network.${RESET}"
    fi

    press_enter
}

# ============================================================================
# Menu Section: 2 — Appliance Status
# ============================================================================
section_appliance_status() {
    print_section_header "Appliance Status"

    if has_command appliance-status; then
        appliance-status || true
    elif has_command netsentinel-appliance-status; then
        netsentinel-appliance-status || true
    elif [[ -x "${APP_ROOT}/deploy/live-image/scripts/appliance-status.sh" ]]; then
        "${APP_ROOT}/deploy/live-image/scripts/appliance-status.sh" || true
    else
        echo "  ${YELLOW}appliance-status command not found.${RESET}"
        echo ""
        echo "  Expected at: /usr/local/bin/appliance-status"
        echo "  Or:          ${APP_ROOT}/deploy/live-image/scripts/appliance-status.sh"
        echo ""
        echo "  If running from the repository, try:"
        echo "    bash deploy/live-image/scripts/appliance-status.sh"
    fi

    press_enter
}

# ============================================================================
# Menu Section: 3 — Network Tools
# ============================================================================
section_network_tools() {
    print_section_header "Network Tools"

    echo "  ${BOLD}Available Tools:${RESET}"
    echo ""
    tool_check ip           "ip            — interface/route/link management"
    tool_check ping         "ping          — ICMP connectivity test"
    tool_check traceroute   "traceroute    — path tracing"
    tool_check mtr          "mtr           — traceroute + ping statistics"
    tool_check nmap         "nmap          — port/host scanning"
    tool_check fping        "fping         — bulk ICMP sweep"
    tool_check arp-scan     "arp-scan      — LAN device discovery"
    tool_check snmpwalk     "snmpwalk      — SNMP MIB tree walk"
    tool_check ethtool      "ethtool       — NIC diagnostics"
    tool_check lldpcli      "lldpcli       — LLDP neighbor discovery"
    tool_check dig          "dig           — DNS lookup"
    tool_check whois        "whois         — domain/IP registry lookup"
    tool_check ss           "ss            — socket statistics"

    echo ""
    echo "  ${BOLD}Quick Examples:${RESET}"
    echo ""
    echo "    ip a                              Show all interfaces"
    echo "    ping -c 4 <target>                Test connectivity"
    echo "    traceroute <target>               Trace route to target"
    echo "    mtr --report <target>             Traceroute with statistics"
    echo "    nmap -sn 192.168.1.0/24           Subnet host discovery"
    echo "    fping -g 192.168.1.0/24           Bulk ICMP sweep"
    echo "    arp-scan --localnet               LAN discovery (requires root)"
    echo "    snmpwalk -v2c -c public <host>    Walk SNMP MIB tree"
    echo "    ethtool eth0                      Interface diagnostics"
    echo "    lldpcli show neighbors            LLDP neighbors"
    echo ""
    echo "  ${YELLOW}⚠  Important: Do not run active scans without proper authorization.${RESET}"
    echo "  ${DIM}Drop to a shell (option 9) to run tools manually.${RESET}"

    press_enter
}

# ============================================================================
# Menu Section: 4 — Packet Capture
# ============================================================================
section_packet_capture() {
    print_section_header "Packet Capture"

    echo "  ${BOLD}Available Capture Tools:${RESET}"
    echo ""
    tool_check tcpdump "tcpdump   — live packet capture"
    tool_check tshark  "tshark    — Wireshark CLI capture/analysis"
    echo ""

    echo "  ${BOLD}Interface Listing:${RESET}"
    echo ""
    if has_command ip; then
        ip -brief link show 2>/dev/null | while read -r line; do
            echo "    ${line}"
        done
    else
        echo "    ${DIM}(ip command not available)${RESET}"
    fi

    echo ""
    echo "  ${BOLD}Safe Examples:${RESET}"
    echo ""
    echo "    tcpdump -i eth0 -c 100 -w /tmp/capture.pcap"
    echo "        Capture 100 packets on eth0, save to file"
    echo ""
    echo "    tcpdump -i any -c 50 port 53"
    echo "        Show 50 DNS packets on any interface"
    echo ""
    if has_command tshark; then
        echo "    tshark -i eth0 -c 100 -w /tmp/capture.pcapng"
        echo "        Capture 100 packets with tshark"
        echo ""
    fi
    echo "    tcpdump -D"
    echo "        List all available capture interfaces"
    echo ""
    echo "  ${YELLOW}⚠  Important: Captures may contain sensitive data. Redact before sharing.${RESET}"
    echo "  ${DIM}Captures should be saved to /tmp/ or ${APP_ROOT}/captures/.${RESET}"
    echo "  ${DIM}Do not store raw captures in the ISO image.${RESET}"
    echo "  ${DIM}Drop to a shell (option 9) to run captures manually.${RESET}"

    press_enter
}

# ============================================================================
# Menu Section: 5 — Wireless Diagnostics
# ============================================================================
section_wireless_diagnostics() {
    print_section_header "Wireless Diagnostics"

    echo "  ${BOLD}NetSentinel AI Wireless Workflow:${RESET}"
    echo ""
    echo "  The NetSentinel AI Console includes:"
    echo "    • Radio Devices page — registered radio inventory"
    echo "    • Field Measurements page — manual RF measurement capture"
    echo "    • Wireless Health Score — deterministic scoring from RSSI/SNR/CCQ"
    echo ""

    echo "  ${BOLD}RF Metrics Reference:${RESET}"
    echo ""
    echo "    RSSI (dBm):   > -60 Excellent | -60 to -70 Good | -70 to -80 Marginal"
    echo "    SNR (dB):     > 30 Excellent  | 20-30 Good      | 15-20 Marginal"
    echo "    Noise floor:  < -85 dBm acceptable"
    echo "    CCQ (%):      > 85% target (airMAX/UISP)"
    echo ""

    echo "  ${BOLD}Supported Device Workflows:${RESET}"
    echo ""
    echo "    • Ubiquiti PowerBeam / NanoBeam / LiteBeam (SNMP + manual RF)"
    echo "    • TP-Link CPE210/CPE510/CPE610 (SNMP + manual RF fallback)"
    echo "    • MikroTik RouterOS (SSH/API adapter + manual RF fallback)"
    echo ""

    echo "  ${BOLD}Manual RF Measurement Fallback:${RESET}"
    echo ""
    echo "    When no validated adapter exists or adapter returns incomplete data:"
    echo "    1. Log into device management interface"
    echo "    2. Record RSSI, SNR, noise floor, CCQ from device status page"
    echo "    3. Use: fping -c 100 <device-ip>   for latency/packet loss"
    echo "    4. Submit via NetSentinel → Wireless → Manual Field Measurement"
    echo ""

    echo "  ${BOLD}Local Wireless Tools:${RESET}"
    echo ""
    tool_check iw        "iw          — nl80211 wireless control"
    tool_check iwconfig  "iwconfig    — legacy wireless config"
    tool_check iwlist    "iwlist      — AP scan / signal level"
    tool_check wavemon   "wavemon     — real-time RF signal monitor"
    tool_check rfkill    "rfkill      — radio block control"
    echo ""

    echo "  ${DIM}See: docs/WIRELESS_DIAGNOSTICS_WORKFLOW.md for full workflow.${RESET}"

    press_enter
}

# ============================================================================
# Menu Section: 6 — Syslog & Security
# ============================================================================
section_syslog_security() {
    print_section_header "Syslog & Security"

    echo "  ${BOLD}Syslog Ingestion:${RESET}"
    echo ""
    echo "    NetSentinel AI accepts authenticated HTTP syslog ingestion"
    echo "    from Edge Agents and compatible collectors."
    echo ""
    echo "    Supported profiles:"
    echo "      • Fortinet / FortiGate — key/value syslog parsing and classification"
    echo "      • Generic syslog — basic log storage and asset linking"
    echo ""

    echo "  ${BOLD}Fortinet Security Events:${RESET}"
    echo ""
    echo "    NetSentinel classifies FortiGate events into categories:"
    echo "      VPN login success/failure, admin login, IPS attacks,"
    echo "      malware detection, web filter blocks, interface state,"
    echo "      HA failover, configuration changes"
    echo ""
    echo "    High-value events generate deduplicated alerts automatically."
    echo ""

    echo "  ${BOLD}Console Pages:${RESET}"
    echo ""
    local ip
    ip=$(get_appliance_ip)
    echo "    Logs:       http://localhost:${CONSOLE_PORT}/logs"
    echo "    Alerts:     http://localhost:${CONSOLE_PORT}/alerts"
    echo "    Incidents:  http://localhost:${CONSOLE_PORT}/incidents"
    echo ""

    echo "  ${BOLD}Log Locations:${RESET}"
    echo ""
    echo "    System journal:    journalctl -f"
    echo "    NetSentinel logs:  ${LOG_DIR}/"
    echo "    First-boot log:    ${LOG_DIR}/first-boot.log"
    echo "    Syslog:            /var/log/syslog"
    echo ""

    echo "  ${BOLD}Alert & Incident Workflow:${RESET}"
    echo ""
    echo "    1. Log ingestion → automatic classification"
    echo "    2. High-value events → alert creation (deduplicated)"
    echo "    3. Alerts → acknowledge, escalate, or resolve"
    echo "    4. Critical alerts → incident creation with owner assignment"
    echo ""

    echo "  ${DIM}See: docs/SYSLOG_PROFILES.md for profile details.${RESET}"

    press_enter
}

# ============================================================================
# Menu Section: 7 — Cloud & Hybrid
# ============================================================================
section_cloud_hybrid() {
    print_section_header "Cloud & Hybrid Infrastructure"

    echo "  ${BOLD}Roadmap Foundation:${RESET}"
    echo ""
    echo "    NetSentinel AI OS is hybrid-aware. Cloud integrations are planned"
    echo "    for future milestones. All cloud monitoring is read-only and"
    echo "    requires explicit operator-provided credentials."
    echo ""

    echo "  ${BOLD}Planned Cloud Providers:${RESET}"
    echo ""
    echo "    • AWS VPC — EC2, security groups, VPN, CloudWatch, VPC Flow Logs"
    echo "    • Azure VNet — VMs, NSGs, VPN Gateway, Azure Monitor"
    echo "    • GCP VPC — Compute Engine, firewall rules, Cloud Logging"
    echo "    • Cloudflare — DNS, tunnel health, WAF, rate limiting"
    echo ""

    echo "  ${BOLD}VPN Tunnel Monitoring (Planned):${RESET}"
    echo ""
    echo "    • WireGuard     — wg show"
    echo "    • OpenVPN       — status file monitoring"
    echo "    • IPsec         — ipsec statusall / swanctl"
    echo "    • Cloud VPN     — via cloud provider APIs"
    echo ""

    echo "  ${BOLD}Public Exposure Checks (Planned):${RESET}"
    echo ""
    echo "    • SSH (22) publicly exposed → Critical alert"
    echo "    • RDP (3389) publicly exposed → Critical alert"
    echo "    • Database ports publicly exposed → Critical alert"
    echo "    • Security group drift detection"
    echo ""

    echo "  ${YELLOW}⚠  Important:${RESET}"
    echo "    • No cloud credentials are included in this system"
    echo "    • Cloud features require explicit operator configuration"
    echo "    • All cloud operations are read-only by default"
    echo "    • Credentials are stored locally, never in the ISO"
    echo ""

    echo "  ${DIM}See: docs/CLOUD_HYBRID_ROADMAP.md for full roadmap.${RESET}"

    press_enter
}

# ============================================================================
# Menu Section: 8 — Documentation
# ============================================================================
section_documentation() {
    print_section_header "Documentation"

    echo "  ${BOLD}Local Documentation:${RESET}"
    echo ""

    local found_docs=false

    # Check system docs path
    if [[ -d "${DOCS_SYSTEM}" ]]; then
        echo "  ${GREEN}✓${RESET} System docs: ${DOCS_SYSTEM}/"
        found_docs=true
    fi

    # Check if README exists in app root
    if [[ -f "${APP_ROOT}/README.md" ]]; then
        echo "  ${GREEN}✓${RESET} README: ${APP_ROOT}/README.md"
        found_docs=true
    fi

    # Check if running from repository (dev mode)
    local script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local repo_docs="${script_dir}/../../../docs"
    if [[ -d "${repo_docs}" ]]; then
        repo_docs="$(cd "${repo_docs}" && pwd)"
        echo "  ${GREEN}✓${RESET} Repository docs: ${repo_docs}/"
        found_docs=true
        echo ""
        echo "  ${BOLD}Available Documentation:${RESET}"
        echo ""
        for doc in "${repo_docs}"/*.md; do
            if [[ -f "${doc}" ]]; then
                echo "    • $(basename "${doc}")"
            fi
        done
    fi

    if [[ "${found_docs}" == "false" ]]; then
        echo "  ${YELLOW}No local documentation found.${RESET}"
        echo ""
        echo "  Expected locations:"
        echo "    ${DOCS_SYSTEM}/"
        echo "    ${APP_ROOT}/README.md"
    fi

    echo ""
    echo "  ${BOLD}Key Documents:${RESET}"
    echo ""
    echo "    • NETSENTINEL_CONTROL_CENTER.md     Control Center design"
    echo "    • NETSENTINEL_OS_EXPERIENCE.md      OS experience design"
    echo "    • NETSENTINEL_OS_BRAND_GUIDELINES.md Brand guidelines"
    echo "    • NETWORK_TOOL_PROFILES.md          Tool classification"
    echo "    • WIRELESS_DIAGNOSTICS_WORKFLOW.md   RF measurement workflows"
    echo "    • CLOUD_HYBRID_ROADMAP.md           Cloud integration roadmap"
    echo "    • APPLIANCE_HARDENING_PLAN.md       Security hardening plan"
    echo "    • SYSLOG_PROFILES.md                Syslog profile reference"
    echo ""

    echo "  ${BOLD}Online Resources:${RESET}"
    echo ""
    echo "    GitHub: https://github.com/Aboulouafae-it/NetSentinel-AI"
    echo ""

    echo "  ${DIM}To read a document: less <path-to-document>${RESET}"

    press_enter
}

# ============================================================================
# Menu Section: 9 — Terminal / Shell
# ============================================================================
section_terminal() {
    echo ""
    echo "  ${BOLD}Returning to shell.${RESET}"
    echo "  ${DIM}Run 'netsentinel-menu' to return to the Control Center.${RESET}"
    echo ""
    exit 0
}

# ============================================================================
# Whiptail Menu
# ============================================================================
run_whiptail_menu() {
    local rows cols
    rows=$(tput lines 2>/dev/null || echo 24)
    cols=$(tput cols 2>/dev/null || echo 80)
    local menu_height=$(( rows - 10 ))
    [[ ${menu_height} -lt 12 ]] && menu_height=12
    [[ ${menu_height} -gt 20 ]] && menu_height=20

    while true; do
        local choice
        choice=$(whiptail \
            --title "${MENU_TITLE} ${VERSION}" \
            --menu "\n${MENU_SUBTITLE}\n\nSelect an option:" \
            "${menu_height}" 72 10 \
            "1" "Launch NetSentinel AI Console" \
            "2" "Appliance Status" \
            "3" "Network Tools" \
            "4" "Packet Capture" \
            "5" "Wireless Diagnostics" \
            "6" "Syslog & Security" \
            "7" "Cloud & Hybrid" \
            "8" "Documentation" \
            "9" "Terminal / Shell" \
            "10" "Exit" \
            3>&1 1>&2 2>&3) || break

        case "${choice}" in
            1)  section_launch_console ;;
            2)  section_appliance_status ;;
            3)  section_network_tools ;;
            4)  section_packet_capture ;;
            5)  section_wireless_diagnostics ;;
            6)  section_syslog_security ;;
            7)  section_cloud_hybrid ;;
            8)  section_documentation ;;
            9)  section_terminal ;;
            10) break ;;
            *)  break ;;
        esac
    done
}

# ============================================================================
# Fallback Text Menu
# ============================================================================
run_text_menu() {
    while true; do
        print_header

        echo "   ${BOLD}1${RESET})  Launch NetSentinel AI Console"
        echo "   ${BOLD}2${RESET})  Appliance Status"
        echo "   ${BOLD}3${RESET})  Network Tools"
        echo "   ${BOLD}4${RESET})  Packet Capture"
        echo "   ${BOLD}5${RESET})  Wireless Diagnostics"
        echo "   ${BOLD}6${RESET})  Syslog & Security"
        echo "   ${BOLD}7${RESET})  Cloud & Hybrid"
        echo "   ${BOLD}8${RESET})  Documentation"
        echo "   ${BOLD}9${RESET})  Terminal / Shell"
        echo "  ${BOLD}10${RESET})  Exit"
        echo ""

        read -r -p "  ${CYAN}Select [1-10]: ${RESET}" choice

        case "${choice}" in
            1)  section_launch_console ;;
            2)  section_appliance_status ;;
            3)  section_network_tools ;;
            4)  section_packet_capture ;;
            5)  section_wireless_diagnostics ;;
            6)  section_syslog_security ;;
            7)  section_cloud_hybrid ;;
            8)  section_documentation ;;
            9)  section_terminal ;;
            10|q|Q|quit|exit) break ;;
            *)  echo "  ${RED}Invalid selection. Please choose 1-10.${RESET}"
                sleep 1
                ;;
        esac
    done
}

# ============================================================================
# Main
# ============================================================================
main() {
    # Trap to restore terminal on exit
    trap 'echo "${RESET}"' EXIT

    if has_whiptail; then
        run_whiptail_menu
    else
        run_text_menu
    fi

    echo ""
    echo "  ${BOLD}${CYAN}NetSentinel AI OS${RESET} — ${DIM}${VERSION}${RESET}"
    echo "  ${DIM}Thank you for using NetSentinel AI Control Center.${RESET}"
    echo ""
}

main "$@"
