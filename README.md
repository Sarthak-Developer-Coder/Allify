
<div align="left" style="position: relative;">
  
<div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
  <div>
	<h1>Allify - MERN Chatting Application</h1>
	<em>Where chatting, fun, and friends come alive</em>
	<p>A full-stack MERN (MongoDB, Express.js, React.js, Node.js, Socket.IO) online chatting application 💬 with friends additionally with a Personal Chatbot. 🤖</p>
  </div>
  
</div>
	
### Allify is a chat-app with various features like:
-   🔐 **Authentication**:  
    ✨ SignUp,  
    🔑 Login,  
    📲 Login with OTP,  
    📸 Profile Photo Uploading.
    
-   🎨 **Styling/Theming**:  
    🌐 A fully responsive app,  
    🌙 Dark and ☀️ Light mode.
    
-   🤖 **Personalized AI Chatbot**:  
    🧠 Remembers the context for personalized interactions.
    
-   🌐 **Web Sockets**:  
    💬 Real-time chatting,  
    🔔 Message Notifications,  
    🖋️ Real-Time Typing Animation,  
    ❌ Message Deletion,  
    🟢 Active Now / ⌛ Last Seen status tracking,  
    ✅ Message Seen status,  
    🖼️ Sending Image messages with captions.

</p>

<p align="left">
	<img src="https://img.shields.io/github/license/pankil-soni/mern-chat-app?style=flat&logo=opensourceinitiative&logoColor=white&color=0080ff" alt="license">
	<img src="https://img.shields.io/github/last-commit/pankil-soni/mern-chat-app?style=flat&logo=git&logoColor=white&color=0080ff" alt="last-commit">
	<img src="https://img.shields.io/github/languages/top/pankil-soni/mern-chat-app?style=flat&color=0080ff" alt="repo-top-language">
	<img src="https://img.shields.io/github/languages/count/pankil-soni/mern-chat-app?style=flat&color=0080ff" alt="repo-language-count">
</p>
<p align="left">Built with the tools and technologies:</p>
<p align="left">
	
![npm](https://img.shields.io/badge/npm-CB3837.svg?style=flat&logo=npm&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-%2347A248.svg?style=flat&logo=mongodb&logoColor=white) ![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB) [![Node.js](https://img.shields.io/badge/Node.js-%23339933.svg?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/) [![HTML/CSS](https://img.shields.io/badge/HTML%2FCSS-%23239120.svg?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML) [![Express.js](https://img.shields.io/badge/Express.js-%23000000.svg?style=flat&logo=express&logoColor=white)](https://expressjs.com/) [![Socket.IO](https://img.shields.io/badge/Socket.IO-%23000000.svg?style=flat&logo=socket.io&logoColor=white)](https://socket.io/) ![Amazon S3](https://img.shields.io/badge/Amazon%20S3-FF9900?style=flat&logo=amazons3&logoColor=white)  [![Docker](https://img.shields.io/badge/Docker-%232496ED.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com/) 
</p>
</div>

**Guest User login accounts:**
```
username : guestuser1@gmail.com, guestuser2@gmail.com
password: 1234guest
```

---
<div align="left" style="position: relative;">

<div style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 16px;">
	<div>
		<h1>Allify — Modern MERN Chat Platform</h1>
		<em>Where chatting, fun, and friends come alive.</em>
		<p>
			A full‑stack MERN (MongoDB, Express, React, Node) realtime chat with Socket.IO, media uploads, AI assistant, and a delightful UI/UX (Chakra UI + Framer Motion).
		</p>
	</div>
	
</div>

<p align="left">
	<img alt="license" src="https://img.shields.io/badge/License-MIT-0080ff?logo=opensourceinitiative&logoColor=white" />
	<img alt="stack"   src="https://img.shields.io/badge/Stack-MERN%20%2B%20Socket.IO%20%2B%20Chakra-0080ff" />
	<img alt="node"    src="https://img.shields.io/badge/Node-18%2B-0080ff?logo=node.js&logoColor=white" />
</p>

</div>

---

## 🔗 Table of Contents

- Overview
- Screenshots
- Features
- Architecture
- Project Structure
- Getting Started
- Quickstart (Recruiters)
- Author
- License

---

## 📍 Overview

Allify is a Snapchat‑inspired, production‑ready chat experience. Beyond DMs and groups, it layers Stories, Snaps, Streaks, Reactions, Memories, Spotlight/Discover, Map, Notifications, Admin tools, and a Personal AI Assistant. The frontend is React 18 + Chakra UI + Framer Motion with tasteful effects (Lamp glow on Home, animated Butterflies behind routes). The backend is Node/Express + MongoDB with Socket.IO, Cloudinary/AWS S3, web-push, and optional Google Generative AI.





## 👾 Features

- Authentication
	- Email/password; OTP login; profile photo
- Realtime chat (Socket.IO)
	- DMs, typing indicator, read receipts, online/last‑seen, delete for me/everyone
	- Image messages with captions
- Social layer
	- Snaps, Stories, Streaks, Reactions, Memories, Spotlight/Discover, Best friends & snap score
- Assistant & Utilities
	- Personal AI assistant with memory; captions; reminders; notifications (web‑push)
- Media & Cloud
	- Cloudinary/AWS S3 uploads; transforms; HLS music rooms; map with Leaflet
- Security & Reliability
	- AES‑GCM encryption for sensitive payloads; scheduler for cleanups; audit logs
- Delightful UI/UX
	- Chakra theme, Motion buttons, Animated route transitions, Lamp effect, Butterflies


## 🧱 Architecture (high‑level)

- Frontend: React 18 (CRACO) + Chakra UI + Framer Motion + React Router v6
- Backend: Node.js/Express + MongoDB/Mongoose + Socket.IO
- Media/Cloud: Cloudinary and/or AWS S3 for assets; web-push for notifications
- Optional AI: Google Generative AI / Vertex AI


## 📁 Project Structure (abridged)

```
root/
	backend/    # Express API, models, routes, sockets
	frontend/   # React app (Chakra + Motion), effects
	screenshots/ # repo images used in README
```


## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- MongoDB connection string
- Cloudinary or AWS S3 creds (for media)
- Optional: VAPID keys for push; Google AI key

### Env setup
From repo root, copy the template and fill values:

```powershell
Copy-Item .env.example backend/.env
```

Key vars (see `.env.example`):
- Backend: PORT, MONGO_URI, JWT_SECRET, CLOUDINARY_*, AWS_*, EMAIL/PASSWORD, VAPID_*
- Frontend: REACT_APP_API (defaults to http://localhost:5000)

### Install & Run (dev)

```powershell
# backend
cd .\backend; npm i; npm run dev

# new terminal → frontend
cd ..\frontend; npm i; npm start
```

Frontend runs on 3001; API on 5000 by default.

### Build

```powershell
cd .\frontend; npm run build
```


## ⚡ Quickstart (recruiters)

1) Copy envs: `Copy-Item .env.example backend/.env` and add your Mongo URI + JWT secret at minimum.
2) Start API: `cd .\backend; npm i; npm run dev`.
3) Start UI: open a new terminal → `cd ..\\frontend; npm i; npm start`.
4) Login and explore: Dashboard → chats, images, typing, read receipts; try Stories/Snaps.


## 👤 Author

- Name: Sarthak Nag
- Role: Full‑Stack Developer (MERN) | Realtime systems | UI/UX polish
- Email: sarthakthesde@gmail.com
- GitHub: https://github.com/Sarthak-Developer-Coder
- LinkedIn: https://www.linkedin.com/in/sarthaknag/


## 🎗 License

MIT — free to use, remix, and learn.
    │       │   ├── Dashboard
