#!/usr/bin/env bash
# Operator billing tools for the ClubKeep-only database (B8-3). Root-only, pure SQL.
#
#   list                              clubs with a tier, and where that tier comes from
#   grant   --club ID|SLUG --tier T --reason TEXT    hand a complimentary paid tier (pilot clubs)
#   revoke  --club ID|SLUG --reason TEXT             take a complimentary tier back to FREE
#   reconcile                         write each subscribed club's entitled tier (grace/period end)
#
# grant, revoke and reconcile are DRY RUNS unless --execute is given: they run in a
# transaction that is rolled back and print exactly what would change.
# Never touches MenuMinute, never deletes anything, never edits a club that has a
# paid subscription (grant/revoke), and never changes a club without one (reconcile).
set -Eeuo pipefail
umask 077

usage() {
  cat >&2 <<'USAGE'
Usage: sudo clubkeep-billing-ops <command> [options]
  list
  grant   --club ID_OR_SLUG --tier STARTER|GROWTH|PRO --reason TEXT [--execute]
  revoke  --club ID_OR_SLUG --reason TEXT [--execute]
  reconcile [--execute]
Common: [--db clubkeep] [--port 5432]
USAGE
  exit 2
}
die() { echo "CLUBKEEP BILLING OPS: $*" >&2; exit 1; }

(( EUID == 0 )) || die "Run as root (it reads the protected ClubKeep database as the postgres user)"
(( $# >= 1 )) || usage
command_name="$1"
shift
[[ "$command_name" =~ ^(list|grant|revoke|reconcile)$ ]] || usage

club="" tier="" reason="" db="clubkeep" port=5432 execute=0
declare -A seen=()
while (( $# > 0 )); do
  # A repeated flag is almost always a mistake; never let a later one silently win.
  [[ -z "${seen[$1]:-}" ]] || usage
  seen["$1"]=1
  case "$1" in
    --execute) execute=1; shift ;;
    --club|--tier|--reason|--db|--port)
      (( $# >= 2 )) || usage
      case "$1" in
        --club) club="$2" ;;
        --tier) tier="$2" ;;
        --reason) reason="$2" ;;
        --db) db="$2" ;;
        --port) port="$2" ;;
      esac
      shift 2 ;;
    *) usage ;;
  esac
done

[[ "$db" =~ ^clubkeep(_[a-z0-9_]+)?$ ]] || die "Database name must be explicitly scoped to ClubKeep"
[[ "$port" =~ ^[0-9]{1,5}$ ]] && (( 10#$port >= 1 && 10#$port <= 65535 )) || die "Invalid PostgreSQL port"
port=$((10#$port))

# Strict input validation: values reach SQL only as psql-quoted variables, but
# reject anything unexpected first so mistakes fail loudly.
need_club() { [[ "$club" =~ ^[a-z0-9][a-z0-9_-]{2,80}$ ]] || die "--club must be a club id or slug"; }
need_reason() {
  [[ "$reason" =~ ^[[:print:]]{3,160}$ ]] || die "--reason must be 3 to 160 printable characters"
}
case "$command_name" in
  list|reconcile) [[ -z "$club$tier$reason" ]] || usage ;;
  grant)
    need_club; need_reason
    [[ "$tier" =~ ^(STARTER|GROWTH|PRO)$ ]] || die "--tier must be STARTER, GROWTH or PRO" ;;
  revoke)
    need_club; need_reason
    [[ -z "$tier" ]] || usage ;;
esac
if [[ "$command_name" == list ]] && (( execute )); then usage; fi

readonly PG_BIN=/usr/lib/postgresql/17/bin
[[ -x "$PG_BIN/psql" ]] || die "PostgreSQL 17 client missing"
command -v runuser >/dev/null || die "runuser is required"
"$PG_BIN/pg_isready" -q -h /var/run/postgresql -p "$port" || die "Local PostgreSQL is unavailable"

psqlc() {
  runuser -u postgres -- "$PG_BIN/psql" -X -q -At -F '|' -p "$port" -d "$db" -v ON_ERROR_STOP=1 "$@"
}

# Refuse a database that is not ClubKeep's, or that lacks the B8 migration.
shape="$(psqlc -c "SELECT current_database() || '|' || (to_regclass('\"ClubSubscription\"') IS NOT NULL)::text || '|' || (to_regclass('\"SecurityEvent\"') IS NOT NULL)::text")" ||
  die "Cannot read database $db"
[[ "$shape" == "$db|true|true" ]] || die "Database $db is not a ClubKeep database with the B8 migration applied; nothing was changed"

# ROLLBACK for a dry run, COMMIT only with --execute.
if (( execute )); then finish="COMMIT"; mode_label="APPLIED"; else finish="ROLLBACK"; mode_label="DRY RUN (nothing changed; add --execute to apply)"; fi

actor="${SUDO_USER:-root}"
[[ "$actor" =~ ^[a-z_][a-z0-9_-]{0,31}$ ]] || actor="operator"

case "$command_name" in
list)
  echo "club_id|slug|stored_tier|source|subscription_status|period_end_utc|past_due_since_utc"
  psqlc <<'SQL'
SELECT c.id, c.slug, c."businessTier"::text,
  CASE WHEN s."clubId" IS NOT NULL THEN 'subscription'
       WHEN c."businessTier" <> 'FREE' THEN 'complimentary'
       ELSE 'free' END,
  COALESCE(s.status::text, '-'),
  COALESCE(to_char(s."currentPeriodEnd", 'YYYY-MM-DD HH24:MI'), '-'),
  COALESCE(to_char(s."pastDueSince", 'YYYY-MM-DD HH24:MI'), '-')
FROM "Club" c LEFT JOIN "ClubSubscription" s ON s."clubId" = c.id
WHERE c."businessTier" <> 'FREE' OR s."clubId" IS NOT NULL
ORDER BY c."createdAt", c.id;
SQL
  ;;

grant|revoke)
  if [[ "$command_name" == grant ]]; then
    new_tier="$tier"; event_kind="operator-grant"
  else
    new_tier="FREE"; event_kind="operator-revoke"
  fi
  ref="${event_kind}:${new_tier}:by=${actor}:${reason}"
  ref="${ref:0:200}"
  out="$(psqlc -v club="$club" -v tier="$new_tier" -v ref="$ref" <<SQL
BEGIN;
WITH target AS (
  SELECT c.id, c."businessTier" AS before,
    CASE WHEN c.status <> 'ACTIVE' THEN 'INACTIVE'
         WHEN EXISTS (SELECT 1 FROM "ClubSubscription" s WHERE s."clubId" = c.id) THEN 'HAS_SUBSCRIPTION'
         WHEN c."businessTier" = :'tier'::"BusinessTier" THEN 'UNCHANGED'
         ELSE 'OK' END AS state
  FROM "Club" c
  WHERE c.id = :'club' OR c.slug = :'club'
  FOR UPDATE OF c
), upd AS (
  UPDATE "Club" c SET "businessTier" = :'tier'::"BusinessTier", "updatedAt" = (NOW() AT TIME ZONE 'UTC')
  FROM target t WHERE c.id = t.id AND t.state = 'OK'
  RETURNING c.id
), ev AS (
  INSERT INTO "SecurityEvent" ("id", "clubId", "eventType", "referenceId")
  SELECT gen_random_uuid()::text, id, 'BILLING_TIER_CHANGED', :'ref' FROM upd
  RETURNING 1
)
SELECT COALESCE((SELECT state FROM target), 'NOT_FOUND'),
       COALESCE((SELECT id FROM target), ''),
       COALESCE((SELECT before::text FROM target), ''),
       (SELECT count(*) FROM ev);
$finish;
SQL
)" || die "The change failed and was rolled back (ambiguous club id or slug?)"
  IFS='|' read -r state club_id before audited <<<"$out"
  case "$state" in
    NOT_FOUND) die "No such club: nothing changed" ;;
    INACTIVE) die "Club $club_id is not ACTIVE: nothing changed" ;;
    HAS_SUBSCRIPTION) die "Club $club_id has a paid subscription; its tier is managed by billing. Nothing changed" ;;
    UNCHANGED) echo "Club $club_id is already $new_tier: nothing to do" ;;
    OK) echo "$mode_label: club $club_id $before -> $new_tier (audit rows: $audited)" ;;
    *) die "Unexpected result: nothing was committed" ;;
  esac
  ;;

reconcile)
  ref="operator-reconcile:by=${actor}"
  out="$(psqlc -v ref="$ref" <<SQL
BEGIN;
WITH facts AS (
  SELECT c.id, c."businessTier" AS stored, s.tier, s.status::text AS status,
         s."currentPeriodEnd" AS period_end, s."pastDueSince" AS past_due_since
  FROM "Club" c JOIN "ClubSubscription" s ON s."clubId" = c.id
  FOR UPDATE OF c
), entitled AS (
  -- Mirrors effectiveTier() in src/lib/billing/policy.ts; a CI test compares them.
  -- Stored timestamps are UTC without a zone, so compare against UTC now.
  SELECT id, stored,
    CASE status
      WHEN 'PENDING' THEN stored
      WHEN 'ACTIVE' THEN tier
      WHEN 'PAST_DUE' THEN CASE WHEN past_due_since IS NOT NULL
        AND (NOW() AT TIME ZONE 'UTC') < past_due_since + INTERVAL '7 days'
        THEN tier ELSE 'FREE'::"BusinessTier" END
      WHEN 'CANCELLED' THEN CASE WHEN period_end IS NOT NULL
        AND (NOW() AT TIME ZONE 'UTC') < period_end
        THEN tier ELSE 'FREE'::"BusinessTier" END
      ELSE 'FREE'::"BusinessTier"
    END AS entitled
  FROM facts
), changed AS (
  SELECT * FROM entitled WHERE entitled <> stored
), upd AS (
  UPDATE "Club" c SET "businessTier" = ch.entitled, "updatedAt" = (NOW() AT TIME ZONE 'UTC')
  FROM changed ch WHERE c.id = ch.id
  RETURNING c.id
), ev AS (
  INSERT INTO "SecurityEvent" ("id", "clubId", "eventType", "referenceId")
  SELECT gen_random_uuid()::text, id, 'BILLING_TIER_CHANGED', :'ref' FROM upd
  RETURNING 1
)
SELECT 'CHANGE', id, stored::text, entitled::text FROM changed
UNION ALL SELECT 'AUDIT', (SELECT count(*) FROM ev)::text, '', '';
$finish;
SQL
)" || die "Reconcile failed and was rolled back"
  changes=0
  while IFS='|' read -r kind a b c; do
    case "$kind" in
      CHANGE) echo "$mode_label: club $a $b -> $c"; changes=$((changes + 1)) ;;
      AUDIT) audited="$a" ;;
    esac
  done <<<"$out"
  (( changes > 0 )) || echo "All subscribed clubs already match their entitlement"
  echo "Clubs needing change: $changes (audit rows written: ${audited:-0})"
  ;;
esac
