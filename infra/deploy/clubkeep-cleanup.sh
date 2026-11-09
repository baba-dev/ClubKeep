#!/usr/bin/env bash
# ClubKeep-only, fail-closed artifact cleanup. Never delete MenuMinute data.
# Installed root-owned; systemd timer invokes --apply.
set -Eeuo pipefail
umask 077

usage() { echo "Usage: clubkeep-cleanup [--dry-run|--apply]" >&2; exit 2; }
mode="${1:---dry-run}"
[[ "$#" -le 1 ]] || usage
[[ "$mode" == "--dry-run" || "$mode" == "--apply" ]] || usage
if [[ "$mode" == "--apply" && "$EUID" -ne 0 ]]; then
  echo "Apply requires root via the dedicated systemd cleanup service" >&2
  exit 1
fi

readonly ROOT=/var/www/clubkeep
readonly RELEASES="$ROOT/releases"
readonly CURRENT="$ROOT/current"
readonly INCOMING=/var/lib/clubkeep/incoming
readonly BACKUPS=/var/lib/clubkeep/backups
readonly PRUNE_MARKER=/etc/clubkeep/enable-backup-pruning-after-restore-drill
readonly RELEASE_MIN_AGE_DAYS=14
readonly ARCHIVE_MIN_AGE_DAYS=7
readonly BACKUP_MIN_AGE_DAYS=30
readonly KEEP_RELEASES=3
readonly KEEP_BACKUPS=14

# Never race production deployment. Do not block releases waiting for cleanup.
exec 9>/run/lock/clubkeep-release.lock
if ! flock -n 9; then
  echo "ClubKeep deployment active: skipping cleanup"
  exit 0
fi

[[ -d "$RELEASES" && -d "$INCOMING" && -L "$CURRENT" ]] || {
  echo "ClubKeep release layout missing; refusing cleanup" >&2
  exit 1
}
[[ ! -L "$RELEASES" && ! -L "$INCOMING" && ! -L "$BACKUPS" ]] || {
  echo "Symlinked cleanup root detected; refusing cleanup" >&2
  exit 1
}
active="$(readlink -f "$CURRENT")"
[[ "$active" =~ ^/var/www/clubkeep/releases/[0-9a-f]{40}$ &&
   -d "$active" && ! -L "$active" ]] || {
  echo "Current release is not an exact valid ClubKeep SHA directory" >&2
  exit 1
}
echo "ClubKeep cleanup mode: $mode (active release protected)"

remove_path() {
  local kind="$1" path="$2"
  echo "  $kind: $path"
  if [[ "$mode" == "--apply" ]]; then
    if [[ "$kind" == release ]]; then
      # Safely limit deletion to a single validated immediate child directory.
      [[ "$path" =~ ^/var/www/clubkeep/releases/[0-9a-f]{40}$ &&
         "$path" != "$active" && -d "$path" && ! -L "$path" ]] || exit 1
      mountpoint -q "$path" && { echo "Mountpoint found; refusing" >&2; exit 1; }
      rm -rf --one-file-system -- "$path"
    else
      [[ -f "$path" && ! -L "$path" ]] || exit 1
      rm -f -- "$path"
    fi
  fi
}

# Incoming: delete only exact release archive filenames and only after 7+ days.
# Unknown files, upload-in-progress names and symlinks remain untouched.
echo "Eligible incoming archives:"
while IFS= read -r -d '' path; do
  [[ "$path" =~ ^/var/lib/clubkeep/incoming/clubkeep-[0-9a-f]{40}-linux-arm64\.tar\.gz$ ]] || continue
  remove_path archive "$path"
done < <(find "$INCOMING" -mindepth 1 -maxdepth 1 -type f -mtime +7 -print0)

# Releases: always keep current + the 3 newest SHA releases, and never remove
# anything newer than 14 days. Non-SHA directories are excluded by design.
declare -a releases=()
while IFS= read -r candidate; do
  [[ "$candidate" =~ ^/var/www/clubkeep/releases/[0-9a-f]{40}$ ]] || continue
  releases+=("$candidate")
done < <(find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' |
  sort -nr | cut -d' ' -f2-)
now="$(date -u +%s)"
echo "Eligible expired releases (newest $KEEP_RELEASES and current protected):"
for ((i=KEEP_RELEASES; i<${#releases[@]}; i++)); do
  path="${releases[$i]}"
  [[ "$path" != "$active" ]] || continue
  # Never follow symlinks, paths to unexpected filesystems, or directories
  # made recently during a deploy.
  [[ -d "$path" && ! -L "$path" ]] || continue
  stamp="$(stat -c %Y "$path")"
  if (( now - stamp > RELEASE_MIN_AGE_DAYS * 86400 )); then
    remove_path release "$path"
  fi
done

# Backups: default KEEP ALL until the operator has confirmed and documented
# an off-server restic restore drill. Marker must be root-owned and 0600/0400.
# Even with opt-in, preserve 14 newest backup files and all backups <=30 days.
if [[ -d "$BACKUPS" ]]; then
  if [[ -f "$PRUNE_MARKER" && ! -L "$PRUNE_MARKER" &&
        "$(stat -c %u "$PRUNE_MARKER")" == 0 &&
        "$(stat -c %a "$PRUNE_MARKER")" =~ ^(400|600)$ ]] &&
     grep -Fxq 'VERIFIED_OFFSITE_RESTORE_AND_APPROVED_30_DAY_RETENTION' "$PRUNE_MARKER"; then
    declare -a backups=()
    while IFS= read -r path; do
      [[ "$path" =~ ^/var/lib/clubkeep/backups/clubkeep-[0-9]{8}T[0-9]{6}Z-[0-9a-f]{40}\.dump$ ]] || continue
      backups+=("$path")
    done < <(find "$BACKUPS" -mindepth 1 -maxdepth 1 -type f -printf '%T@ %p\n' |
      sort -nr | cut -d' ' -f2-)
    echo "Eligible older backups (newest $KEEP_BACKUPS protected):"
    for ((i=KEEP_BACKUPS; i<${#backups[@]}; i++)); do
      path="${backups[$i]}"
      [[ -f "$path" && ! -L "$path" ]] || continue
      stamp="$(stat -c %Y "$path")"
      if (( now - stamp > BACKUP_MIN_AGE_DAYS * 86400 )); then
        remove_path backup "$path"
      fi
    done
  else
    echo "Backup deletion disabled: no verified root-owned restore-drill marker"
  fi
fi

available_kb="$(df -Pk / | awk 'NR==2 {print $4}')"
if (( available_kb < 8 * 1024 * 1024 )); then
  echo "WARNING: root filesystem has less than 8 GiB available" >&2
fi
echo "ClubKeep cleanup completed ($mode)"
