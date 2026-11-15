#!/usr/bin/env bash
set -euo pipefail

# Sunucuda /root/.meydan-pg.env içinde PGPASSWORD ve CONTAINER tanımlı olmalı.
source /root/.meydan-pg.env
BACKUP_DIR="${BACKUP_DIR:-/root/meydan-backups}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M)"
OUT="$BACKUP_DIR/meydan-$STAMP.dump"
docker exec -e PGPASSWORD="$PGPASSWORD" "$CONTAINER" pg_dump -U "${PGUSER:-postgres}" -d "${PGDATABASE:-postgres}" -Fc > "$OUT"
chmod 600 "$OUT"
find "$BACKUP_DIR" -type f -name 'meydan-*.dump' -mtime +14 -delete
echo "backup: $OUT ($(du -h "$OUT" | cut -f1))"
