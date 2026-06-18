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

### POST /auth/register
Create a new admin user account.

**Request:**
```javascript
{
  "username": "admin",
  "password": "password123"
}
```

**Response (201):**
```javascript
{
  "id": 1,
  "username": "admin"
}
```

**Error Responses:**
- `400` — Missing username or password
  ```javascript
  { "message": "Username and password are required" }
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
  "username": "admin",
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

## Pairings Endpoints

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

### Storing the Token
After login, store the token securely:
```javascript
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'password123' })
});

const data = await response.json();
sessionStorage.setItem('authToken', data.token); // Store token
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
