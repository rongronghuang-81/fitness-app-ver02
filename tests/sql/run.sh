#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Runs the SQL suites (migrations + RLS + workflow) against a throwaway
# PostgreSQL database.
#
#   ./tests/sql/run.sh                      # uses a local cluster it starts itself
#   PGHOST=... PGPORT=... ./tests/sql/run.sh --existing
#
# Requires PostgreSQL 15+ server binaries (postgresql-16 or the Supabase CLI's
# bundled Postgres). See docs/DEPLOYMENT.md.
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB="${TEST_DB_NAME:-polestudio_test}"

if [[ "${1:-}" != "--existing" ]]; then
  PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
  WORKDIR="${TEST_PGDATA_ROOT:-/var/tmp/polestudio-pgtest}"
  export PGHOST="$WORKDIR" PGPORT="${PGPORT:-55432}" PGUSER=postgres

  if ! pg_isready -q 2>/dev/null; then
    rm -rf "$WORKDIR"; mkdir -p "$WORKDIR"
    RUNAS=""
    if [[ "$(id -u)" == "0" ]]; then
      id -u pgtest >/dev/null 2>&1 || useradd -m pgtest
      chown -R pgtest "$WORKDIR"; RUNAS="su pgtest -c"
    fi
    ${RUNAS:-eval} "$PGBIN/initdb -D $WORKDIR/pgdata -U postgres --auth=trust" >/dev/null
    ${RUNAS:-eval} "$PGBIN/pg_ctl -D $WORKDIR/pgdata -l $WORKDIR/pg.log -o '-k $WORKDIR -p $PGPORT -c listen_addresses=' start" >/dev/null
    sleep 2
  fi
fi

psql -q -v ON_ERROR_STOP=1 -d postgres \
  -c "drop database if exists $DB;" -c "create database $DB;"

run() { psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$1"; }

echo "→ Supabase shim"
run "$ROOT/tests/sql/supabase-shim.sql"

echo "→ Migrations"
for f in "$ROOT"/supabase/migrations/*.sql; do
  printf '   %s\n' "$(basename "$f")"
  run "$f"
done

echo "→ Helpers"
run "$ROOT/tests/sql/00_helpers.sql"

# A failed assertion raises an exception, which ON_ERROR_STOP turns into a
# non-zero exit. Capture psql's own status rather than the pipeline's, or a
# failing suite would be reported as a pass.
status=0
passed=0
for f in "$ROOT"/tests/sql/*.test.sql; do
  echo "→ $(basename "$f")"
  # `|| rc=$?` keeps `set -e` from aborting before the failure is reported.
  rc=0
  out="$(psql -v ON_ERROR_STOP=1 -d "$DB" -f "$f" 2>&1)" || rc=$?
  echo "$out" | grep -E 'ok  |ERROR|ASSERTION' | sed -E 's/^.*NOTICE:  //'
  passed=$(( passed + $(echo "$out" | grep -c 'ok  ') ))
  [[ $rc -eq 0 ]] || status=1
done

if [[ $status -eq 0 ]]; then
  echo "SQL suites passed — $passed assertions."
else
  echo "SQL suites FAILED."
fi
exit $status
