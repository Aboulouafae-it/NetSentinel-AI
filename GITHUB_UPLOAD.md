# GitHub Upload Checklist

Use this checklist before pushing NetSentinel AI to GitHub.

## Repository Readiness

- [x] Git repository initialized.
- [x] Main branch is `main`.
- [x] `.gitignore` excludes local dependencies, build outputs, Docker data, and private environment files.
- [x] `.env.example` is committed as the safe configuration template.
- [x] `.env` is not committed.
- [x] README explains project status, setup, services, and desktop launcher.
- [x] INSTALL guide explains Docker and Linux desktop setup.
- [x] SECURITY policy explains local security limitations.

## Before Push

Check status:

```bash
git status
```

Commit any new changes:

```bash
git add .
git commit -m "Update project documentation"
```

Push to GitHub:

```bash
git push
```

If GitHub asks for authentication, use one of these:

- GitHub Desktop,
- Git Credential Manager,
- SSH remote,
- personal access token for HTTPS.

## Current Remote

```text
https://github.com/Aboulouafae-it/NetSentinel-AI.git
```

## Notes

The project is currently a local MVP. It is suitable for portfolio/demo upload, but production deployment needs additional hardening, including secret rotation, TLS, firewall rules, dependency review, and authentication/authorization review.
