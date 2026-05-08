import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
LIVE = ROOT / "deploy" / "live-image"


def test_live_image_structure_exists():
    for relative in [
        "README.md",
        "auto/config",
        "package-lists/netsentinel.list.chroot",
        "includes.chroot/opt/netsentinel/README.md",
        "includes.chroot/etc/issue",
        "includes.chroot/etc/motd",
        "hooks/normal/010-netsentinel-branding.hook.chroot",
        "scripts/first-boot.sh",
        "scripts/appliance-status.sh",
        "scripts/qemu-smoke-test.sh",
        "build-live-prototype.sh",
    ]:
        assert (LIVE / relative).exists(), relative


def test_live_image_scripts_pass_bash_syntax():
    for relative in [
        "auto/config",
        "hooks/normal/010-netsentinel-branding.hook.chroot",
        "scripts/first-boot.sh",
        "scripts/appliance-status.sh",
        "scripts/qemu-smoke-test.sh",
        "build-live-prototype.sh",
    ]:
        subprocess.run(["bash", "-n", str(LIVE / relative)], check=True)


def test_live_image_package_list_includes_required_network_tools():
    packages = {
        line.strip()
        for line in (LIVE / "package-lists" / "netsentinel.list.chroot").read_text().splitlines()
        if line.strip() and not line.strip().startswith("#")
    }
    required = {
        "docker.io",
        "docker-compose-plugin",
        "git",
        "curl",
        "jq",
        "ca-certificates",
        "openssl",
        "systemd",
        "network-manager",
        "nmap",
        "fping",
        "arp-scan",
        "snmp",
        "tcpdump",
        "iperf3",
        "mtr",
        "traceroute",
        "dnsutils",
        "whois",
        "ethtool",
        "lldpd",
        "rsyslog",
        "chrony",
    }
    assert required <= packages


def test_live_appliance_docs_warn_no_secrets_in_iso():
    docs = (ROOT / "docs" / "LIVE_APPLIANCE_IMAGE.md").read_text().lower()
    readme = (LIVE / "README.md").read_text().lower()
    vm_plan = (ROOT / "docs" / "LIVE_IMAGE_VM_TEST_PLAN.md").read_text().lower()

    assert "no secrets baked into iso" in docs
    assert "no real `.env.production` baked into iso" in docs
    assert "no customer captures" in docs
    assert "qemu" in vm_plan
    assert "virtualbox" in vm_plan
    assert "vmware" in vm_plan
    assert "no secrets" in readme


def test_live_image_references_existing_installer_and_compose():
    first_boot = (LIVE / "scripts" / "first-boot.sh").read_text()
    build_script = (LIVE / "build-live-prototype.sh").read_text()

    assert "deploy/install-netsentinel.sh" in first_boot
    assert "docker-compose.prod.yml" in first_boot
    assert "deploy/install-netsentinel.sh" in build_script
    assert "docker-compose.prod.yml" in build_script


def test_live_image_build_script_help_and_check_only_work_without_live_build():
    help_result = subprocess.run([str(LIVE / "build-live-prototype.sh"), "--help"], check=True, text=True, capture_output=True)
    assert "--check-only" in help_result.stdout
    assert "--build" in help_result.stdout
    assert "--clean" in help_result.stdout

    check_result = subprocess.run([str(LIVE / "build-live-prototype.sh"), "--check-only"], check=True, text=True, capture_output=True)
    assert "Prototype validation passed" in check_result.stdout


def test_live_image_secret_exclusion_policy_is_represented_and_current_tree_clean():
    build_script = (LIVE / "build-live-prototype.sh").read_text()
    for token in [".env.production", "*.pem", "*.key", "*.token", "*.secret", "*.dump", "*.sqlite", "*.db"]:
        assert token in build_script

    forbidden_suffixes = {".pem", ".key", ".token", ".secret", ".dump", ".sqlite", ".db"}
    for path in (LIVE / "includes.chroot").rglob("*"):
        assert path.suffix not in forbidden_suffixes
        assert path.name not in {".env", ".env.production"}
