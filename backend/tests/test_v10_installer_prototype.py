import subprocess
from pathlib import Path

import pytest

from app.config import Settings
from app.routers.system import appliance_version


class FakeSession:
    async def scalar(self, _query):
        return "20260507_0006"


@pytest.mark.asyncio
async def test_version_endpoint_returns_build_metadata():
    result = await appliance_version(FakeSession())

    assert result["app_version"]
    assert result["edition"]
    assert result["database_revision"] == "20260507_0006"


def test_production_env_paths_are_configurable():
    settings = Settings(
        environment="production",
        debug=False,
        secret_key="x" * 64,
        edge_agent_tokens="",
        cors_origins=["https://netsentinel.local"],
        backup_dir="/opt/netsentinel/backups",
        reports_dir="/opt/netsentinel/reports",
    )

    assert settings.production_config_errors() == []
    assert settings.backup_dir == "/opt/netsentinel/backups"
    assert settings.reports_dir == "/opt/netsentinel/reports"


def test_appliance_scripts_exist_and_pass_bash_syntax():
    root = Path(__file__).resolve().parents[2]
    scripts = [
        root / "deploy" / "install-netsentinel.sh",
        root / "deploy" / "update-netsentinel.sh",
        root / "deploy" / "uninstall-netsentinel.sh",
        root / "deploy" / "desktop" / "launch-netsentinel.sh",
        root / "deploy" / "live-image" / "build-live-prototype.sh",
        root / "deploy" / "live-image" / "scripts" / "first-boot.sh",
        root / "deploy" / "live-image" / "scripts" / "appliance-status.sh",
        root / "deploy" / "live-image" / "scripts" / "qemu-smoke-test.sh",
        root / "scripts" / "validate_clean_migrations.sh",
        root / "scripts" / "backup.sh",
        root / "scripts" / "restore.sh",
    ]
    for script in scripts:
        assert script.exists()
        assert script.stat().st_mode & 0o111
        subprocess.run(["bash", "-n", str(script)], check=True)


def test_appliance_deployment_files_exist():
    root = Path(__file__).resolve().parents[2]
    for relative in [
        "docker-compose.prod.yml",
        ".env.production.example",
        "deploy/desktop/netsentinel-ai.desktop",
        "deploy/reverse-proxy/nginx.conf.example",
        "deploy/reverse-proxy/Caddyfile.example",
        "docs/INSTALL_APPLIANCE.md",
    ]:
        assert (root / relative).exists()
