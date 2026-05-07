"""Generic read-only SNMP v2c polling adapter.

MVP implementation shells out to net-snmp commands when present. Tests inject
a runner so no real network device or secret is required.
"""

import asyncio
from dataclasses import dataclass


OID_SYS_DESCR = "1.3.6.1.2.1.1.1.0"
OID_SYS_UPTIME = "1.3.6.1.2.1.1.3.0"
OID_SYS_NAME = "1.3.6.1.2.1.1.5.0"
OID_IF_DESCR = "1.3.6.1.2.1.2.2.1.2"
OID_IF_IN_OCTETS = "1.3.6.1.2.1.2.2.1.10"
OID_IF_IN_ERRORS = "1.3.6.1.2.1.2.2.1.14"
OID_IF_OPER_STATUS = "1.3.6.1.2.1.2.2.1.8"
OID_IF_OUT_OCTETS = "1.3.6.1.2.1.2.2.1.16"
OID_IF_OUT_ERRORS = "1.3.6.1.2.1.2.2.1.20"


@dataclass(frozen=True)
class SnmpPollResult:
    ok: bool
    data: dict
    error: str | None = None


async def default_runner(args: list[str], timeout: int) -> tuple[int, str, str]:
    proc = await asyncio.create_subprocess_exec(*args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    return proc.returncode, stdout.decode(errors="replace"), stderr.decode(errors="replace")


def _parse_value(output: str) -> str | None:
    if "=" not in output:
        return output.strip() or None
    return output.split("=", 1)[1].strip().split(":", 1)[-1].strip().strip('"') or None


def _parse_walk(output: str) -> list[str]:
    return [value for line in output.splitlines() if (value := _parse_value(line))]


async def poll_snmp_v2c(ip_address: str, community: str, timeout: int = 3, runner=default_runner) -> SnmpPollResult:
    if not community:
        return SnmpPollResult(False, {}, "Missing SNMP community")
    base = ["-v2c", "-c", community, "-t", str(timeout), "-r", "0", ip_address]
    try:
        values: dict = {}
        for key, oid in {"sysDescr": OID_SYS_DESCR, "sysUpTime": OID_SYS_UPTIME, "sysName": OID_SYS_NAME}.items():
            code, stdout, stderr = await runner(["snmpget", *base, oid], timeout)
            if code != 0:
                return SnmpPollResult(False, {}, stderr.strip() or "SNMP get failed")
            values[key] = _parse_value(stdout)
        for key, oid in {
            "interface_names": OID_IF_DESCR,
            "interface_status": OID_IF_OPER_STATUS,
            "interface_in_octets": OID_IF_IN_OCTETS,
            "interface_out_octets": OID_IF_OUT_OCTETS,
            "interface_in_errors": OID_IF_IN_ERRORS,
            "interface_out_errors": OID_IF_OUT_ERRORS,
        }.items():
            code, stdout, stderr = await runner(["snmpwalk", *base, oid], timeout)
            if code == 0:
                values[key] = _parse_walk(stdout)
        return SnmpPollResult(True, values)
    except FileNotFoundError:
        return SnmpPollResult(False, {}, "net-snmp commands are not installed")
    except asyncio.TimeoutError:
        return SnmpPollResult(False, {}, "SNMP polling timed out")
