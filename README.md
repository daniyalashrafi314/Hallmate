# Hallmate

Hallmate is a university hall management system built for a Database Management System project. It provides role-based workflows for students, staff, provost, and super user to manage accommodation, payments, events, notices, complaints, tasks, and forum interactions.

## Team

- Group project submission (one submission per group)
- ZIP naming format for submission: `StudentID1_StudentID2.zip`

## Key Features

- Role-based access for Student, Staff, Provost, and Super User
- Seat application and allocation workflows
- Fees, salary, donation, and payment management
- Complaint and visitor management
- Event and notice publishing
- Task assignment and tracking
- Forum posts, comments, likes, and notifications

## Tech Stack

- Backend: Flask, psycopg (PostgreSQL driver), Flask-CORS
- Frontend: React, TypeScript, Vite
- Database: PostgreSQL

## ERD Diagram

![ER Diagram](./ERD/ERD.PNG)

## Project Structure

```text
Hallmate/
|-- backend/
|-- frontend/
|-- Schema/
|-- ERD/
|-- dump.sql
|-- README.md
```

## Prerequisites

Install these tools before running the project:

- Python 3.10+ (or compatible Python 3.x)
- Node.js 18+ and npm
- PostgreSQL 14+ (or compatible)

## Database Setup

Create a PostgreSQL database, then run scripts in this order:

1. Create schema and tables (choose one primary schema script):
	- `Schema/Schemas.sql` (recommended)
	- or `Schema/schema1.sql`
2. Insert mock/seed data:
	- `Schema/mock_data_testing.sql`
3. Optional procedures/triggers logic (if required for your evaluation):
	- `Schema/plsql.sql`

Alternative restore path:

- Use `dump.sql` or `backup/backup.sql` if your evaluator prefers restoring from a complete dump.

## Backend Setup and Run

From the `backend/` directory:

```bash
python -m venv .venv
```

Activate virtual environment:

- Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

- Linux/macOS:

```bash
source .venv/bin/activate
```

Install dependencies and run:

```bash
pip install -r ../requirements.txt
python app.py
```

Backend default URL: `http://localhost:5000`

## Frontend Setup and Run

From the `frontend/` directory:

```bash
npm install
npm run dev
```

Frontend dev URL is shown by Vite (commonly `http://localhost:5173`).

Optional production build:

```bash
npm run build
npm run preview
```

## Configuration Notes

- Update database connection settings in `backend/app/db.py` before running in a new environment.
- For cleaner deployment/submission practice, use environment variables for DB credentials instead of hardcoding secrets.

## Suggested Test Run Flow

1. Start PostgreSQL and ensure schema/data is loaded.
2. Run backend server.
3. Run frontend server.
4. Open frontend URL and verify login and role dashboards.

## Submission Checklist

- Include all source code (`backend/`, `frontend/`)
- Include database scripts (`Schema/`, `dump.sql` or backup SQL)
- Include this README with setup steps
- Remove unnecessary generated folders before zipping (`node_modules`, `.venv`, `__pycache__`, build artifacts)
- Create one ZIP file named exactly: `StudentID1_StudentID2.zip`

## License

This project was created for academic coursework.