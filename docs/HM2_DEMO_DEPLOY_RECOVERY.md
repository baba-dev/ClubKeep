# HM2 demo: production visibility and disk-space recovery

## Confirmed failure (2026-11-15)
GitHub commit `6a4a36dfa7680685a62593204d38c35e98ebd40a` passed the main CI and a pinned ARM64 production packaging build, but the automatic deploy job **43748747159** failed at the server activation step:

```text
CLUBKEEP DEPLOY STOP: Less than 5 GiB free disk space
```

This proves **the updated app was not activated by this run**. A GitHub merge/CI success is not an actual production deployment. The old UI visible at `/demo` is consistent with the failed deploy. Do not diagnose it as a browser cache issue before proving the active release SHA.

## Safe operator recovery on the VPS (read-only first)

The VPS also hosts MenuMinute and other workloads. Never run unscoped `rm -rf`, `docker prune`, broad `find -delete` or delete PostgreSQL dumps / restic repositories.

```bash
# 1. Inspect the filesystem and ClubKeep-only artifact footprint.
df -h /
df -i /
sudo du -sh /var/www/clubkeep/releases /var/lib/clubkeep/incoming /var/lib/clubkeep/backups 2>/dev/null
readlink -f /var/www/clubkeep/current
sudo systemctl is-active clubkeep-web menuminute-web menuminute-worker

# 2. Check whether the root-owned ClubKeep-only cleanup helper exists.
sudo test -x /usr/local/sbin/clubkeep-cleanup && \
  sudo /usr/local/sbin/clubkeep-cleanup --dry-run
```

Only after reviewing that dry-run's exact paths and ensuring no needed rollback artifacts are selected:

```bash
sudo /usr/local/sbin/clubkeep-cleanup --apply
df -h /
```

The existing cleanup helper protects the active SHA release, the newest three releases and all releases newer than 14 days. Incoming archives are eligible only if older than seven full days, and backup deletion remains **disabled by default**. The helper never removes files belonging to MenuMinute.

If the cleanup helper is unavailable, or `df -h /` still shows less than ~5 GiB free, **stop and inspect the remaining ClubKeep artifacts manually**. Do not reduce the 5 GiB release safety gate or destroy backups simply to force deployment. Also verify free inodes.

## Redeploy

After freeing enough space, rerun the failed **Deploy ClubKeep VPS** job via GitHub Actions on the same reviewed main SHA, or dispatch the workflow with the current full main SHA if the branch has advanced. The deployment must successfully finish the guarded activation and public HTTPS smoke step. This build/release must not disturb MenuMinute web/worker.

Check afterward:

```bash
readlink -f /var/www/clubkeep/current
sudo systemctl is-active clubkeep-web menuminute-web menuminute-worker
curl -fsSI https://clubkeep.bababuilds.com/demo?role=owner
```

Do not infer the active SHA from the last green CI run or the browser's visible text alone. The main dashboard should expose the HM2 editorial logo, Gym/Yoga/Dance photography and semantic light/dark palette after a successful release.

## Visual follow-up

The legacy demo had a black/orange navigation shell despite partial HM2-C JSX updates. This fix completes its editorial shell, hero and metric-art styling without touching demo simulation semantics. After successful deployment, validate `/demo?role=owner&view=overview&vertical=GYM` and corresponding YOGA/DANCE presets in both light and dark modes at 390px, 768px and desktop; check all five roles and accessible keyboard navigation.
