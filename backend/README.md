# ChatConnect Backend — Phase 1

## What's implemented
- Express server with MongoDB (Mongoose) connection, CORS, cookie-parser
- `User` model with bcrypt password hashing (pre-save hook) + `comparePassword` method
- Auth routes:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/check` (protected)
- JWT auth: token signed on register/login, stored as an httpOnly cookie, verified via `protectRoute` middleware
- Centralized error handler + 404 handler
- Rate limiting on auth routes

## Setup
```bash
cd backend
cp .env.example .env   # then fill in MONGO_URI, JWT_SECRET, CLOUDINARY_* keys
npm install
npm run dev
```

Server starts on `http://localhost:5001` (or your `PORT`).

## Quick test (once running)
```bash
# Register
curl -c cookies.txt -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"secret123"}'

# Check auth (uses the cookie saved above)
curl -b cookies.txt http://localhost:5001/api/auth/check
```

## Architecture notes (for your report/viva)
- **Password security**: passwords are never stored in plaintext; bcrypt hashes with a per-user salt via a Mongoose pre-save hook, so hashing happens automatically on every save, not just at registration.
- **Auth strategy**: JWT is stored in an `httpOnly` cookie rather than `localStorage`. This means client-side JavaScript can never read the token, which mitigates XSS-based token theft. `sameSite: strict` mitigates CSRF for state-changing requests.
- **Separation of concerns**: routes → controllers → models, with cross-cutting concerns (auth check, error formatting) pulled into middleware so each layer has one responsibility.

## Next: Phase 2
User & Conversation APIs (user listing/search, profile update with Cloudinary upload, message history, send message).
