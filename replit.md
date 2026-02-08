# Construction Work Tracker

## Overview

A construction project management application for tracking work groups, individual tasks, progress, costs, and scheduling. Built as a full-stack TypeScript application with React frontend and Express backend, using PostgreSQL for data persistence. The application is designed for Russian-speaking users managing construction projects with features for work tracking, holiday calendar management, and analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management with optimistic updates
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration (construction/industrial theme)
- **Animations**: Framer Motion for smooth transitions and progress animations
- **Charts**: Recharts for analytics visualization
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful API with shared route definitions between client and server
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Validation**: Zod schemas shared between frontend and backend via drizzle-zod integration
- **Session Management**: connect-pg-simple for PostgreSQL-backed sessions

### Data Layer
- **Database**: PostgreSQL
- **Schema Location**: `shared/schema.ts` - contains all table definitions and relations
- **Tables**:
  - `work_groups`: Categories of construction work (e.g., "Earthworks", "Foundation")
  - `works`: Individual work items with planned/actual metrics (days, volume, cost, dates, progress)
  - `holidays`: Calendar of non-working days for scheduling
  - `budget_columns`: Budget table columns with optional `stageId` to link with project stages
  - `budget_row_codes`: Many-to-many relationship linking budget rows with classifier codes for PDC integration
  - `stages`: Project stages for organizing PDC documents and budget columns
  - `project_photos`: Project site photos uploaded by admins/owners, served from `/uploads/photos/`

### Budget-PDC Integration (January 2026)
- **Budget columns** can be linked to project stages (`stageId` field)
- **Budget rows** (items) can be mapped to multiple classifier codes via `budget_row_codes` table
- **Actual cost calculation**: When a budget row has linked classifier codes, and a column has a linked stage, the system calculates actual costs from PDC groups that match both criteria
- **API endpoint**: `GET /api/budget-actual-costs/:projectId` returns aggregated actual costs by rowId + stageId
- **Display logic**: Budget cells show plan value (manual) and actual value from PDC with percentage variance; color-coded (red = over budget for expenses, green = under budget)

### Section Allocation System (January 2026)
- **PDC documents** support 1-10 building sections via `sectionsCount` field
- **Section allocations** stored in `section_allocations` table linking groups/elements to sections with coefficients
- **Coefficient-based distribution**: Each section gets a percentage (0-100%), sum must equal 100% with 0.1% tolerance
- **UI behavior**: Chevron toggle appears when sectionsCount > 1; expands to show section table with editable coefficients
- **Validation**: Red error indicators appear when coefficients don't sum to 100%; quantities show "ошибка" instead of calculated values
- **Auto-calculation**: Section quantities/totals auto-calculate from coefficients and parent values in real-time
- **Persistence**: Coefficients save on blur via POST /api/section-allocations, loaded via GET with query params

### KSP Page Section Expansion (January 2026)
- **Expandable work rows**: When PDC document has `sectionsCount > 1`, work rows in KSP show a chevron for expansion
- **Section row format**: Section rows display number as `{group.number}-{sectionNumber}с` (e.g., "1.1.2-1с", "1.1.2-2с")
- **Section dates**: Each section row shows its own dates from `work_section_progress` table (plan/actual start/end, duration)
- **Timeline charts**: Section rows have their own timeline charts with muted/faded colors (bg-blue-300/60, bg-red-300/60, bg-green-300/60, bg-[#c8a2c8]/50)
- **State management**: `expandedGroups` Set tracks which work groups are expanded
- **API extension**: `/api/works/tree` now includes `buildingSections` array in WorkTreeItem with per-section date data

### Shared Code Structure
- **`shared/schema.ts`**: Database schema definitions, Zod validation schemas, and TypeScript types
- **`shared/routes.ts`**: API contract definitions with input/output schemas for type-safe client-server communication

### Build System
- **Development**: Vite dev server with HMR, proxying API requests to Express backend
- **Production**: Custom build script using esbuild for server bundling and Vite for client bundling
- **Output**: Combined dist folder with server (`dist/index.cjs`) and static files (`dist/public/`)

### Key Design Patterns
1. **Type-Safe API Contract**: Routes defined once in `shared/routes.ts` with Zod schemas, consumed by both client hooks and server handlers
2. **Optimistic Updates**: React Query mutations invalidate queries on success for immediate UI feedback
3. **Progressive Enhancement**: Forms use React Hook Form with Zod resolver for client-side validation before server submission
4. **Component Composition**: UI built from small, reusable shadcn/ui components with consistent styling

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migrations stored in `/migrations` folder, pushed via `npm run db:push`

### UI Libraries
- **Radix UI**: Headless component primitives for accessibility
- **Lucide React**: Icon library
- **XLSX**: Excel export functionality for work data

### Development Tools
- **Replit Plugins**: Vite plugins for development banner and cartographer (Replit-specific features)
- **Runtime Error Overlay**: `@replit/vite-plugin-runtime-error-modal` for development debugging