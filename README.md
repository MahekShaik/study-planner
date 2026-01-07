# Adapta AI 📚

**Adapta AI** is an intelligent, full-stack study planning application designed to help students prepare for exams with AI-powered personalized study plans, interactive learning sessions, quizzes, and progress tracking.

---

## 📖 Overview

Adapta AI combines modern web technologies with AI to create a stress-free learning experience. The application adapts to your schedule, learning style, and exam dates to generate optimized study plans.

### Key Features

- 🎯 **AI-Powered Holistic Plans**: Generate study schedules that balance multiple simultaneous goals (Exams & Skills) within your daily capacity.
- 📅 **Smart Dual-View Calendar**: Toggle between a compact horizontal strip and a 4-week grid view, with subject-specific color-coding for tasks and deadlines.
- ⚡ **Priority-Based Scaling**: Automatically prioritizes exams with closer deadlines using a "70/30 Rule" for daily time allocation.
- 🏔️ **Crunch & Mood Adaptation**: Adjusts intensity based on your mood (High energy = Complex topics) and activates "Crunch Mode" for imminent exams.
- ✍️ **Premium UI Elements**: Includes custom numeric steppers for daily hours and a glassmorphism design language throughout.
- 🧠 **Intelligent Quizzes**: Practice with AI-generated quizzes and get instant feedback
- 💬 **AI Tutor Chat**: Get help anytime with an AI-powered study assistant
- 📊 **Progress Tracking**: Monitor your learning journey through insights and analytics

---

## 🛠️ Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for modern, responsive styling
- **Framer Motion** for smooth animations
- **Lucide React** for beautiful icons

### Backend
- **Node.js** with Express
- **Azure Cosmos DB** for data persistence
- **Google Gemini AI** (gemini-2.5-flash) for AI features
- **bcrypt** for secure password hashing
- **CORS** enabled for cross-origin requests

### AI Integration
- Google Generative AI for study plan generation, quiz creation, chat assistance, and content generation
- Azure OpenAI (optional) for revision content generation

---

## 📂 Project Structure

```
study-planner/
├── backend/
│   ├── server.js              # Express server with API endpoints
│   ├── db.js                  # Cosmos DB client and database operations
│   ├── package.json           # Backend dependencies
│   ├── .env                   # Environment variables (not tracked)
│   └── .env.example           # Example environment configuration
│
├── frontend/
│   ├── components/            # React components
│   │   ├── AuthScreen.tsx     # Login/Signup screen
│   │   ├── OnboardingView.tsx # Study plan creation wizard
│   │   ├── StudyDashboard.tsx # Main dashboard with tasks
│   │   ├── CalendarView.tsx   # Calendar visualization
│   │   ├── LearningView.tsx   # Interactive learning sessions
│   │   ├── QuizScreen.tsx     # Quiz interface
│   │   ├── ChatView.tsx       # AI tutor chat
│   │   ├── ResourcesView.tsx  # Study resources
│   │   ├── InsightsPanel.tsx  # Progress analytics
│   │   ├── UserProfile.tsx    # User profile management
│   │   ├── LandingPage.tsx    # Marketing landing page
│   │   └── ui/                # Reusable UI components
│   │
│   ├── services/
│   │   └── geminiService.ts   # API client for backend
│   │
│   ├── App.tsx                # Main application component
│   ├── types.ts               # TypeScript type definitions
│   ├── constants.ts           # Application constants
│   ├── index.css              # Global styles
│   ├── vite.config.ts         # Vite configuration
│   ├── tailwind.config.js     # Tailwind CSS configuration
│   └── package.json           # Frontend dependencies
│
├── README.md                  # This file
└── .gitignore                 # Git ignore rules
```

---

### 🚀 Quick Start Setup

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download](https://git-scm.com/)

You'll also need:
- **Google Gemini API Key** - Get one from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Azure Cosmos DB** - Either:
  - [Azure Cosmos DB Emulator](https://learn.microsoft.com/en-us/azure/cosmos-db/local-emulator) (for local development)
  - [Azure Cosmos DB account](https://portal.azure.com/) (for production)

---

## 📥 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/geetha0108/study-planner.git
cd study-planner
```

### 2. Backend Setup

#### Install Dependencies

```bash
cd backend
npm install
```

#### Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# For Windows PowerShell
Copy-Item .env.example .env

# For macOS/Linux
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Google Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here
API_KEY=your_gemini_api_key_here

# Azure Cosmos DB Configuration
# For local development with Cosmos DB Emulator:
COSMOS_ENDPOINT=https://localhost:8081
COSMOS_KEY=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==

# For production with Azure Cosmos DB:
# COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
# COSMOS_KEY=your_cosmos_db_primary_key

COSMOS_DATABASE_NAME=Adapta
COSMOS_USERS_CONTAINER=users
COSMOS_ONBOARDING_CONTAINER=onboarding

# Server Configuration
PORT=3001

# Azure OpenAI (Optional - for revision content)
# AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
# AZURE_OPENAI_KEY=your_azure_openai_key
# AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name
```

#### Start the Backend Server

```bash
npm start
```

The backend server will start on `http://localhost:3001`

You should see:
```
Database 'Adapta' ready
Container 'users' ready
Container 'onboarding' ready
Container 'tasks' ready
Adapta backend running on http://localhost:3001
```

### 3. Frontend Setup

Open a new terminal window/tab:

#### Install Dependencies

```bash
cd frontend
npm install
```

#### Configure Environment Variables

Create a `.env.local` file in the `frontend` directory:

```bash
# The frontend doesn't need API keys - it proxies to the backend
# Vite will use the proxy configuration in vite.config.ts
```

**Note**: The frontend uses Vite's proxy feature to communicate with the backend. No additional environment variables are needed for local development.

#### Start the Development Server

```bash
npm run dev
```

The frontend will start on `http://localhost:3000`

---

## 🎮 Using the Application

1. **Open your browser** and navigate to `http://localhost:3000`
2. **Sign Up** for a new account or **Log In** if you already have one
3. **Create a Study Plan**:
   - Choose between "Exam Mode" or "Skill Building"
   - Enter your exam details (subject, syllabus, exam date) or skill information
   - Set your daily study hours
   - Let the AI generate your personalized study plan
4. **Start Learning**:
   - View your tasks on the dashboard
   - Click "Start Learning" to access AI-generated content
   - Take quizzes to test your knowledge
   - Chat with the AI tutor when you need help
5. **Track Progress**:
   - View your calendar to see upcoming tasks
   - Check the Insights panel for analytics
   - Update your profile settings

---

## 🔧 Configuration Details

### Database Setup

#### Using Cosmos DB Emulator (Local Development)

1. **Download and Install** the [Azure Cosmos DB Emulator](https://learn.microsoft.com/en-us/azure/cosmos-db/local-emulator)
2. **Start the Emulator** (it will run on `https://localhost:8081`)
3. Use the default emulator key in your `.env` file (already provided in `.env.example`)

**Note**: The emulator uses a self-signed certificate. The application disables SSL verification for local development (see `db.js` line 6). **Remove this in production!**

#### Using Azure Cosmos DB (Production)

1. **Create a Cosmos DB account** in the [Azure Portal](https://portal.azure.com/)
2. **Get your connection details**:
   - Endpoint: Found in "Keys" section (e.g., `https://your-account.documents.azure.com:443/`)
   - Primary Key: Also in "Keys" section
3. **Update your `.env` file** with these values
4. **Comment out** the `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';` line in `db.js`

### API Keys

#### Google Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add it to your `backend/.env` file

**Important**: Keep your API key secure. Never commit it to version control.

---

## 🏗️ Building for Production

### Frontend Build

```bash
cd frontend
npm run build
# Creates optimized build in dist/


# Backend for production
cd ../backend
NODE_ENV=production node server.js
```
