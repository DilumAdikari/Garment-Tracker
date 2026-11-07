# Garment Production Tracker

A MERN application for tracking cut-piece issues to production plants and the daily
pieces each plant completes and sends out.

**Stack:** MongoDB · Express.js · React (Vite) · Tailwind CSS · Node.js

## Features

- **Dashboard** with KPIs (issued, completed, remaining, today), daily trend chart, status pie chart,
  plant-wise and style-wise progress tables with charts.
- **Issue management** – issue cut pieces to a plant against a style and job sheet; auto-generated issue numbers
  (`ISS-000001`); close / reopen; prevents issuing against closed job sheets.
- **Daily production entry** – pick a plant, search by style number or job sheet, record completed and sent-out
  pieces for a date. Entries cannot push completed totals above the issued quantity. One entry per issue per day
  (re-entering the same day updates it).
- **Search** by style number, job sheet number or issue number.
- **Date-range filters** on dashboard, issues, production and reports.
- **Reports** – issued vs completed, and daily production, viewable on screen and exportable to **Excel** and **PDF**.
- **Activity log** – every issue, entry, edit, deletion, login and export, with user and timestamp.
- **Master data** – plants, styles, job sheets (admin / manager).
- **Users & roles** (admin) – create users, assign roles, activate or disable accounts.
- **Authentication** – JWT, bcrypt password hashing, login rate limiting, helmet security headers.

## Roles

| Capability                               | Viewer | Operator | Manager | Admin |
|------------------------------------------|:------:|:--------:|:-------:|:-----:|
| View dashboard, issues, reports, activity|   ✓    |    ✓     |    ✓    |   ✓   |
| Issue pieces & record daily production   |        |    ✓     |    ✓    |   ✓   |
| Manage plants, styles, job sheets        |        |          |    ✓    |   ✓   |
| Delete issues / production entries       |        |          |    ✓    |   ✓   |
| Delete plants, styles, job sheets        |        |          |         |   ✓   |
| Manage users                             |        |          |         |   ✓   |

## Project structure

```
garment-tracker/
├── server/                     # Express API
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── index.js            # App bootstrap, middleware, DB connection
│       ├── config/db.js        # Mongo connection
│       ├── models/             # User, Plant, Style, JobSheet, Issue, DailyProduction, ActivityLog
│       ├── middleware/         # auth (JWT + roles), error handling
│       ├── controllers/        # auth, issues, production, master data, dashboard, reports, activity
│       ├── routes/index.js     # All API routes and role guards
│       └── utils/              # activity logger, date filters, seed script
└── client/                     # React + Vite + Tailwind
    ├── index.html
    ├── vite.config.js          # Dev proxy /api -> :5000
    ├── tailwind.config.js
    └── src/
        ├── App.jsx             # Routes and role-protected pages
        ├── main.jsx
        ├── index.css           # Tailwind + shared component classes
        ├── api/client.js       # Axios instance, auth header, download helper
        ├── context/AuthContext.jsx
        ├── components/         # Layout, Modal, MasterCrud, StatCard, ProgressBar, ...
        ├── pages/              # Dashboard, Issues, IssueDetail, Production, Reports,
        │                       # Plants, Styles, JobSheets, Users, Activity, Login
        └── utils/              # date/number formatting, labels
```

## Setup

Prerequisites: Node.js 18+, MongoDB 6+ running locally (or a MongoDB Atlas URI).

```bash
# 1. API
cd server
cp .env.example .env          # set JWT_SECRET to a long random string
npm install
npm run seed                  # creates admin/admin123 and sample plants/style (change the password!)
npm run dev                   # http://localhost:5000

# 2. Client (new terminal)
cd client
npm install
npm run dev                   # http://localhost:5173
```

Sign in as `admin` / `admin123`, create real users under **Users**, and change the seeded admin password
(`POST /api/auth/change-password` with `currentPassword` and `newPassword`; a UI for this is not yet built).

## Daily workflow

1. **Issue** – Issues → *Issue to plant*. Choose style → job sheet → plant, enter pieces and issue date.
2. **Collect updates** – Daily Production → choose the plant, type the style number to filter, pick the issue,
   enter the date, completed pieces and sent-out pieces, then *Save entry*.
3. **Monitor** – The dashboard and issue list show issued, completed, pending and progress automatically.
4. **Report** – Reports → choose type and date range → export to Excel or PDF.

## API overview

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | Sign in, returns JWT |
| GET | `/api/auth/me` | Current user |
| GET | `/api/dashboard?from&to` | KPIs, trends, plant/style progress |
| GET/POST | `/api/issues` | List (search, filters, pagination) / issue cut pieces |
| GET/PUT/DELETE | `/api/issues/:id` | Details with production history / update / delete |
| GET/POST | `/api/production` | List entries / record daily production (upserts per issue per day) |
| DELETE | `/api/production/:id` | Soft-delete an entry (recalculates totals) |
| CRUD | `/api/plants`, `/api/styles`, `/api/job-sheets` | Master data |
| GET | `/api/job-sheets/by-style/:styleId` | Open job sheets for a style |
| GET | `/api/reports/:type?from&to&plant` | `issues` or `production` report as JSON |
| GET | `/api/reports/:type/excel` · `/pdf` | Download report |
| GET | `/api/activity` | Activity log |
| CRUD | `/api/users` | User management (admin) |

## Security notes

- Change `JWT_SECRET` and the seeded admin password before going live.
- Serve the API over HTTPS in production and set `NODE_ENV=production`.
- Every write is recorded in the activity log with the acting user and IP address.
- Deleting production entries is a soft delete, so history is preserved for audit.
