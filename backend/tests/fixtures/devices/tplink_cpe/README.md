# TP-Link CPE Fixtures

Use ping and read-only SNMP walks when possible. Do not scrape web interfaces unless that transport is explicitly isolated and disabled by default.

The included CPE710-style examples are synthetic. Basic SNMP fixtures intentionally omit RF metrics so tests can prove the adapter does not fake RSSI/SNR/noise. The wireless fixture uses explicit TP-Link-style normalized keys only.
