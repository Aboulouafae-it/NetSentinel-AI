# NetSentinel AI Appliance Payload Placeholder

The live image prototype reserves `/opt/netsentinel` for the installed
application payload.

For prototype builds, copy a release checkout or release archive into this path
before first boot, then run:

```bash
sudo /opt/netsentinel/deploy/install-netsentinel.sh
```

Do not bake `.env.production`, database dumps, customer captures, tokens, or
private credentials into the image.
