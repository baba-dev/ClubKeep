#!/usr/bin/env bash
# Inspect a ClubKeep-only pg_dump archive, or prove that it restores into a
# newly created, access-restricted, disposable PostgreSQL 17 database.
# Never restores over any existing database or modifies the production schema.
set -Eeuo pipefail
umask 077

usage() {
  echo "Usage: sudo clubkeep-restore-drill --inspect|--execute /var/lib/clubkeep/backups/clubkeep-YYYYMMDDTHHMMSSZ-SHA.dump [--port 5432]" >&2
  exit 2
}
die() { echo "CLUBKEEP RESTORE DRILL: $*" >&2; exit 1; }

(( EUID == 0 )) || die "Run as root to read protected ClubKeep backups"
(( $# == 2 || $# == 4 )) || usage
mode="$1"
archive="$2"
shift 2
[[ "$mode" == "--inspect" || "$mode" == "--execute" ]] || usage
port=5432
if (( $# == 2 )); then
  [[ "$1" == "--port" && "$2" =~ ^[0-9]{1,5}$ ]] || usage
  port="$2"
fi
(( 10#$port >= 1 && 10#$port <= 65535 )) || die "Invalid PostgreSQL port"

readonly BACKUPS=/var/lib/clubkeep/backups
readonly PG_BIN=/usr/lib/postgresql/17/bin
for cmd in pg_restore pg_isready psql createdb dropdb; do
  [[ -x "$PG_BIN/$cmd" ]] || die "PostgreSQL 17 client missing: $cmd"
done
[[ ! -L "$BACKUPS" && -d "$BACKUPS" &&
    "$(readlink -f "$BACKUPS")" == "$BACKUPS" ]] ||
    die "Expected physical ClubKeep backup directory"
[[ "$archive" =~ ^/var/lib/clubkeep/backups/clubkeep-[0-9]{8}T[0-9]{6}Z-[0-9a-f]{40}[.]dump$ ]] ||
    die "Archive must be a named ClubKeep release backup"
[[ -f "$archive" && ! -L "$archive" && "$(stat -c %u "$archive")" == 0 &&
    "$(stat -c %a "$archive")" =~ ^(400|600)$ ]] ||
    die "Archive must be a root-owned regular 0400/0600 file"
[[ "$(head -c 5 -- "$archive")" == PGDMP ]] || die "Not a PostgreSQL custom-format archive"
[[ "$(stat -c %s "$archive")" -gt 512 ]] || die "Archive is suspiciously small"
"$PG_BIN/pg_restore" --list "$archive" >/dev/null || die "pg_restore cannot read the archive TOC"
echo "ClubKeep archive verified: $(basename "$archive")"
echo "Size: $(stat -c %s "$archive") bytes"
sha256sum "$archive" | awk '{print "SHA256:", $1}'

if [[ "$mode" == --inspect ]]; then
  echo "Inspection only: no database created and no rows restored"
  exit 0
fi

# Use a separate lock from the live deploy path: a restore drill must never
# lock/restart/modify ClubKeep production or MenuMinute. Two drills cannot race.
exec 9>/run/lock/clubkeep-restore-drill.lock
flock -n 9 || die "Another restore drill is running"

command -v runuser >/dev/null || die "runuser is required"
"$PG_BIN/pg_isready" -q -h /var/run/postgresql -p "$port" || die "Local PostgreSQL is unavailable"
major="$(runuser -u postgres -- "$PG_BIN/psql" -p "$port" -d postgres -Atqc 'SHOW server_version_num')"
[[ "$major" =~ ^17[0-9]{4}$ ]] || die "The drill requires local PostgreSQL 17"

# Fixed-format server-generated scratch name. It can never match production
# database 'clubkeep' or any MenuMinute database name.
scratch="clubkeep_drill_$(date -u +%Y%m%d%H%M%S)_$$"
[[ "$scratch" =~ ^clubkeep_drill_[0-9]{14}_[0-9]+$ ]] ||
    die "Invalid disposable database name"
created=0
cleanup() {
  local result="$?"
  trap - EXIT
  if (( created == 1 )); then
    echo "Removing disposable drill database $scratch"
    if ! runuser -u postgres -- "$PG_BIN/dropdb" -p "$port" --if-exists --force "$scratch"; then
      echo "WARNING: disposable drill DB $scratch needs operator inspection" >&2
      result=1
    fi
  fi
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Fail if a name collision occurs; never take ownership of an existing DB.
existing="$(runuser -u postgres -- "$PG_BIN/psql" -p "$port" -d postgres -Atqc "SELECT count(*) FROM pg_database WHERE datname = '$scratch'")"
[[ "$existing" == 0 ]] || die "Disposable database already exists"
runuser -u postgres -- "$PG_BIN/createdb" -p "$port" --owner=postgres --template=template0 --encoding=UTF8 "$scratch"
created=1
runuser -u postgres -- "$PG_BIN/psql" -p "$port" -d postgres -v ON_ERROR_STOP=1 \
  -c "REVOKE CONNECT, TEMPORARY ON DATABASE \"$scratch\" FROM PUBLIC" >/dev/null

# The file stays root-readable only. PostgreSQL receives it on stdin, so
# its service account never needs permissions to the protected backup folder.
echo "Restoring into isolated scratch database (no production DB connections)"
runuser -u postgres -- "$PG_BIN/pg_restore" -p "$port" --dbname="$scratch" \
  --no-owner --no-acl --single-transaction --exit-on-error < "$archive"

# Verify the immutable baseline + identity tables, migration history and
# absence of unresolved failed migration entries, without printing user data.
structure="$(runuser -u postgres -- "$PG_BIN/psql" -p "$port" -d "$scratch" -Atq <<'SQL'
SELECT CASE WHEN
  to_regclass('public.user') IS NOT NULL AND
  to_regclass('public."Club"') IS NOT NULL AND
  to_regclass('public."ClubMembership"') IS NOT NULL AND
  to_regclass('public."ClubInvite"') IS NOT NULL AND
  to_regclass('public."PersonalProfile"') IS NOT NULL AND
  to_regclass('public._prisma_migrations') IS NOT NULL
THEN 1 ELSE 0 END;
SQL
)"
[[ "$structure" == 1 ]] || die "Required ClubKeep identity/tenant tables missing"
bad_migrations="$(runuser -u postgres -- "$PG_BIN/psql" -p "$port" -d "$scratch" -Atqc '
  SELECT count(*) FROM public._prisma_migrations
  WHERE finished_at IS NULL AND rolled_back_at IS NULL
')"
[[ "$bad_migrations" == 0 ]] || die "Archive includes an unresolved failed migration"
counts="$(runuser -u postgres -- "$PG_BIN/psql" -p "$port" -d "$scratch" -AtF / -c '
  SELECT
    (SELECT count(*) FROM public."user"),
    (SELECT count(*) FROM public."Club"),
    (SELECT count(*) FROM public._prisma_migrations
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)
')"
echo "Restored row counts (global users / clubs / applied migrations): $counts"
echo "ClubKeep restore rehearsal PASSED; no application services were stopped"
