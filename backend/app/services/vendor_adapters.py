"""Adapter selection and normalized wireless diagnostics."""

from types import SimpleNamespace

from app.adapters import CambiumAdapter, DeviceAdapter, GenericSnmpRadioAdapter, MikroTikRouterOSAdapter, TPLinkCpeAdapter, UbiquitiAirMaxAdapter
from app.adapters.base import WirelessMetricsSnapshot
from app.models.credential import CredentialProfile, CredentialType
from app.models.radio_device import AdapterType, DeviceVendor, RadioDevice
from app.services.wireless_health import diagnose_wireless_measurement


def value(item) -> str:
    return item.value if hasattr(item, "value") else str(item)


def select_adapter(radio: RadioDevice, credential: CredentialProfile | None = None, poller=None) -> DeviceAdapter:
    adapter_type = value(getattr(radio, "adapter_type", AdapterType.MANUAL_ONLY))
    vendor = value(getattr(radio, "vendor", DeviceVendor.OTHER))

    if credential and credential.credential_type == CredentialType.ROUTEROS:
        config = credential.config or {}
        return MikroTikRouterOSAdapter(
            host=radio.ip_address,
            username=credential.username,
            password=credential.secret_material,
            port=int(config.get("port", 8728)),
            use_tls=bool(config.get("use_tls", False)),
            client_factory=poller,
        ) if poller else MikroTikRouterOSAdapter(
            host=radio.ip_address,
            username=credential.username,
            password=credential.secret_material,
            port=int(config.get("port", 8728)),
            use_tls=bool(config.get("use_tls", False)),
        )
    if (vendor == DeviceVendor.UBIQUITI.value or adapter_type in {AdapterType.UISP_API.value, AdapterType.UBIQUITI_AIRMAX.value}) and credential and credential.credential_type == CredentialType.SNMP_V2C:
        return UbiquitiAirMaxAdapter(radio.ip_address, credential.secret_material, poller=poller) if poller else UbiquitiAirMaxAdapter(radio.ip_address, credential.secret_material)
    if (vendor == DeviceVendor.TPLINK.value or adapter_type == AdapterType.TPLINK_CPE.value) and credential and credential.credential_type == CredentialType.SNMP_V2C:
        return TPLinkCpeAdapter(radio.ip_address, credential.secret_material, poller=poller) if poller else TPLinkCpeAdapter(radio.ip_address, credential.secret_material)
    if credential and credential.credential_type == CredentialType.SNMP_V2C:
        return GenericSnmpRadioAdapter(radio.ip_address, credential.secret_material, poller=poller) if poller else GenericSnmpRadioAdapter(radio.ip_address, credential.secret_material)
    if adapter_type == AdapterType.SNMP_V2C.value:
        community = credential.secret_material if credential else None
        return GenericSnmpRadioAdapter(radio.ip_address, community, poller=poller) if poller else GenericSnmpRadioAdapter(radio.ip_address, community)
    if adapter_type == "generic_snmp":
        community = credential.secret_material if credential else None
        return GenericSnmpRadioAdapter(radio.ip_address, community, poller=poller) if poller else GenericSnmpRadioAdapter(radio.ip_address, community)
    if vendor == DeviceVendor.MIKROTIK.value or adapter_type in {AdapterType.SSH_ROUTEROS.value, AdapterType.MIKROTIK_ROUTEROS.value}:
        config = credential.config if credential else {}
        return MikroTikRouterOSAdapter(
            host=radio.ip_address,
            username=credential.username if credential else None,
            password=credential.secret_material if credential else None,
            port=int((config or {}).get("port", 8728)),
            use_tls=bool((config or {}).get("use_tls", False)),
            client_factory=poller,
        ) if poller else MikroTikRouterOSAdapter(
            host=radio.ip_address,
            username=credential.username if credential else None,
            password=credential.secret_material if credential else None,
            port=int((config or {}).get("port", 8728)),
            use_tls=bool((config or {}).get("use_tls", False)),
        )
    if vendor == DeviceVendor.UBIQUITI.value or adapter_type in {AdapterType.UISP_API.value, AdapterType.UBIQUITI_AIRMAX.value}:
        community = credential.secret_material if credential and credential.credential_type == CredentialType.SNMP_V2C else None
        return UbiquitiAirMaxAdapter(radio.ip_address, community, poller=poller) if poller else UbiquitiAirMaxAdapter(radio.ip_address, community)
    if vendor == DeviceVendor.TPLINK.value or adapter_type == AdapterType.TPLINK_CPE.value:
        community = credential.secret_material if credential and credential.credential_type == CredentialType.SNMP_V2C else None
        return TPLinkCpeAdapter(radio.ip_address, community, poller=poller) if poller else TPLinkCpeAdapter(radio.ip_address, community)
    if vendor == DeviceVendor.CAMBIUM.value:
        return CambiumAdapter()
    return GenericSnmpRadioAdapter(radio.ip_address, None, poller=poller) if poller else GenericSnmpRadioAdapter(radio.ip_address, None)


def diagnose_wireless_snapshot(snapshot: WirelessMetricsSnapshot):
    if not snapshot.has_enough_rf:
        return {
            "partial": True,
            "health_score": None,
            "status": "Partial",
            "severity": "info",
            "likely_root_cause": "Insufficient RF metrics from adapter.",
            "recommended_actions": ["Add vendor-specific credentials or collect a manual field measurement for RSSI/SNR/noise/CCQ."],
            "evidence": [f"Missing fields: {', '.join(snapshot.missing_fields)}"],
        }
    measurement = SimpleNamespace(
        rssi_dbm=snapshot.rssi_dbm,
        snr_db=snapshot.snr_db,
        noise_floor_dbm=snapshot.noise_floor_dbm,
        ccq_percent=snapshot.ccq_percent,
        packet_loss_percent=snapshot.packet_loss_percent,
        latency_ms=snapshot.latency_ms,
        tx_capacity_mbps=snapshot.tx_rate_mbps,
        rx_capacity_mbps=snapshot.rx_rate_mbps,
    )
    result = diagnose_wireless_measurement(measurement)
    return {"partial": False, **result.as_dict()}
