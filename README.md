# Talvex

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)
![Django](https://img.shields.io/badge/Django-5.0-092E20?style=flat-square&logo=django&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![DRF](https://img.shields.io/badge/Django_REST_Framework-red?style=flat-square&logo=django&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

Talvex is a full-stack recruitment and applicant tracking platform designed to streamline every stage of the hiring lifecycle. It connects recruiters and candidates through dedicated role-based portals, offering live interview rooms, real-time assessment environments, automated resume parsing, and visual Kanban boards — all secured by a robust JWT and OTP authentication system. Built on a Django REST Framework backend with WebSocket support via Django Channels and a modern React 19 frontend powered by Vite and Tailwind CSS, Talvex delivers a fast, scalable, and cohesive hiring experience from application to offer.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Role-Based Portals** — Distinct, purpose-built dashboards and routing for Candidates, Recruiters, and Administrators.
- **Live Interview Rooms** — Real-time collaborative interview sessions powered by Django Channels and WebSockets.
- **Real-Time Assessments** — Synchronized assessment rooms enabling live evaluation with instant feedback.
- **Automated Resume Parsing** — Backend pipeline that extracts structured data directly from uploaded PDF and DOCX resumes using `pdfplumber` and `python-docx`.
- **Applicant Tracking (Kanban)** — Visual drag-and-drop Kanban boards for recruiters to manage and progress candidate pipelines.
- **Secure Authentication** — Multi-layered login system combining JWT (JSON Web Tokens) for session management and OTP (One-Time Password) for two-factor verification.

---

## Tech Stack

### Frontend

- **Framework:** React 19, initialized with Vite
- **Styling:** Tailwind CSS v4 with `@tailwindcss/forms` and PostCSS
- **Routing:** React Router DOM v7
- **Icons:** `lucide-react`

### Backend

- **Framework:** Django 5.0 and Django REST Framework
- **Real-Time:** Django Channels, Daphne, `channels-redis`
- **Database:** PostgreSQL via `psycopg2-binary`
- **Authentication:** `djangorestframework-simplejwt`, `pyotp`, `cryptography`
- **File Processing:** `pdfplumber` (PDF parsing), `python-docx` (DOCX parsing)

---

## Project Structure

```
Talvex/
├── Frontend/                        # React + Vite application
│   └── src/
│       └── pages/
│           ├── auth/                # Login, registration, OTP verification
│           ├── candidate/           # Candidate portal pages
│           ├── recruiter/           # Recruiter portal and Kanban views
│           └── admin/               # Admin dashboard pages
│
└── backend/                         # Django project root
    ├── hiresync_backend/            # Core Django project (settings, URLs, ASGI)
    └── apps/
        ├── authentication/          # JWT + OTP auth logic
        ├── candidates/              # Candidate models and views
        ├── recruiters/              # Recruiter models and views
        ├── companies/               # Company profiles
        ├── interviews/              # Interview rooms and WebSocket consumers
        ├── jobs/                    # Job listings and applications
        └── assessments/             # Real-time assessment logic
```

---

## Getting Started

### Prerequisites

Ensure the following are installed on your system before proceeding:

- Python 3.11+
- Node.js 18+ and npm
- PostgreSQL
- Redis (required for Django Channels layer)

### Backend Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a virtual environment
python -m venv venv

# On macOS/Linux
source venv/bin/activate

# On Windows
venv\Scripts\activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Configure your environment variables
# Create a .env file and set your DATABASE_URL, SECRET_KEY, REDIS_URL, etc.

# 5. Apply database migrations
python manage.py migrate

# 6. Start the development server
# Option A: Standard Django server (HTTP only)
python manage.py runserver

# Option B: Daphne ASGI server (HTTP + WebSockets — recommended)
daphne hiresync_backend.asgi:application
```

### Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd Frontend

# 2. Install Node dependencies
npm install

# 3. Start the Vite development server
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:8000` by default.

---

## Contributing

Contributions are welcome. To get started:

1. Fork the repository.
2. Create a new feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes with clear, descriptive messages: `git commit -m "feat: add your feature"`
4. Push to your fork: `git push origin feature/your-feature-name`
5. Open a Pull Request against the `main` branch.

Please ensure your code follows existing conventions and that any new backend functionality includes appropriate tests.

---

## License

This project is licensed under the [MIT License](LICENSE).
