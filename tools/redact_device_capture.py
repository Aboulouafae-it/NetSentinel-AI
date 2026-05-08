#!/usr/bin/env python3
"""Redact real network device captures before fixture review.

The tool preserves key/value structure and command output shape while replacing
secrets, identities, and addresses with stable placeholders. Raw captures should
stay outside git; only reviewed redacted output belongs under
backend/tests/fixtures/devices/<vendor>/real_redacted/.
"""

from __future__ import annotations

import argparse
import ipaddress
import re
from pathlib import Path


MAC_RE = re.compile(r"\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b")
EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
IPV4_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
IPV6_RE = re.compile(r"\b(?:[0-9A-Fa-f]{1,4}:){2,7}[0-9A-Fa-f]{1,4}\b")

SECRET_VALUE_RE = re.compile(
    r"(?P<prefix>\b(?:password|passwd|pwd|secret|token|api[_-]?key|apikey|community|snmp_community|authorization|x-agent-token)\b\s*[:=]\s*)(?P<quote>['\"]?)(?P<value>[^'\"\s,;]+)(?P=quote)",
    re.IGNORECASE,
)
USER_VALUE_RE = re.compile(r"(?P<prefix>\b(?:user|username|admin|login)\b\s*[:=]\s*)(?P<quote>['\"]?)(?P<value>[^'\"\s,;]+)(?P=quote)", re.IGNORECASE)
SERIAL_VALUE_RE = re.compile(r"(?P<prefix>\b(?:serial|serial-number|serial_number|devid|board-serial-number)\b\s*[:=]\s*)(?P<quote>['\"]?)(?P<value>[^'\"\s,;]+)(?P=quote)", re.IGNORECASE)
HOSTNAME_VALUE_RE = re.compile(r"(?P<prefix>\b(?:hostname|host|devname|sysName|identity|name)\b\s*[:=]\s*)(?P<quote>['\"]?)(?P<value>[^'\"\s,;]+)(?P=quote)", re.IGNORECASE)


class StableRedactor:
    def __init__(self) -> None:
        self.counters: dict[str, int] = {}
        self.values: dict[tuple[str, str], str] = {}

    def placeholder(self, kind: str, value: str) -> str:
        key = (kind, value)
        if key not in self.values:
            self.counters[kind] = self.counters.get(kind, 0) + 1
            self.values[key] = f"<{kind.upper()}_{self.counters[kind]}>"
        return self.values[key]


def _replace_keyed(pattern: re.Pattern[str], text: str, redactor: StableRedactor, kind: str) -> str:
    def repl(match: re.Match[str]) -> str:
        return f"{match.group('prefix')}{match.group('quote')}{redactor.placeholder(kind, match.group('value'))}{match.group('quote')}"

    return pattern.sub(repl, text)


def _redact_ipv4(text: str, redactor: StableRedactor, redact_private_ips: bool, redact_public_ips: bool) -> str:
    def repl(match: re.Match[str]) -> str:
        value = match.group(0)
        try:
            ip = ipaddress.ip_address(value)
        except ValueError:
            return value
        should_redact = (ip.is_private and redact_private_ips) or (not ip.is_private and redact_public_ips)
        return redactor.placeholder("ip", value) if should_redact else value

    return IPV4_RE.sub(repl, text)


def redact_text(
    text: str,
    *,
    redact_private_ips: bool = False,
    redact_public_ips: bool = True,
    redact_hostnames: bool = False,
    customer_names: list[str] | None = None,
) -> str:
    redactor = StableRedactor()
    output = text
    output = SECRET_VALUE_RE.sub(lambda m: f"{m.group('prefix')}{m.group('quote')}<SECRET>{m.group('quote')}", output)
    output = _replace_keyed(USER_VALUE_RE, output, redactor, "user")
    output = _replace_keyed(SERIAL_VALUE_RE, output, redactor, "serial")
    output = EMAIL_RE.sub(lambda m: redactor.placeholder("email", m.group(0)), output)
    output = MAC_RE.sub(lambda m: redactor.placeholder("mac", m.group(0)), output)
    output = _redact_ipv4(output, redactor, redact_private_ips, redact_public_ips)
    output = IPV6_RE.sub(lambda m: redactor.placeholder("ipv6", m.group(0)), output)
    if redact_hostnames:
        output = _replace_keyed(HOSTNAME_VALUE_RE, output, redactor, "host")
    for name in customer_names or []:
        if name:
            output = re.sub(re.escape(name), redactor.placeholder("customer", name), output, flags=re.IGNORECASE)
    return output


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Redact NetSentinel real device captures before fixture review.")
    parser.add_argument("input", type=Path, help="Raw capture input file. Keep this outside git.")
    parser.add_argument("-o", "--output", type=Path, required=True, help="Redacted output file.")
    parser.add_argument("--redact-private-ips", action="store_true", help="Redact RFC1918/private addresses too.")
    parser.add_argument("--keep-public-ips", action="store_true", help="Do not redact public addresses.")
    parser.add_argument("--redact-hostnames", action="store_true", help="Redact host/devname/sysName/name key values.")
    parser.add_argument("--customer-name", action="append", default=[], help="Customer/site/company literal to redact. Can be repeated.")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    raw = args.input.read_text()
    redacted = redact_text(
        raw,
        redact_private_ips=args.redact_private_ips,
        redact_public_ips=not args.keep_public_ips,
        redact_hostnames=args.redact_hostnames,
        customer_names=args.customer_name,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(redacted)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
