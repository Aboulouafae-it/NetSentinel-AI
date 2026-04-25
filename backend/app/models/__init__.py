"""
NetSentinel AI — Models Package

Import all models here so Alembic and the app can discover them.
"""

from app.models.base import Base
from app.models.user import User
from app.models.organization import Organization
from app.models.site import Site
from app.models.asset import Asset, AssetType, AssetStatus
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.incident import Incident, IncidentSeverity, IncidentStatus
from app.models.log import LogEntry, LogLevel
from app.models.security import DetectionRule, IndicatorOfCompromise
from app.models.automation import PlaybookRule, ActionType, ResponseAction
from app.models.discovery import DiscoveredHost, DiscoveryScan, HostReachability, ScanStatus
from app.models.field_measurement import FieldMeasurement, LinkStatus
from app.models.radio_device import RadioDevice, DeviceVendor, AdapterType, RadioDeviceRole
from app.models.wireless import (
    AntennaProfile,
    PhysicalMount,
    RadioInterface,
    WirelessLink, 
    WirelessLinkStatus,
    WirelessMetric,
    FieldDiagnostic,
    DiagnosticType,
    MaintenanceLog
)

__all__ = [
    "Base",
    "User",
    "Organization",
    "Site",
    "Asset",
    "AssetType",
    "AssetStatus",
    "Alert",
    "AlertSeverity",
    "AlertStatus",
    "Incident",
    "IncidentSeverity",
    "IncidentStatus",
    "AntennaProfile",
    "PhysicalMount",
    "RadioInterface",
    "WirelessLink",
    "WirelessLinkStatus",
    "WirelessMetric",
    "FieldDiagnostic",
    "DiagnosticType",
    "MaintenanceLog",
    "LogEntry",
    "LogLevel",
    "DetectionRule",
    "IndicatorOfCompromise",
    "PlaybookRule",
    "ActionType",
    "ResponseAction",
    "DiscoveredHost",
    "DiscoveryScan",
    "HostReachability",
    "ScanStatus",
    "FieldMeasurement",
    "LinkStatus",
    "RadioDevice",
    "DeviceVendor",
    "AdapterType",
    "RadioDeviceRole",
]
