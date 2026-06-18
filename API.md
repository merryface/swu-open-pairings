# SWU Open Pairings API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
All admin endpoints require a JWT token in the `Authorization` header:
```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### Multi-Tier Admin System
The backend uses a multi-tier admin system with `merryface` as the super admin:

1. **merryface** (Super Admin) - Can approve other admins
2. **Approved Admins** - Must be approved by merryface before they can register
3. **Unapproved Users** - Cannot register or access admin features

Registration Flow:
1. merryface approves new admin usernames via POST /auth/admin/approve
2. Approved admins can then register using the approval special_word
3. Registered admins can create/manage pairings

---

### POST /auth/register
Create a new admin user account. Account must be pre-approved in the `approved_admins` table by merryface.

**Request:**
```javascript
{
  "username": "admin1",
  "password": "password123",
  "special_word": "secret-word-123"
}
```

**Response (201):**
```javascript
{
  "id": 1,
  "username": "admin1"
}
```

**Error Responses:**
- `400` — Missing username or password
  ```javascript
  { "message": "Username and password are required" }
  ```
- `403` — Username not approved or incorrect special_word
  ```javascript
  { "message": "Username is not approved for registration" }
  ```
  OR
  ```javascript
  { "message": "Incorrect special word" }
  ```
- `409` — User already exists
  ```javascript
  { "message": "User already exists" }
  ```

---

### POST /auth/login
Authenticate and receive a JWT token.

**Request:**
```javascript
{
  "username": "admin1",
  "password": "password123"
}
```

**Response (200):**
```javascript
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "1h"
}
```

**Error Responses:**
- `400` — Missing username or password
  ```javascript
  { "message": "Username and password are required" }
  ```
- `401` — Invalid credentials
  ```javascript
  { "message": "Invalid credentials" }
  ```

---

### POST /auth/admin/approve
Approve a new admin username for registration (merryface only, requires JWT token).

**Request:**
```javascript
{
  "username": "newadmin",
  "special_word": "secret-approval-code"
}
```

**Response (201):**
```javascript
{
  "id": 2,
  "username": "newadmin"
}
```

**Error Responses:**
- `400` — Missing required fields
  ```javascript
  { "message": "Username and special_word are required" }
  ```
- `403` — Not merryface
  ```javascript
  { "message": "Only merryface can approve new admins" }
  ```
- `409` — Username already approved
  ```javascript
  { "message": "Username already approved for registration" }
  ```

---

### GET /auth/admin/approved-users
Get list of all approved admin usernames (merryface only, requires JWT token).

**Response (200):**
```javascript
[
  {
    "id": 1,
    "username": "merryface",
    "special_word": null,
    "created_at": "2026-06-18T12:00:00Z"
  },
  {
    "id": 2,
    "username": "admin1",
    "special_word": "secret-word-1",
    "created_at": "2026-06-18T12:30:00Z"
  }
]
```

**Error Responses:**
- `403` — Not merryface
  ```javascript
  { "message": "Only merryface can view approved users" }
  ```

---

### DELETE /auth/admin/approve/:username
Remove an approved admin username (merryface only, requires JWT token).

**Response (200):**
```javascript
{
  "message": "Approval removed"
}
```

**Error Responses:**
- `400` — Cannot remove merryface
  ```javascript
  { "message": "Cannot remove merryface" }
  ```
- `403` — Not merryface
  ```javascript
  { "message": "Only merryface can remove approvals" }
  ```
- `404` — Username not found
  ```javascript
  { "message": "Username not found" }
  ```

---

## Pairings Endpoints

### GET /pairings/summary
Get a lightweight summary of all published pairings (public, no auth required).

Useful for listing pairings without the heavy rounds and winner_selections data.

**Response (200):**
```javascript
[
  {
    "id": 1,
    "name": "Round Robin Tournament",
    "is_published": 1,
    "created_at": "2026-06-18T12:34:56Z"
  },
  {
    "id": 2,
    "name": "Playoff Bracket",
    "is_published": 1,
    "created_at": "2026-06-18T13:00:00Z"
  }
]
```

---

### GET /pairings
Get all published pairings (public, no auth required).

**Response (200):**
```javascript
[
  {
    "id": 1,
    "name": "Round Robin Tournament",
    "rounds": [
      {
        "round": 1,
        "matches": [
          { "home": "Team A", "away": "Team B" },
          { "home": "Team C", "away": "Team D" }
        ]
      }
    ],
    "winner_selections": [],
    "created_at": "2026-06-18T12:34:56Z",
    "updated_at": "2026-06-18T12:34:56Z",
    "is_published": 1
  }
]
```

---

### GET /pairings/:id
Get a single published pairing by ID (public, no auth required).

**Response (200):**
```javascript
{
  "id": 1,
  "name": "Round Robin Tournament",
  "rounds": [
    {
      "round": 1,
      "matches": [
        { "home": "Team A", "away": "Team B" },
        { "home": "Team C", "away": "Team D" }
      ]
    }
  ],
  "winner_selections": [],
  "created_at": "2026-06-18T12:34:56Z",
  "updated_at": "2026-06-18T12:34:56Z",
  "is_published": 1
}
```

**Error Responses:**
- `404` — Pairing not found
  ```javascript
  { "message": "Pairing not found" }
  ```
- `403` — Pairing is not published
  ```javascript
  { "message": "This pairing is not published" }
  ```

---

### POST /pairings
Create a new pairing (admin only, requires JWT token).

**Request:**
```javascript
{
  "name": "Round Robin Tournament",
  "rounds": [
    {
      "round": 1,
      "matches": [
        { "home": "Team A", "away": "Team B" },
        { "home": "Team C", "away": "Team D" }
      ]
    }
  ],
  "winner_selections": [],
  "is_published": 0
}
```

**Response (201):**
```javascript
{
  "id": 1,
  "name": "Round Robin Tournament",
  "rounds": [...],
  "winner_selections": [],
  "created_at": "2026-06-18T12:34:56Z",
  "updated_at": "2026-06-18T12:34:56Z",
  "is_published": 0
}
```

**Error Responses:**
- `400` — Missing required fields
  ```javascript
  { "message": "Name and rounds are required" }
  ```
- `401` — Missing or invalid token
  ```javascript
  { "message": "Missing authorization token" }
  ```

---

### PUT /pairings/:id
Update an existing pairing (admin only, requires JWT token).

**Request:**
```javascript
{
  "name": "Updated Tournament Name",
  "rounds": [...],
  "winner_selections": [{ "matchId": 1, "winner": "Team A" }],
  "is_published": 1
}
```

**Response (200):**
```javascript
{
  "id": 1,
  "name": "Updated Tournament Name",
  "rounds": [...],
  "winner_selections": [...],
  "created_at": "2026-06-18T12:34:56Z",
  "updated_at": "2026-06-18T13:00:00Z",
  "is_published": 1
}
```

**Error Responses:**
- `404` — Pairing not found
  ```javascript
  { "message": "Pairing not found" }
  ```
- `401` — Missing or invalid token

---

### DELETE /pairings/:id
Delete a pairing (admin only, requires JWT token).

**Response (200):**
```javascript
{
  "message": "Pairing deleted"
}
```

**Error Responses:**
- `404` — Pairing not found
- `401` — Missing or invalid token

---

### PATCH /pairings/:id/publish
Toggle the publish status of a pairing (admin only, requires JWT token).

**Response (200):**
```javascript
{
  "id": 1,
  "name": "Round Robin Tournament",
  "rounds": [...],
  "winner_selections": [],
  "created_at": "2026-06-18T12:34:56Z",
  "updated_at": "2026-06-18T13:00:00Z",
  "is_published": 1
}
```

**Error Responses:**
- `404` — Pairing not found
- `401` — Missing or invalid token

---

## Implementation Notes

### Approving New Admins
Once merryface is registered, you can approve new admins:

```javascript
const approveResponse = await fetch('http://localhost:3000/api/auth/admin/approve', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${merryToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'newadmin',
    special_word: 'secret-code-123'
  })
});
```

### Registering Approved Admins
Approved admins can then register using their special_word:

```javascript
const registerResponse = await fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'newadmin',
    password: 'their-password',
    special_word: 'secret-code-123'
  })
});
```

### Storing the Token
After login, store the token securely for authenticated requests:
```javascript
sessionStorage.setItem('authToken', data.token);
```

### Using the Token on Admin Requests
```javascript
const token = sessionStorage.getItem('authToken');

const response = await fetch('http://localhost:3000/api/pairings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'New Tournament',
    rounds: [...],
    is_published: 0
  })
});
```

### Error Handling
Always check the response status code:
```javascript
if (response.status === 401) {
  // Token expired or missing
  window.location.href = '/login.html';
}

if (response.status === 403) {
  // Access denied or not approved
  console.error('Access forbidden');
}

if (response.status === 404) {
  console.error('Resource not found');
}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request (validation error) |
| `401` | Unauthorized (missing/invalid token) |
| `403` | Forbidden (unpublished pairing access) |
| `404` | Not Found |
| `500` | Server Error |
