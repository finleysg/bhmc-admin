# CLAUDE.md

## Backend (django)

The backend is a RESTful layer over the MySQL database. This project owns the schema and migrations.

### Commands

```bash
# Install dependencies
uv sync

# Run server
uv run python manage.py runserver

# Run tests
uv run python manage.py test

# Run migrations
uv run python manage.py migrate
```

### Environment

Set `DJANGO_ENV` to control configuration:

- `local` - uses `config/.env.local`
- `docker` - uses `config/.env.docker`
- `prod` - uses `config/.env`

### Authentication

Credentials-based authentication via [Djoser](https://djoser.readthedocs.io/).

| Endpoint                                   | Description                          |
| ------------------------------------------ | ------------------------------------ |
| `POST /auth/token/login/`                  | Obtain auth token (email + password) |
| `POST /auth/token/logout/`                 | Invalidate current token             |
| `POST /auth/users/`                        | Register new user                    |
| `POST /auth/users/reset_password/`         | Request password reset               |
| `POST /auth/users/reset_password_confirm/` | Confirm password reset               |
