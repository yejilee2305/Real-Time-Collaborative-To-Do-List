# Sync - Real-time Collaborative Todo List

A full-featured, real-time collaborative todo application where multiple users can create, edit, and manage tasks simultaneously with live updates and conflict resolution.

## Features

- **Real-time Collaboration**: See changes from other users instantly via WebSockets
- **User Authentication**: Secure sign-in with Clerk (Google, GitHub, email)
- **Permission System**: Owner, Editor, and Viewer roles per list
- **Drag & Drop**: Reorder todos intuitively
- **Dark Mode**: System-aware theme with manual toggle
- **Mobile Responsive**: Works seamlessly on all devices
- **Offline Support**: Optimistic updates with sync on reconnect
- **Conflict Resolution**: Automatic handling of concurrent edits
- **Typing Indicators**: See when others are typing
- **Presence Awareness**: Know who's viewing the list

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────────────┐  │
│  │ Zustand │  │ Socket.io│  │  React  │  │  Clerk Auth      │  │
│  │  Store  │◄─┤  Client  │◄─┤ Router  │  │  (Authentication)│  │
│  └────┬────┘  └────┬─────┘  └─────────┘  └──────────────────┘  │
│       │            │                                             │
└───────┼────────────┼────────────────────────────────────────────┘
        │            │
        │  HTTP/REST │  WebSocket
        │            │
┌───────▼────────────▼────────────────────────────────────────────┐
│                       Backend (Express)                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  REST API   │  │  Socket.io   │  │  Rate Limiting         │  │
│  │  Controllers│  │  Server      │  │  (express-rate-limit)  │  │
│  └──────┬──────┘  └──────┬───────┘  └────────────────────────┘  │
│         │                │                                       │
│  ┌──────▼────────────────▼──────┐  ┌─────────────────────────┐  │
│  │       Services Layer          │  │  Clerk JWT Validation   │  │
│  │  (Business Logic)             │  │  (Authentication)       │  │
│  └──────────────┬───────────────┘  └─────────────────────────┘  │
│                 │                                                │
└─────────────────┼────────────────────────────────────────────────┘
                  │
┌─────────────────▼────────────────────────────────────────────────┐
│                       PostgreSQL Database                         │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐  ┌────────────────┐  │
│  │  users  │  │  lists   │  │list_members│  │  list_invites  │  │
│  └─────────┘  └──────────┘  └────────────┘  └────────────────┘  │
│  ┌─────────┐                                                     │
│  │  todos  │                                                     │
│  └─────────┘                                                     │
└──────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer     | Technology                     |
| --------- | ------------------------------ |
| Frontend  | React 18 + TypeScript + Vite   |
| Backend   | Node.js + Express + TypeScript |
| Real-time | Socket.io                      |
| Database  | PostgreSQL                     |
| Auth      | Clerk                          |
| Styling   | Tailwind CSS                   |
| State     | Zustand                        |
| DnD       | @dnd-kit                       |

## Project Structure

```
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── stores/        # Zustand state management
│   │   └── services/      # API & Socket services
│   └── Dockerfile
├── backend/               # Express API server
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # Route definitions
│   │   └── socket/        # Socket.io handlers
│   ├── migrations/        # Database migrations
│   └── Dockerfile
├── shared/                # Shared TypeScript types
├── docker-compose.yml     # Local development services
└── docker-compose.prod.yml # Production configuration
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm 9+
- Clerk account (for authentication)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd Real-Time-Collaborative-To-Do-List
   ```

2. **Start the database**
   ```bash
   docker-compose up -d
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up environment variables**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your Clerk keys

   # Frontend
   cp frontend/.env.example frontend/.env
   # Edit frontend/.env with your Clerk publishable key
   ```

5. **Run database migrations**
   ```bash
   npm run db:migrate --workspace=@sync/backend
   ```

6. **Start development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

## Environment Variables

### Backend (`backend/.env`)
```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sync_todo
FRONTEND_URL=http://localhost:5173
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Frontend (`frontend/.env`)
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend in development mode |
| `npm run dev:frontend` | Start only the frontend |
| `npm run dev:backend` | Start only the backend |
| `npm run build` | Build all packages |
| `npm run lint` | Run ESLint on all packages |
| `npm run db:migrate` | Run database migrations |

## API Endpoints

### Todos
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/todos?listId=<uuid>` | Get todos by list |
| POST | `/api/todos` | Create a todo |
| PATCH | `/api/todos/:id` | Update a todo |
| DELETE | `/api/todos/:id` | Delete a todo |
| PATCH | `/api/todos/:id/toggle` | Toggle completion |
| PATCH | `/api/todos/:id/reorder` | Reorder a todo |

### Lists
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lists/me` | Get current user's lists |
| GET | `/api/lists/:id` | Get a list by ID |
| POST | `/api/lists` | Create a list |
| PATCH | `/api/lists/:id` | Update a list |
| DELETE | `/api/lists/:id` | Delete a list |

### Members & Invites
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lists/:id/members` | Get list members |
| PATCH | `/api/lists/:id/members/:userId` | Update member role |
| DELETE | `/api/lists/:id/members/:userId` | Remove member |
| POST | `/api/lists/:id/invites` | Create invite |
| GET | `/api/lists/invites` | Get pending invites |
| POST | `/api/lists/invites/:token/accept` | Accept invite |
| POST | `/api/lists/invites/:token/decline` | Decline invite |

## Real-time Events (WebSocket)

### Client Events (sent to server)
- `join-list` - Join a todo list room
- `leave-list` - Leave a todo list room
- `todo:create` - Create a new todo
- `todo:update` - Update a todo
- `todo:delete` - Delete a todo
- `todo:reorder` - Reorder a todo
- `user:typing` - Send typing indicator

### Server Events (broadcast to clients)
- `todo:created` - Todo was created
- `todo:updated` - Todo was updated
- `todo:deleted` - Todo was deleted
- `todo:reordered` - Todo was reordered
- `presence:update` - User presence changed
- `user:typing` - User typing status changed

## Deployment

### Docker (Recommended)

1. **Build and run with Docker Compose**
   ```bash
   # Create a .env file with production values
   cp .env.example .env
   # Edit .env with production values

   # Build and start
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Run migrations**
   ```bash
   npm run db:migrate --workspace=@sync/backend
   ```

3. **Start the backend**
   ```bash
   NODE_ENV=production node backend/dist/index.js
   ```

4. **Serve the frontend**
   The `frontend/dist` folder contains static files that can be served by any static file server (nginx, Cloudflare Pages, Vercel, etc.)

## Development Phases

- [x] **Phase 1**: Foundation - Basic CRUD, REST API
- [x] **Phase 2**: Real-time - Socket.io integration, presence, typing indicators
- [x] **Phase 3**: Rooms & Collaboration - Shareable lists, user colors
- [x] **Phase 4**: Conflict Resolution - Optimistic updates, offline support
- [x] **Phase 5**: Auth & Persistence - Clerk authentication, permissions, invites
- [x] **Phase 6**: Polish & Deploy - Dark mode, drag & drop, rate limiting, Docker

## Security Features

- **Authentication**: JWT-based auth via Clerk
- **Authorization**: Role-based access control (Owner/Editor/Viewer)
- **Rate Limiting**: API endpoints protected against abuse
- **CORS**: Configured for frontend origin only
- **Helmet**: Security headers configured
- **Input Validation**: express-validator on all endpoints

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT
