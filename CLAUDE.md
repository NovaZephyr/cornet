# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Install dependencies**: `bun install`
- **Start development server**: `bun run dev`
- **Build for production**: `bun run build`
- **Build for development**: `bun run build:dev`
- **Preview production build**: `bun run preview`
- **Lint code**: `bun run lint`
- **Format code**: `bun run format`
- **Generate routes**: `bun run generate-routes`

## Code Architecture

### Technology Stack
- **Framework**: TanStack Start (React Router + Vite)
- **UI**: React with Tailwind CSS
- **State Management**: TanStack Query
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **UI Components**: Radix UI primitives + custom components
- **Build Tool**: Vite with Bun runtime
- **Language**: TypeScript

### Key Structural Components

#### Routing & Navigation
- File-based routing in `src/routes/` using TanStack Router
- Root layout in `src/routes/__root.tsx` provides:
  - Theme persistence and switching
  - Authentication provider
  - Maintenance mode handling
  - Global mobile bottom bar
  - Error boundaries and loading states

#### Theme System
- Sophisticated theme system in `src/design-library/`
- Supports normal themes and custom historical themes (YouTube 2012, 2019, etc.)
- Themes can activate specific channel layouts independently
- Theme persistence via localStorage (`corenetwork-theme-v3`)
- Runtime theme switching via `DesignLibraryRuntime` component

#### Channel Layouts
- Extensive channel layout system (historical and modern)
- Layouts defined in `src/design-library/index.ts` with associated CSS files
- Layouts can be independent of global theme (e.g., Cosmic Panda layout works with any theme)

#### Data Layer
- Supabase client in `src/integrations/supabase/client.ts`
- Custom authentication hook (`src/hooks/useAuth.tsx`)
- Query functions likely in `src/lib/queries/` (referenced in routes)

#### Components
- UI components in `src/components/ui/` (Radix-based primitives)
- Domain-specific components in `src/components/` (VideoCard, VideoPlayer, etc.)
- Custom UI patterns: expandable text, media handling, upload safety bridge

### Special Features

#### Cosmic Panda Mode
- Isolated YouTube 2012 experience activated by `retro2012` theme
- Includes classic channel layouts, category-heavy Explore page, retro visual shell
- Modern themes keep current CoreNetwork presentation when not selected

#### Video Features
- Video uploads with categories, thumbnails, public/private visibility
- SRT/WebVTT captions and chapters support
- Atomic per-video view counting on watch page
- Public/private playlists with ordering and save-to-playlist actions

#### Search & Discovery
- Search across videos and channels with sorting by subscribers, views and date
- Channel-era layouts: CoreNetwork, Channel 1.0, Channel 2.0 and Cosmic Panda

#### Live Streaming
- Live studio and viewer interfaces (`src/routes/live.*`)

#### Community & Social
- Community feed, posts, interactions
- Messaging system
- User profiles and channels

#### Administration
- Admin dashboard for managing banners, blog, campaigns, reports
- Admin routes in `src/routes/admin*.tsx`

### Important Conventions

#### File Organization
- `src/components/` - Reusable UI components
- `src/routes/` - Route components (TanStack Start)
- `src/design-library/` - Theme and layout system
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utilities, query functions, constants
- `src/integrations/` - Third-party service integrations
- `src/assets/` - Static assets

#### Styling Approach
- Tailwind CSS with utility-first approach
- Theme-specific CSS files loaded dynamically
- CSS variables for theme colors
- Global styles referenced in root layout

#### State Management
- TanStack Query for server state and caching
- React Context for theme (`ThemeProvider`) and auth (`AuthProvider`)
- LocalStorage for theme persistence

#### Authentication
- Supabase Auth with custom provider
- Session persistence via localStorage
- Protected routes handled by checking auth state in root layout

### Development Notes

1. **Theme Switching**: Themes are switched by updating the `data-theme` attribute on the document element
2. **Maintenance Mode**: Controlled via Supabase `site_settings` table; shows 3D animated maintenance screen
3. **Error Handling**: Global error boundaries in root route; errors reported via `reportLovableError`
4. **Mobile Experience**: Global mobile bottom bar provides primary navigation on small screens
5. **Accessibility**: Uses semantic HTML, aria-labels, and sr-only elements for screen readers

### Environment Variables
- Supabase URL and anon key (in `.env` file)
- Example format:
  ```
  SUPABASE_URL="your-project-url"
  SUPABASE_ANON_KEY="your-anon-key"
  ```

### Getting Started
1. Copy `.env.example` to `.env` and fill in Supabase credentials
2. Run `bun install` to install dependencies
3. Run `bun run dev` to start development server
4. Visit `http://localhost:5173` (or port shown in terminal)

This should provide sufficient context to understand and work effectively with the CoreNetwork codebase.
