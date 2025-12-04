# Sync - Real-time Collaborative Todo List

A shared todo list where multiple users can add, edit, and check off items simultaneously with live updates.

## Tech Stack

| Layer     | Technology                    |
| --------- | ----------------------------- |
| Frontend  | React + TypeScript + Vite     |
| Backend   | Node.js + Express + TypeScript|
| Real-time | Socket.io (Phase 2)           |
| Database  | PostgreSQL + Redis            |
| Auth      | TBD (Phase 2)                 |

## Project Structure

```
├── frontend/          # React application
├── backend/           # Express API server
├── shared/            # Shared TypeScript types
├── docker-compose.yml # Local development services
└── .github/workflows/ # CI/CD configuration
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm 9+

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
   cp backend/.env.example backend/.env
   ```

5. **Run database migrations**
   ```bash
   npm run db:migrate --workspace=@sync/backend
   ```

6. **Seed the database (optional)**
   ```bash
   npm run db:seed --workspace=@sync/backend
   ```

7. **Start development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend in development mode |
| `npm run dev:frontend` | Start only the frontend |
| `npm run dev:backend` | Start only the backend |
| `npm run build` | Build all packages |
| `npm run lint` | Run ESLint on all packages |
| `npm run test` | Run tests |

## API Endpoints

### Todos
- `GET /api/todos?listId=<uuid>` - Get todos by list
- `POST /api/todos` - Create a todo
- `PATCH /api/todos/:id` - Update a todo
- `DELETE /api/todos/:id` - Delete a todo
- `PATCH /api/todos/:id/toggle` - Toggle completion
- `PATCH /api/todos/:id/reorder` - Reorder a todo

### Lists
- `GET /api/lists` - Get all lists
- `GET /api/lists/:id` - Get a list by ID
- `POST /api/lists` - Create a list
- `PATCH /api/lists/:id` - Update a list
- `DELETE /api/lists/:id` - Delete a list

### Users
- `GET /api/users/:id` - Get a user by ID
- `POST /api/users` - Create a user
- `POST /api/users/find-or-create` - Find or create user by email

## Development Phases

- [x] **Phase 1**: Foundation - Basic CRUD, REST API
- [ ] **Phase 2**: Real-time - Socket.io integration
- [ ] **Phase 3**: Authentication - User auth & permissions
- [ ] **Phase 4**: Collaboration - Presence, conflict resolution
- [ ] **Phase 5**: Polish - UI/UX improvements, deployment

## License

MIT
