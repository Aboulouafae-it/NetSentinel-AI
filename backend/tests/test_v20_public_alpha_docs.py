from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_public_alpha_docs_exist_and_are_honest():
    required = [
        "README.md",
        "CHANGELOG.md",
        "docs/ALPHA_RELEASE_CHECKLIST.md",
        "docs/KNOWN_LIMITATIONS.md",
        "docs/DEMO_WORKFLOW.md",
        "docs/DEPLOYMENT_HARDENING.md",
        "docs/VENDOR_ADAPTERS.md",
        "docs/assets/screenshots/README.md",
        "docs/assets/diagrams/README.md",
        "SECURITY.md",
        "CONTRIBUTING.md",
        "CODE_OF_CONDUCT.md",
        ".github/PULL_REQUEST_TEMPLATE.md",
        ".github/ISSUE_TEMPLATE/bug_report.md",
        ".github/ISSUE_TEMPLATE/feature_request.md",
    ]
    for relative in required:
        assert (ROOT / relative).exists(), relative

    readme = (ROOT / "README.md").read_text().lower()
    limitations = (ROOT / "docs" / "KNOWN_LIMITATIONS.md").read_text().lower()
    changelog = (ROOT / "CHANGELOG.md").read_text().lower()

    assert "public alpha" in readme
    assert "not production-ready" in readme
    assert "v2.0.0-alpha" in changelog
    assert "not production-ready" in limitations
    assert "live iso" in limitations


def test_alpha_checklist_covers_release_verification_gates():
    checklist = (ROOT / "docs" / "ALPHA_RELEASE_CHECKLIST.md").read_text().lower()
    for phrase in [
        "backend tests",
        "backend import",
        "frontend typescript",
        "frontend production build",
        "secret scan",
        "docker compose startup",
        "agent heartbeat",
        "syslog",
        "live image check",
        "backup dry run",
    ]:
        assert phrase in checklist


def test_vendor_matrix_names_alpha_integrations_and_planned_work():
    matrix = (ROOT / "docs" / "VENDOR_ADAPTERS.md").read_text().lower()
    for phrase in [
        "generic snmp",
        "mikrotik routeros",
        "tp-link cpe",
        "ubiquiti airmax",
        "fortinet",
        "cambium",
        "cisco / aruba / juniper",
        "aws / azure / gcp",
        "real capture needed",
    ]:
        assert phrase in matrix


def test_screenshot_placeholders_do_not_claim_real_screenshots():
    screenshots = (ROOT / "docs" / "assets" / "screenshots" / "README.md").read_text().lower()
    diagrams = (ROOT / "docs" / "assets" / "diagrams" / "README.md").read_text().lower()

    assert "real running netsentinel ai app" in screenshots
    assert "do not add fake screenshots" in screenshots
    assert "do not include customer network diagrams" in diagrams
