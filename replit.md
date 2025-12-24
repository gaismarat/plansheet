# СтройКонтроль (Construction Control)

## Overview

A construction project management application for tracking work groups and individual construction tasks. The application allows users to manage work items with progress tracking, labor intensity monitoring, and analytics visualization. Built with a React frontend and Express backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Animations**: Framer Motion for smooth transitions and progress animations
- **Charts**: Recharts for analytics visualizations

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod validation
- **Development**: Vite dev server integration for hot module replacement
- **Production**: Static file serving from built assets

### Data Storage
- **Database**: PostgreSQL via `node-postgres` (pg)
- **ORM**: Drizzle ORM with Drizzle-Zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions and relations
- **Migrations**: Drizzle-kit for database schema management (`npm run db:push`)

### API Structure
The API follows a typed contract pattern defined in `shared/routes.ts`:
- `GET /api/work-groups` - List all work groups with nested works
- `POST /api/work-groups` - Create a new work group
- `DELETE /api/work-groups/:id` - Delete a work group
- `POST /api/works` - Create a new work item
- `PUT /api/works/:id` - Update work progress/details
- `DELETE /api/works/:id` - Delete a work item

### Shared Code Pattern
The `shared/` directory contains code used by both frontend and backend:
- `schema.ts` - Database schema, types, and Zod validation schemas
- `routes.ts` - API contract definitions with input/output types

### Build System
- **Development**: `tsx` for TypeScript execution, Vite for frontend HMR
- **Production Build**: esbuild bundles server, Vite builds client
- **Output**: `dist/` directory with `index.cjs` (server) and `public/` (client assets)

## External Dependencies

### Database
- **PostgreSQL**: Required via `DATABASE_URL` environment variable
- **Connection Pooling**: Uses `pg.Pool` for database connections
- **Session Storage**: `connect-pg-simple` for Express session persistence (if enabled)

### UI Libraries
- **Radix UI**: Full suite of accessible component primitives
- **Lucide React**: Icon library
- **Recharts**: Data visualization for analytics page

### Development Tools
- **Replit Plugins**: Dev banner, cartographer, and runtime error overlay for development
- **Vite**: Build tool and development server

### Key npm Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Run production build
- `npm run db:push` - Push schema changes to database