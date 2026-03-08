FROM ubuntu:24.04

# Install uv and system dependencies
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

RUN apt update && apt install --no-install-recommends -y \
  python3 \
  python3-dev \
  build-essential \
  default-libmysqlclient-dev \
  pkg-config

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app

RUN mkdir /scripts
COPY ./backend/scripts /scripts
RUN chmod +x /scripts/*.sh

WORKDIR /app

# Copy dependency files first for better layer caching
COPY backend/pyproject.toml backend/uv.lock ./

# Ensure .venv is cleaned up before syncing dependencies
RUN rm -rf .venv && uv sync --frozen --no-dev

# Copy application code
COPY backend/ .
# Remove local .venv that may have been copied from host
RUN rm -rf .venv

EXPOSE 8000
CMD ["/scripts/start-prod.sh"]
