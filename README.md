# DAISY Audio Library (Fullstack Web Application)

A fullstack web application for browsing, searching, and managing the DAISY Audio Library.

---

## 🛠 Tech Stack

- **Frontend**: React (18), Vite, lightweight client-side routing, Lucide Icons, Vanilla CSS
- **Backend**: Node.js, Express, MySQL2 (`mysql2/promise`), dotenv, CORS
- **Database**: MySQL 8.0+, containerized via Docker
- **Tooling**: Docker, npm

---

## 📋 Prerequisites

Before getting started, make sure you have the following installed on your system:

- **Node.js**: `v20.19+` or `v22.12+`
- **npm**: `v9.x` or higher
- **Docker & Docker Desktop**: Installed and running

---

## 🚀 Quick Start Guide (Local Setup)

Follow these steps in order to set up and run the full application locally.

### 1. Database Setup (Docker MySQL)

Open your terminal in the **root directory of the project** (`daisy-web`) and run:

#### PowerShell (Windows)

```powershell
docker run -d `
  --name daisy-mysql `
  -p 3306:3306 `
  -e MYSQL_ROOT_PASSWORD=root `
  -e MYSQL_DATABASE=daisy_library `
  -v "${PWD}\database\schema.sql:/docker-entrypoint-initdb.d/schema.sql" `
  mysql:latest
```

#### Bash / Linux / macOS

```bash
docker run -d \
  --name daisy-mysql \
  -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=daisy_library \
  -v "$(pwd)/database/schema.sql:/docker-entrypoint-initdb.d/schema.sql" \
  mysql:latest
```

> ⚠️ **Important:** Ensure you execute the `docker run` command from the root project folder (`daisy-web`) so Docker properly locates `database/schema.sql`.

---

### 2. Backend Setup

1. Open a terminal and navigate to the `backend` directory:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables in `backend/.env`:
   _(If `.env` does not exist, copy `.env.example` to `.env`)_

   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=root
   DB_NAME=daisy_library
   ```

4. Apply pending database migrations:

   ```bash
   npm run db:migrate
   ```

   Check migration status without applying changes:

   ```bash
   npm run db:migrate:status
   ```

   The runner records applied migration checksums in `schema_migrations`; do not edit a migration after applying it.

   Ingest the committed audiobook metadata artifact using read-only R2 credentials:

   ```bash
   npm run db:migrate
   npm run db:audiobooks:publish
   ```

5. Seed the database with sample book data (`books.json`):

   ```bash
   npm run db:seed
   ```

   _Expected output:_ `Success! Seeded X books successfully.`

6. Start the backend server:

   ```bash
   npm run dev
   ```

   _(Or run `npm start` for production mode)_

   The backend API will be available at **`http://localhost:5000`**.

---

### 3. Frontend Setup

1. Open a **new terminal tab/window** and navigate to the `frontend` directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the Vite development server:

   ```bash
   npm run dev
   ```

   The web interface will be accessible at **`http://localhost:5173`**.

---

## 📁 Repository Structure

```text
daisy-web/
├── backend/                # Node.js + Express API Server
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── controllers/    # HTTP request/response handlers
│   │   ├── errors/         # API error types
│   │   ├── middleware/     # Express error handling
│   │   ├── repositories/   # MySQL queries and result mapping
│   │   ├── routes/         # REST endpoint definitions
│   │   ├── app.js          # Injectable Express application
│   │   └── server.js       # HTTP server startup
│   ├── test/               # API regression/unit tests
│   ├── scripts/            # Migration, seed, and metadata publication CLIs
│   ├── index.js            # Backend entry point
│   ├── db.js               # Compatibility database export
│   ├── .env                # Local Environment Configuration
│   └── package.json        # Backend Dependencies & Scripts
├── frontend/               # React + Vite Frontend Application
│   ├── src/                # Components, Pages, and Assets
│   ├── public/             # Static Files
│   ├── test/               # Unit tests
│   └── package.json        # Frontend Dependencies & Scripts
├── database/
│   └── schema.sql          # MySQL Schema Definition Table & Database Initialization
├── books.json              # Initial Book Data for Database Seeding
└── README.md               # Project Documentation
```

---

## 🛠 Available Scripts

### Backend (`/backend`)

- `npm run dev` – Starts the development API server with `nodemon` (auto-reload on code changes).
- `npm start` – Starts the backend API server with standard `node`.
- `npm run db:seed` – Re-initializes the database tables and populates data from `books.json`.
- `npm run db:migrate` – Applies pending schema and reviewed catalog migrations.
- `npm run db:audiobooks:publish` – Verifies R2 metadata and publishes the committed artifact.
- `npm test` – Runs dependency-free API regression tests with Node's built-in test runner.

### Frontend (`/frontend`)

- `npm run dev` – Starts the Vite dev server (`http://localhost:5173`).
- `npm run build` – Builds production-ready static assets to `dist/`.
- `npm run preview` – Locally previews the production build.

---

## 📚 Audiobook metadata release

`database/audiobook-metadata.v1.json` is the only reviewed audiobook release
input in this repository. Deployments validate its digest and expected read-only
R2 metadata, then publish parts and chapters transactionally after migrations.
Application restart does not ingest the artifact automatically.

## 🔊 Authenticated Cloudflare R2 audiobook streaming

The backend exposes authenticated audiobook metadata and playback under:

- `GET /api/books/:bookId/audio`
- `GET, HEAD /api/books/:bookId/audio/:audioId/stream`
- `GET /api/books/:bookId/audio/:audioId/transcript?format=json|text`

The R2 bucket is private. Clients receive API URLs only—never bucket/object keys or presigned URLs. The streaming endpoint supports one byte range and returns `206`, `304`, `416`, or `429` as applicable. Audio requires a verified HTTP-only session cookie; configure an exact allowed UI origin and use credentialed cross-origin media requests. See `backend/docs/audiobook-ingestion.md` for the session adapter, production limiter, content-accessibility, and metadata publication contract.

Until Auth is integrated, backend/UI development can use the fail-safe local
bypass documented in
[`backend/docs/audiobook-ui-handoff.md`](./backend/docs/audiobook-ui-handoff.md).
The bypass requires `NODE_ENV=development`, is rejected in other environments,
and keeps playback on the real metadata and private R2 streaming path.

---

## ❓ Troubleshooting & FAQs

### `ECONNREFUSED` / Database Connection Failed

- Verify Docker is running: `docker ps`
- Check container logs: `docker logs daisy-mysql`
- Ensure `DB_PASSWORD` in `backend/.env` matches `MYSQL_ROOT_PASSWORD` used in Docker (default: `root`).

### Managing the MySQL Container

- **Stop container:** `docker stop daisy-mysql`
- **Start container:** `docker start daisy-mysql`
- **Reset/Delete container:** `docker rm -f daisy-mysql`
