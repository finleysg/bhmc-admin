#!/bin/sh
set -e

# Wait for DB and run migrations
until uv run python manage.py migrate --noinput; do
  echo "Waiting for database..."
  sleep 2
done

# Collect static files
uv run python manage.py collectstatic --noinput

# Start gunicorn
exec uv run gunicorn bhmc.wsgi:application \
  --chdir /app \
  --bind 0.0.0.0:8000 \
  --workers 2 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
