# ChatConnect

A real-time one-to-one chat app (MERN + Socket.IO + Cloudinary) that runs as:
- a **web app** (any browser)
- a **desktop app** for **Windows / macOS / Linux** (via Electron)
- a **mobile app** for **Android / iOS** (via Capacitor)

All three share the *exact same* React frontend — there's one codebase, wrapped three ways.

```
chatconnect/
├── backend/          # Express + MongoDB + Socket.IO API (runs once, serves all clients)
├── frontend/          # React + Vite + Tailwind — the shared UI for web/desktop/mobile
├── desktop/           # Electron shell that loads the frontend build (Win/Mac/Linux)
├── capacitor.config.json   # Capacitor config that wraps the same frontend build (Android/iOS)
└── package.json       # Root scripts to run/build everything
```

---

## 1. Run it as a web app (do this first)

This is the foundation everything else builds on.

```bash
# from the repo root
npm run install:all

# fill in real values
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` with your MongoDB URI, a JWT secret, and Cloudinary credentials.
Edit `frontend/.env` — for local dev the defaults (`localhost:5001`) are fine.

```bash
npm run dev
```

This runs the backend (port 5001) and frontend (port 5173) together via `concurrently`. Open `http://localhost:5173`, register two accounts (e.g. in two browser windows), and chat between them in real time.

**Before packaging for desktop or mobile**, point `frontend/.env`'s `VITE_API_URL` / `VITE_SOCKET_URL` at your **deployed** backend (e.g. `https://api.yourdomain.com`) — a desktop or phone app can't reach `localhost` on your dev machine.

---

## 2. Deploy the backend once

The backend is a single Node/Express/Socket.IO service. Every client (web, desktop, mobile) talks to this one deployment.

- Host it on Render, Railway, Fly.io, or similar.
- Use MongoDB Atlas for the database.
- Set env vars: `MONGO_URI`, `JWT_SECRET`, `CLOUDINARY_*`, `CLIENT_URL` (your deployed frontend origin, for CORS), `NODE_ENV=production`.
- **Use HTTPS.** Android blocks cleartext HTTP by default, and browsers require HTTPS for the `secure` cookie flag to work in production.

---

## 3. Desktop app (Windows / macOS / Linux) — Electron

```bash
cd desktop
npm install
```

**Dev mode** (loads the Vite dev server in a native window):
```bash
# from repo root, with the web dev servers already running (npm run dev)
npm run electron:dev
```

**Build installers** for the current OS:
```bash
npm run build:frontend        # builds frontend/dist with your production .env values
npm run --prefix desktop build # produces installers in desktop/release/
```
This uses `electron-builder`, configured in `desktop/package.json`, to produce:
- **Windows**: `.exe` (NSIS installer) and a portable `.exe`
- **macOS**: `.dmg` and `.zip` (run on a Mac, or use CI, to get a valid macOS build/signing)
- **Linux**: `.AppImage` and `.deb`

Cross-compiling for macOS from Windows/Linux isn't supported by Apple's tooling — build the macOS target on a Mac or via a CI runner (e.g. GitHub Actions `macos-latest`).

---

## 4. Mobile app (Android / iOS) — Capacitor

Capacitor takes the same `frontend/dist` web build and wraps it in a native shell, giving you a real `.apk`/`.aab` and a real Xcode project — not a WebView hack with no native APIs.

```bash
# from repo root
npm install                      # installs @capacitor/core, @capacitor/cli, @capacitor/android, @capacitor/ios
npm run build:frontend           # build the web app first — Capacitor copies this into the native projects

npx cap add android              # generates the android/ native project (one-time)
npx cap add ios                  # generates the ios/ native project (one-time, needs Xcode/macOS)

npm run cap:sync                 # re-run this after every frontend change to sync the build in
```

**Android**
```bash
npx cap open android
```
Opens Android Studio. From there: `Run` on an emulator/device, or `Build > Generate Signed Bundle/APK` for a Play Store release.

**iOS** (requires macOS + Xcode)
```bash
npx cap open ios
```
Opens Xcode. `Run` on the simulator/device, or `Product > Archive` for an App Store release. You'll need an Apple Developer account to sign and distribute.

**Notes**
- `capacitor.config.json` sets `androidScheme: "https"` so cookie-based auth (`withCredentials`) behaves correctly on Android's WebView.
- The app talks to your deployed backend over HTTPS/WebSocket — same as the web and desktop clients.
- Native push notifications, camera access, etc. can be added later via Capacitor plugins (`@capacitor/push-notifications`, `@capacitor/camera`) without touching the backend.

---

## Architecture summary (for your report/viva)

- **One backend, three frontends-in-one**: the Express + Socket.IO API is platform-agnostic; it doesn't know or care whether the client is a browser tab, an Electron window, or a Capacitor WebView. This is the same principle real companies use (e.g. Slack, Discord) — one web codebase, wrapped natively per platform, talking to one backend.
- **Auth**: JWT in an httpOnly cookie, verified per-request by `protectRoute` middleware. Works identically across all three client shells since they all make standard HTTPS requests with `withCredentials: true`.
- **Real-time**: Socket.IO connects over the same HTTPS origin as the REST API; presence, typing, and read-receipts are all just events relayed through an in-memory `userId -> socketId` map on the server.
- **Media**: images are uploaded via `multipart/form-data`, streamed straight to Cloudinary from an in-memory buffer (no temp files), and only the resulting URL is stored in MongoDB.

## Future enhancements (not built, suggested only)
Group chats, voice/video calls, end-to-end encryption, message reactions/editing, multi-language support.
