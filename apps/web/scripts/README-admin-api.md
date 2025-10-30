# Better Auth Admin API - Creating Admin Users

This document explains how to create admin users using the Better Auth admin plugin's REST API.

## Prerequisites

1. The `admin` plugin must be enabled in your Better Auth configuration (`apps/web/lib/auth.ts`)
2. Your Next.js app must be running (typically on `http://localhost:3000`)
3. You need admin privileges to call these endpoints

## API Endpoint

```
POST /api/auth/admin/create-user
```

## Request Format

### Headers

```
Content-Type: application/json
```

### Body (JSON)

```json
{
	"email": "admin@example.com",
	"password": "secure-password-here",
	"name": "Admin User",
	"role": "admin"
}
```

### Required Fields

- `email` (string): The user's email address
- `password` (string): The user's password
- `name` (string): The user's display name

### Optional Fields

- `role` (string | string[]): User role(s). Can be a single string like "admin" or an array like
  ["admin", "user"]
- `data` (object): Additional custom fields for the user

## Example Usage

### Using curl

```bash
# Basic admin user creation
curl -X POST http://localhost:3000/api/auth/admin/create-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "ChangeMe123!",
    "name": "Admin User",
    "role": "admin"
  }'
```

### Using environment variables (for scripts)

```bash
# Set environment variables
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="ChangeMe123!"
export ADMIN_NAME="Admin User"
export BASE_URL="http://localhost:3000"

# Make the request
curl -X POST "$BASE_URL/api/auth/admin/create-user" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\",
    \"name\": \"$ADMIN_NAME\",
    \"role\": \"admin\"
  }"
```

### Using a Node.js script

```javascript
// create-admin.js
const fetch = require("node-fetch")

async function createAdminUser() {
	const response = await fetch("http://localhost:3000/api/auth/admin/create-user", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			email: process.env.ADMIN_EMAIL || "admin@example.com",
			password: process.env.ADMIN_PASSWORD || "ChangeMe123!",
			name: process.env.ADMIN_NAME || "Admin User",
			role: "admin",
		}),
	})

	const result = await response.json()

	if (response.ok) {
		console.log("Admin user created successfully:", result)
	} else {
		console.error("Failed to create admin user:", result)
	}
}

createAdminUser()
```

## Response Format

### Success Response (200)

```json
{
	"id": "usr_abc123def456",
	"email": "admin@example.com",
	"name": "Admin User",
	"role": ["admin"],
	"createdAt": "2023-10-27T10:00:00Z"
}
```

### Error Response (400/500)

```json
{
	"error": {
		"message": "User with this email already exists",
		"code": "USER_ALREADY_EXISTS"
	}
}
```

## Common Error Scenarios

1. **User already exists**: Returns 400 with message about duplicate email
2. **Missing required fields**: Returns 400 with validation errors
3. **Invalid role**: Returns 400 if role format is incorrect
4. **Admin plugin not enabled**: Returns 404 if admin plugin isn't configured
5. **Unauthorized**: Returns 401 if you don't have admin privileges

## Authentication

The admin endpoints require authentication. You need to be logged in as an admin user or have
appropriate admin privileges. The authentication is handled automatically by Better Auth's session
management.

## Alternative: Direct Database Insertion

If you prefer to avoid the API, you can insert directly into the SQLite database, but you must:

1. Hash the password properly using Better Auth's hashing algorithm
2. Generate appropriate IDs and timestamps
3. Ensure data consistency

**Warning**: Direct database manipulation bypasses Better Auth's validation and security measures.
Use the API approach whenever possible.

## Testing the Endpoint

1. Start your Next.js development server: `npm run dev`
2. Use the curl command above to test user creation
3. Check your database to verify the user was created
4. Try logging in with the new admin credentials

## Integration with Existing Seed Script

To update your existing seed script (`apps/web/scripts/seed-admin.ts`), replace the current logic
with an HTTP request to this endpoint instead of trying to call methods directly on the auth
instance.
