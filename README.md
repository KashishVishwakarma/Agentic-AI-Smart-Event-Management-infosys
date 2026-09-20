# agentic-ai-smart-event-management
Agentic AI for Smart Event Management Operations – Infosys Project
Here is a clean, professional `README.md` tailored specifically for your `frontend/` directory, complete with setup instructions, architectural details, and deployment guidelines:

```markdown
# Pulse Events — Frontend Web Application

A modern, responsive, and autonomous event management web client built with vanilla HTML5, Tailwind CSS, Lucide Icons, and modern JavaScript (ES6+). The frontend connects to an autonomous Agentic AI FastAPI backend hosted on Render, enabling real-time ticket reservations, venue administration, and interactive AI agent interactions.

---

## 🌟 Key Features

- **Event Discovery & Roster**: Live feed of active scheduled campus events, complete with venue assignments, real-time seat capacities, and status tracking.
- **Direct Seat Reservation**: Authenticated one-click ticket booking with automatic updates to available seats.
- **Venue Management**: Administrators can register campus facilities and auditoriums with assigned seating limits.
- **Autonomous AI Concierge**: Embedded chat assistant capable of understanding natural language requests (e.g., querying scheduled sessions, booking seats, and handling cancellations).
- **Personal Pass Manager**: Real-time inspection of booked events and one-click ticket cancellation.
- **Zero Build Step**: Built using lightweight CDN architecture for instant browser parsing, fast load times, and effortless static hosting on Vercel or GitHub Pages.

---

## 📁 File Structure

```text
frontend/
├── index.html        # Main single-page application layout, modals, and views
├── style.css         # Glassmorphism accents, scrollbar styles, and typography
├── app.js            # Core client logic, state management, and API integration
└── README.md         # Documentation

```

---

## ⚙️ Configuration & Backend Connection

The frontend communicates with the FastAPI backend through the base URL configured in `app.js`:

```javascript
const API_BASE = "[https://agentic-ai-smart-event-management-infosys.onrender.com](https://agentic-ai-smart-event-management-infosys.onrender.com)";

```

### Integrated Endpoints:

| Feature | Endpoint | Method | Auth Required |
| --- | --- | --- | --- |
| **User Sign Up** | `/api/auth/register` | `POST` | No |
| **User Login** | `/api/auth/login` | `POST` | No |
| **Current User** | `/api/auth/me` | `GET` | Yes (Bearer Token) |
| **List Events** | `/api/events` | `GET` | No |
| **Create Event** | `/api/events` | `POST` | Yes (Admin) |
| **Book Ticket** | `/api/events/{event_id}/register` | `POST` | Yes (User/Admin) |
| **Cancel Ticket** | `/api/events/{event_id}/register` | `DELETE` | Yes (User/Admin) |
| **My Tickets** | `/api/registrations/me` | `GET` | Yes (User/Admin) |
| **List Venues** | `/api/venues` | `GET` | No |
| **Add Venue** | `/api/venues` | `POST` | Yes (Admin) |
| **AI Concierge** | `/api/chat` | `POST` | Yes (User/Admin) |

---

## 🚀 Local Development

Since there is no bundler (Webpack/Vite) or package manager required, you can run the application directly using any local web server:

### Option 1: Python HTTP Server

```bash
cd frontend
python -m http.server 3000

```

Open [http://localhost:3000](http://localhost:3000?utm_source=gemini) in your browser.

### Option 2: VS Code Live Server

1. Install the **Live Server** extension in VS Code.
2. Right-click `index.html` and select **"Open with Live Server"**.

---

## 🌐 Deployment to Vercel

1. Push your code to your GitHub repository.
2. In the **Vercel Dashboard**, import your project.
3. Configure the following project settings:
* **Framework Preset**: `Other`
* **Root Directory**: `frontend` *(or leave as `./` if `index.html` sits at the repo root)*
* **Build Command**: *Leave blank / Disabled*
* **Output Directory**: *Leave blank / Disabled*


4. Click **Deploy**.

---

## 🔐 Default Admin Credentials

For testing admin features (creating venues and scheduling events):

* **Email**: `admin@eventsystem.com`
* **Password**: `password123`

```

Save this file as **`frontend/README.md`** and commit it to your repository.

```
Live Demo
--
frontend-> https://agentic-ai-smart-event-management-i-blond.vercel.app/
