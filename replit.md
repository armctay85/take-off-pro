# Take-off Pro

## Overview

Take-off Pro is a professional project management application designed for construction and project planning workflows. The system provides comprehensive tools for managing projects, tasks, resources, and critical path analysis with real-time collaboration capabilities. Built as a full-stack web application, it combines a React-based frontend with an Express backend, using PostgreSQL for data persistence and WebSockets for live updates.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**: React with TypeScript, using Vite as the build tool and development server.

**UI Framework**: The application uses shadcn/ui components built on Radix UI primitives, styled with Tailwind CSS. This provides a consistent, accessible, and customizable component library throughout the application.

**State Management**: TanStack Query (React Query) handles server state management, providing automatic caching, background refetching, and optimistic updates. The query client is configured with infinite stale time and disabled automatic refetching to give developers explicit control over data freshness.

**Routing**: Wouter provides lightweight client-side routing. The application uses a protected route pattern where unauthenticated users see a landing page, while authenticated users access the main application with sidebar navigation.

**Form Handling**: React Hook Form combined with Zod validation schemas ensures type-safe form handling with comprehensive validation before submission.

**Real-time Features**: Custom WebSocket hooks enable live collaboration features, allowing multiple users to see updates to tasks and resource assignments in real-time.

### Backend Architecture

**Server Framework**: Express.js running on Node.js, configured with middleware for JSON parsing, CORS, and session management.

**Database Layer**: Drizzle ORM provides type-safe database access to PostgreSQL (specifically configured for Neon Database serverless). The schema defines tables for projects, tasks, resources, resource assignments, critical paths, users, and sessions.

**Authentication**: Replit's OpenID Connect (OIDC) integration via Passport.js handles user authentication. Sessions are stored in PostgreSQL using connect-pg-simple, providing persistent login state across server restarts.

**API Design**: RESTful API endpoints organized by resource type (projects, tasks, resources). All routes except health checks require authentication middleware.

**Real-time Communication**: WebSocket server (using ws library) runs alongside the HTTP server on a separate path (`/ws/collaboration`) to avoid conflicts with Vite's HMR. The collaboration service broadcasts updates to connected clients filtered by project ID.

**Development vs Production**: In development, Vite middleware serves the frontend with hot module replacement. In production, the built frontend assets are served as static files from the dist directory.

### Data Model

**Core Entities**:
- **Projects**: Top-level containers with budget, timeline, and status tracking
- **Tasks**: Work items with dependencies, duration, and completion status linked to projects
- **Resources**: Team members or equipment with roles and hourly cost rates
- **Resource Assignments**: Many-to-many relationships between tasks and resources with allocated hours
- **Critical Paths**: Calculated sequences of dependent tasks that determine project duration
- **Users**: Authentication and profile information from Replit OIDC
- **Sessions**: Server-side session storage for authentication state

**Relationships**: Tasks belong to projects and can depend on other tasks. Resources are assigned to tasks through resource assignments. Critical paths reference both projects and tasks.

### Build and Deployment

**Development**: `npm run dev` starts tsx (TypeScript executor) which runs the Express server with Vite middleware for frontend development.

**Production Build**: Two-step process - Vite builds the frontend React application, then esbuild bundles the server code into ESM format with external packages.

**Type Checking**: TypeScript compiler checks types across client, server, and shared code without emitting files (handled by build tools).

**Database Migrations**: Drizzle Kit manages schema changes with `db:push` command, using the configuration in `drizzle.config.ts`.

### Code Organization

**Monorepo Structure**: Client, server, and shared code live in separate directories with TypeScript path aliases (`@/*` for client, `@shared/*` for shared types).

**Shared Schema**: Database schema and Zod validation schemas live in the shared directory, allowing both frontend and backend to use the same type definitions and validation rules.

**Component Library**: UI components are organized in `client/src/components/ui` with feature-specific components (projects, tasks, resources) in separate subdirectories.

## External Dependencies

### Database
- **PostgreSQL via Neon Database**: Serverless PostgreSQL with connection pooling (10 max connections, 20s idle timeout, 30min max lifetime)
- **Drizzle ORM**: Type-safe database queries and migrations

### Authentication
- **Replit OIDC**: OpenID Connect authentication using Replit's identity provider
- **Passport.js**: Authentication middleware with openid-client strategy
- **express-session**: Server-side session management with PostgreSQL storage

### UI Libraries
- **Radix UI**: Accessible, unstyled component primitives for dialogs, dropdowns, forms, etc.
- **Tailwind CSS**: Utility-first CSS framework with custom theme configuration
- **Lucide React**: Icon library
- **class-variance-authority & clsx**: Conditional class name utilities

### Data Fetching
- **TanStack Query**: Server state management with caching and synchronization
- **wouter**: Lightweight client-side routing

### Real-time Communication
- **ws**: WebSocket library for real-time collaboration features

### Development Tools
- **Vite**: Frontend build tool and development server
- **tsx**: TypeScript executor for development
- **esbuild**: Production server bundler
- **@replit/vite-plugin-shadcn-theme-json**: Theme configuration plugin
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Replit-specific development tooling

### Form Handling
- **React Hook Form**: Performant form state management
- **Zod**: Schema validation
- **@hookform/resolvers**: Integrates Zod with React Hook Form