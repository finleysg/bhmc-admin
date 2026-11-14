#!/usr/bin/env bash
# Creates (or updates) the local integration-test database from Django's migrations.
# Requires the docker compose stack (mysql, backend) to be running.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

DB=bhmc_test

docker compose exec -T mysql sh -c "mysql -uroot -p\"\$MYSQL_ROOT_PASSWORD\" 2>/dev/null" <<SQL
CREATE DATABASE IF NOT EXISTS \`$DB\` CHARACTER SET utf8mb4;
GRANT ALL PRIVILEGES ON \`$DB\`.* TO 'gg'@'%';
GRANT ALL PRIVILEGES ON \`$DB\`.* TO 'bhmcgolf'@'%';
SQL

docker compose exec -T -e DATABASE_NAME="$DB" backend uv run python manage.py migrate --no-input

echo "Integration database '$DB' is ready."
