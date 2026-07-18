# DAISY Audio Library (Fullstack Web Application)

A fullstack web application for browsing, searching, and managing the DAISY Audio Library. 

---

## 🛠 Tech Stack

- **Frontend**: React (18), Vite, React Router DOM, Lucide Icons, Vanilla CSS
- **Backend**: Node.js, Express, MySQL2 (`mysql2/promise`), dotenv, CORS
- **Database**: MySQL 8.0+, containerized via Docker
- **Tooling**: Docker, npm

---

## 📋 Prerequisites

Before getting started, make sure you have the following installed on your system:
- **Node.js**: `v18.x` or higher
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
   *(If `.env` does not exist, copy `.env.example` to `.env`)*
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=root
   DB_NAME=daisy_library
   ```

4. Seed the database with sample book data (`books.json`):
   ```bash
   npm run db:seed
   ```
   *Expected output:* `Success! Seeded X books successfully.`

5. Start the backend server:
   ```bash
   npm run dev
   ```
   *(Or run `npm start` for production mode)*

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
│   ├── index.js            # API Entry Point & Route Handlers
│   ├── db.js               # MySQL Connection Pool
│   ├── seed.js             # Database Seeding Script
│   ├── .env                # Local Environment Configuration
│   └── package.json        # Backend Dependencies & Scripts
├── frontend/               # React + Vite Frontend Application
│   ├── src/                # Components, Pages, and Assets
│   ├── public/             # Static Files
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

### Frontend (`/frontend`)
- `npm run dev` – Starts the Vite dev server (`http://localhost:5173`).
- `npm run build` – Builds production-ready static assets to `dist/`.
- `npm run preview` – Locally previews the production build.

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