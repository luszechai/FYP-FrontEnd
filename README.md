# SFU Admission Chatbot Frontend

A modern, responsive React frontend application for the Saint Francis University (SFU) Admission Chatbot. This application provides an intuitive chat interface for students to inquire about admissions, courses, programs, faculty, and more.

## 📋 Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Development](#development)
- [Building for Production](#building-for-production)
- [API Integration](#api-integration)
- [Components](#components)
- [Styling](#styling)
- [Troubleshooting](#troubleshooting)
- [Technologies](#technologies)

## ✨ Features

- 🎨 **Modern UI Design** - Beautiful, gradient-based interface with smooth animations
- 💬 **Real-time Chat** - Interactive chat interface with message bubbles
- 📊 **Statistics Dashboard** - View session statistics including response times, hit rates, and query metrics
- 📜 **Conversation History** - Access and review past conversations
- 🎯 **Markdown Support** - Renders formatted responses with markdown (bold, italic, lists, etc.)
- 📱 **Responsive Design** - Fully responsive layout that works on desktop, tablet, and mobile devices
- ⚡ **Fast Performance** - Built with Vite for lightning-fast development and optimized builds
- 🔄 **Auto-scroll** - Automatically scrolls to latest messages
- 🎭 **Loading States** - Visual feedback during API requests
- 🗑️ **Memory Management** - Clear conversation history with one click

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.0 or higher ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager
- **Backend API Server** running on `http://localhost:8000` (see [Backend README](../FYP-BackEnd/README_API.md))

## 🚀 Installation

1. **Clone or navigate to the frontend directory:**
   ```bash
   cd FYP-FrontEnd
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   
   This will install all required packages including:
   - React 18
   - Vite
   - Tailwind CSS
   - Axios
   - React Markdown
   - Lucide React icons

3. **Configure environment variables (optional):**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_API_URL=http://localhost:8000
   ```
   
   If not specified, the app defaults to `http://localhost:8000`

## 🏃 Getting Started

### Development Mode

1. **Start the backend API server first:**
   ```bash
   # In FYP-BackEnd directory
   python api_server.py
   ```

2. **Start the frontend development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

The development server will automatically reload when you make changes to the code.

## 📁 Project Structure

```
FYP-FrontEnd/
├── public/                 # Static assets (if any)
├── src/
│   ├── components/        # React components
│   │   ├── ChatMessage.jsx      # Message display component
│   │   ├── HistoryModal.jsx    # Conversation history modal
│   │   └── StatsModal.jsx       # Statistics dashboard modal
│   ├── services/          # API service layer
│   │   └── api.js         # API client and endpoints
│   ├── App.jsx           # Main application component
│   ├── main.jsx          # React entry point
│   └── index.css         # Global styles and Tailwind imports
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── postcss.config.js    # PostCSS configuration
└── README.md           # This file
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# API Server URL
VITE_API_URL=http://localhost:8000
```

**Note:** All environment variables must be prefixed with `VITE_` to be accessible in the frontend code.

### Vite Configuration

The Vite configuration (`vite.config.js`) includes:
- React plugin for JSX support
- Development server on port 3000
- Proxy configuration for API requests (redirects `/api/*` to backend)

### Tailwind Configuration

Custom Tailwind theme is configured in `tailwind.config.js` with:
- Custom primary color palette (blue/indigo gradients)
- Extended color system
- Responsive breakpoints

## 💻 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

### Development Tips

1. **Hot Module Replacement (HMR)** - Changes are reflected instantly
2. **React DevTools** - Install browser extension for debugging
3. **Console Logging** - Check browser console for API errors
4. **Network Tab** - Monitor API requests in browser DevTools

## 🏗️ Building for Production

1. **Build the application:**
   ```bash
   npm run build
   ```
   
   This creates an optimized production build in the `dist/` directory.

2. **Preview the production build:**
   ```bash
   npm run preview
   ```

3. **Deploy:**
   - The `dist/` folder contains all static files
   - Deploy to any static hosting service (Vercel, Netlify, GitHub Pages, etc.)
   - Update `VITE_API_URL` to point to your production API server

## 🔌 API Integration

The frontend communicates with the backend API through the service layer in `src/services/api.js`.

### Available API Methods

- `chat(query, useMemory)` - Send a chat message
- `chatStream(query, useMemory, onChunk)` - Stream chat response (SSE)
- `clearMemory()` - Clear conversation memory
- `getStats()` - Get session statistics
- `getHistory()` - Get conversation history

### API Endpoints

The frontend expects the following backend endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send chat message and receive response |
| POST | `/api/chat/stream` | Stream chat response (Server-Sent Events) |
| POST | `/api/clear` | Clear conversation memory |
| GET | `/api/stats` | Get session statistics |
| GET | `/api/history` | Get conversation history |

## 🧩 Components

### App.jsx
Main application component that manages:
- Message state
- Loading states
- Modal visibility
- Chat input handling
- API integration

### ChatMessage.jsx
Displays individual chat messages with:
- User/Assistant distinction
- Markdown rendering
- Performance metrics
- Timestamp display
- Source count

### StatsModal.jsx
Statistics dashboard showing:
- Total queries
- Average response time
- Hit rate percentage
- Average similarity scores
- Recent query history

### HistoryModal.jsx
Conversation history viewer displaying:
- Past user queries
- Bot responses
- Full conversation context

## 🎨 Styling

The application uses **Tailwind CSS** for styling with:
- Custom color palette (blue/indigo gradients)
- Responsive utilities
- Custom markdown prose styles
- Smooth animations and transitions

### Custom CSS

Additional styles in `src/index.css`:
- Custom scrollbar styling
- Markdown prose styles
- Global font settings
- Code block styling

## 🐛 Troubleshooting

### Common Issues

**1. Cannot connect to API**
- Ensure backend server is running on port 8000
- Check `VITE_API_URL` in `.env` file
- Verify CORS settings in backend
- Check browser console for errors

**2. Port 3000 already in use**
- Vite will automatically use the next available port
- Or specify a different port: `npm run dev -- --port 3001`

**3. Markdown not rendering**
- Ensure `react-markdown` and `remark-gfm` are installed
- Run `npm install` to install dependencies

**4. Styles not applying**
- Clear browser cache
- Restart development server
- Check Tailwind configuration

**5. Build errors**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Check Node.js version (requires 18+)

### Debugging

1. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for errors in Console tab
   - Check Network tab for failed API requests

2. **Check Terminal:**
   - Look for compilation errors
   - Check for missing dependencies

3. **Verify Backend:**
   - Ensure API server is running
   - Test endpoints with Postman or curl
   - Check backend logs for errors

## 🛠️ Technologies

### Core
- **React 18** - UI library
- **Vite 5** - Build tool and dev server
- **JavaScript (ES6+)** - Programming language

### Styling
- **Tailwind CSS 3** - Utility-first CSS framework
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

### HTTP & API
- **Axios** - HTTP client for API requests

### Markdown
- **React Markdown** - Markdown renderer for React
- **Remark GFM** - GitHub Flavored Markdown support

### Icons
- **Lucide React** - Icon library

### Development
- **@vitejs/plugin-react** - Vite plugin for React
- **TypeScript types** - Type definitions for React

## 📝 License

This project is part of the Final Year Project (FYP) for Saint Francis University.

## 🤝 Contributing

This is an academic project. For questions or issues, please contact the project maintainer.

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review backend API documentation
3. Check browser console for errors
4. Verify backend server is running

---

**Built with ❤️ for Saint Francis University**
