# 🛡️ Community Helpdesk for Cyber Safety

A complete, modern, responsive website that spreads awareness about cyber safety and
provides a simple helpdesk platform where community members can learn about phishing,
online scams, password security, privacy, and safe internet practices — and ask for help
when something feels wrong online.

Built as a **Computer Science CEP (Community Engagement Project)**.

---

## 🧰 Tech Stack

| Layer      | Technology                     |
|------------|---------------------------------|
| Frontend   | HTML5, CSS3, Vanilla JavaScript |
| Backend    | Node.js, Express.js             |
| Database   | MongoDB (via Mongoose)          |

---

## 📁 Project Structure

```
community-cyber-safety-helpdesk/
│
├── client/                    # Frontend (served as static files by Express)
│   ├── index.html             # Home page
│   ├── about.html             # About page
│   ├── safety-tips.html       # Cyber Safety Tips (6 categories, tabbed)
│   ├── threats.html           # Common Cyber Threats (awareness only)
│   ├── helpdesk.html          # Ask for Help form
│   ├── faq.html               # FAQ accordion
│   ├── contact.html           # Contact form
│   ├── css/
│   │   └── style.css          # Single modern dark-blue stylesheet
│   └── js/
│       └── script.js          # Nav, forms, FAQ, tabs, validation, API calls
│
├── server/
│   ├── server.js              # Express app entry point
│   ├── models/
│   │   ├── HelpRequest.js     # Mongoose schema for helpdesk submissions
│   │   └── ContactMessage.js  # Mongoose schema for contact messages
│   ├── routes/
│   │   ├── helpdesk.js        # /api/helpdesk endpoints
│   │   └── contact.js         # /api/contact endpoints
│   └── config/
│       └── db.js              # MongoDB connection setup
│
├── package.json
├── .env.example                # Copy this to .env and edit values
├── .gitignore
└── README.md
```

---

## ⚙️ Prerequisites

Before you start, install:

1. **Node.js** (v16 or higher) — [nodejs.org](https://nodejs.org)
   Check with: `node -v`
2. **MongoDB** — either:
   - **Local MongoDB Community Server** — [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community), or
   - **MongoDB Atlas** (free cloud database) — [mongodb.com/atlas](https://www.mongodb.com/atlas)
3. **VS Code** — [code.visualstudio.com](https://code.visualstudio.com)

---

## 🚀 Step-by-Step Setup (in VS Code)

### 1. Open the project
- Extract/unzip the `community-cyber-safety-helpdesk` folder.
- Open **VS Code** → `File > Open Folder` → select the project folder.

### 2. Open the integrated terminal
- Go to `Terminal > New Terminal` in VS Code (or press `` Ctrl+` ``).

### 3. Install dependencies
Run this in the terminal:
```bash
npm install
```
This installs Express, Mongoose, CORS, dotenv, and nodemon (dev tool).

### 4. Set up environment variables
- Copy `.env.example` and rename the copy to `.env`.
- Open `.env` and confirm/update the values:
```
MONGO_URI=mongodb://127.0.0.1:27017/cyber_safety_helpdesk
PORT=5000
```
- If you're using **MongoDB Atlas** instead of a local database, paste your Atlas
  connection string as `MONGO_URI` (found in Atlas under "Connect" → "Drivers").

### 5. Start MongoDB (if running locally)
- **Windows**: MongoDB usually runs as a service automatically after installation.
  If not, run `mongod` in a separate terminal.
- **Mac/Linux**: run `mongod` in a separate terminal, or `brew services start mongodb-community`.
- If you're using **Atlas**, you can skip this step — it's already running in the cloud.

### 6. Run the server
For normal use:
```bash
npm start
```
For development (auto-restarts on file changes):
```bash
npm run dev
```

You should see in the terminal:
```
✅ MongoDB connected: 127.0.0.1
🛡️  Community Helpdesk for Cyber Safety server running on http://localhost:5000
```

### 7. View the website
Open your browser and go to:
```
http://localhost:5000
```
The Express server serves both the frontend (from `/client`) and the backend API
from the same port — no separate frontend server needed.

---

## 🔌 API Endpoints

| Method | Endpoint             | Description                                  |
|--------|-----------------------|-----------------------------------------------|
| POST   | `/api/helpdesk`       | Submit a new helpdesk request                 |
| GET    | `/api/helpdesk`       | Retrieve all helpdesk requests (admin panel)  |
| GET    | `/api/helpdesk/:id`   | Retrieve a single helpdesk request            |
| PATCH  | `/api/helpdesk/:id`   | Update a request's status                     |
| POST   | `/api/contact`        | Submit a contact form message                 |
| GET    | `/api/contact`        | Retrieve all contact messages (admin panel)   |
| GET    | `/api/health`         | Server health check                           |

You can test the admin-style GET endpoints directly in your browser, e.g.:
```
http://localhost:5000/api/helpdesk
```
This returns all submitted helpdesk requests as JSON — useful for building or
demonstrating a simple admin panel.

---

## 🖥️ How the Project Works (for your presentation)

1. **Frontend** — Static HTML/CSS/JS pages provide cyber safety education (tips,
   threats, FAQ) and two forms (Helpdesk, Contact).
2. **Client-side JavaScript** (`script.js`) validates form fields (name, email format,
   minimum lengths) before sending data, handles the mobile nav menu, FAQ accordion,
   safety-tip category tabs, and smooth scrolling.
3. When a form is submitted, JavaScript sends a `fetch()` POST request with JSON data
   to the Express backend (e.g., `/api/helpdesk`).
4. **Express routes** validate the data again on the server side, then use **Mongoose**
   to save it as a document in **MongoDB**.
5. The server responds with a success/error JSON message, and the frontend shows a
   success banner or highlights form errors accordingly.
6. The `GET /api/helpdesk` and `GET /api/contact` endpoints let an administrator
   retrieve all stored submissions — the foundation of a simple admin panel.

---

## 🎨 Design Notes

- Dark-blue, technology-inspired theme using CSS variables for easy re-theming.
- Fully responsive: mobile hamburger menu, fluid grids, and breakpoints at 900px,
  768px, and 480px.
- Smooth hover animations on cards, buttons, and nav links.
- Inline SVG icons (no external icon library needed — works offline).

---

## 📌 Notes on Content

The **Common Cyber Threats** page is written strictly for **awareness and
prevention**. It explains how scams typically work at a conceptual level and how to
protect yourself — it does not provide any instructions for carrying out illegal
activity.

---

## 🧑‍🎓 Ideal For

This project is designed to be simple enough for a student to fully understand,
explain, and demonstrate live during a Computer Science CEP presentation, while still
demonstrating a complete full-stack workflow: frontend → API → database.

---

## 📄 License

MIT — free to use and modify for educational purposes.
