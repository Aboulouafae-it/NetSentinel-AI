# NetSentinel AI OS Terminal & MOTD Visual Style

**Version:** v2.7 Planning

This document defines the visual style rules for terminal output and the Message of the Day (MOTD) within NetSentinel AI OS.

## Core Philosophy
The terminal is a tool, not a billboard. It must remain highly functional, fast, and legible across all connection types (local console, SSH, serial).

## MOTD Rules
1. **Premium but Readable:** Use clean spacing and alignment. No huge ASCII art logos that break on small 80x24 terminal windows.
2. **Product Name:** Clearly identify the system at the top: `Welcome to NetSentinel AI OS`.
3. **Setup URLs:** Always provide the localhost URL and a hint for the LAN IP access.
4. **Command Guidance:** Always list the most critical commands:
   - `netsentinel-menu`
   - `appliance-status`
5. **No Secrets:** Never print default passwords, API keys, or database credentials to the MOTD.
6. **Concise:** Keep it under 20 lines total.

### Example Approved MOTD Format
```text
Welcome to NetSentinel AI OS

NetSentinel AI Console:
  http://localhost:3000/setup

LAN Access:
  http://<appliance-ip>:3000/setup

Status:
  appliance-status

Control Center:
  netsentinel-menu

Logs:
  /var/log/netsentinel/first-boot.log
```

## General Terminal Script Rules
- **Color Usage:** Use colors sparingly for status (`GREEN` for success, `RED` for critical failure, `YELLOW` for warnings, `CYAN` for headers).
- **Fallback:** All scripts must remain readable if ANSI color codes are stripped or not supported.
- **Tone:** Professional, objective. Never use slang or overly casual phrasing in error messages.
