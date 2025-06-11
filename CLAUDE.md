# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EcoDeli is a multi-platform collaborative delivery system built as a monorepo with three main applications:
- **Web**: Next.js 14 app with tRPC, Prisma, and real-time features
- **Desktop**: JavaFX app for admin reporting and data analysis
- **Mobile**: Android app (Kotlin/Compose) - in development

## Key Commands

### Web Application Development
```bash
# Development
pnpm dev                    # Start development server (http://localhost:3000)
pnpm build                  # Build for production
pnpm start                  # Start production server
pnpm lint                   # Run ESLint
pnpm typecheck             # Run TypeScript type checking

# Database
pnpm db:migrate            # Run Prisma migrations
pnpm db:migrate:dev        # Create migration in development
pnpm db:seed               # Seed database with test data
pnpm db:studio             # Open Prisma Studio

# Testing
pnpm test                  # Run tests
pnpm test:watch           # Run tests in watch mode

# Docker Development
docker-compose -f docker-compose.dev.yml up    # Start all services
./scripts/deploy.sh init                        # Full initialization
./scripts/deploy.sh deploy                      # Deploy application
```

### Desktop Application Development
```bash
cd apps/desktop
./scripts/build.sh         # Build JAR file
./scripts/run.sh          # Run application
mvn clean package         # Maven build
```

### Mobile Application Development
```bash
cd apps/mobile
./scripts/build.sh        # Build APK
./gradlew build          # Gradle build
./gradlew installDebug   # Install on device
```

## Architecture Overview

### Web Application Structure

The web app uses a **fragmented Prisma schema** architecture:
- Main schema: `prisma/schema.prisma` (auto-generated from fragments)
- Fragment schemas: `prisma/schemas/[domain]/*.prisma`
- Run `pnpm prisma:merge` to regenerate the main schema after modifying fragments

**Key architectural patterns:**
- **tRPC routers**: Server-side API logic in `src/server/api/routers/`
- **Hooks**: Custom React hooks in `src/hooks/[role]/` organized by user role
- **Components**: UI components in `src/components/[role]/` organized by user role
- **Schemas**: Zod validation schemas in `src/schemas/[domain]/`
- **Real-time**: Socket.io server in `src/socket/server.ts` with Redis adapter

### Authentication & Authorization

Multi-role authentication system with five user types:
1. **CLIENT**: Service requesters
2. **DELIVERER**: Delivery personnel  
3. **MERCHANT**: Product sellers
4. **PROVIDER**: Service providers
5. **ADMIN**: Platform administrators

Each role has:
- Dedicated routes under `/[locale]/(protected)/[role]/`
- Role-specific components and hooks
- Separate verification workflows

### Database Architecture

PostgreSQL with Prisma ORM using a domain-driven design:
- **Users & Auth**: User management, profiles, verification
- **Deliveries**: Announcements, tracking, matching system
- **Services**: Service bookings, provider availability
- **Payments**: Wallets, subscriptions, billing cycles
- **Storage**: Warehouse and box management
- **Admin**: Audit logs, contracts, system settings

### Real-time Features

Socket.io implementation for:
- Live delivery tracking
- Real-time notifications
- Chat/messaging between users
- Status updates

Uses Redis adapter for horizontal scaling across multiple server instances.

### Internationalization

Multi-language support using next-intl:
- Supported locales: en, fr, de, es, it
- Translation files in `src/messages/[locale].json`
- Locale-based routing with `/[locale]/` prefix
- Scripts for managing translations in `scripts/i18n/`

## Development Workflow

### Working with Prisma Schemas

When modifying database schemas:
1. Edit the relevant fragment in `prisma/schemas/[domain]/`
2. Run `pnpm prisma:merge` to regenerate main schema
3. Run `pnpm db:migrate:dev` to create migration
4. Update seed files if needed in `prisma/seeds/`

### Adding New Features

1. Define Zod schemas in `src/schemas/[domain]/`
2. Update Prisma schema fragments if database changes needed
3. Create tRPC router in `src/server/api/routers/`
4. Add to root router in `src/server/api/root.ts`
5. Create hooks in `src/hooks/[role]/`
6. Build UI components in `src/components/[role]/`
7. Add pages in `src/app/[locale]/(protected)/[role]/`

### Testing Approach

- Unit tests for utilities and hooks
- Integration tests for tRPC routers
- E2E tests for critical user flows
- Use `pnpm test:watch` during development

### Docker Development

The project includes comprehensive Docker setup:
- `docker-compose.dev.yml`: Development environment
- `docker-compose.prod.yml`: Production environment
- Includes PostgreSQL, Redis, Nginx, monitoring stack

Use `./scripts/deploy.sh` for deployment operations and `./scripts/maintenance.sh` for maintenance tasks.

## Important Considerations

### Performance
- Use React Query (via tRPC) for data fetching and caching
- Implement pagination for large data sets
- Use Redis for session storage and caching
- Optimize images with Next.js Image component

### Security
- All API routes protected by authentication
- Role-based access control on all endpoints
- Input validation with Zod schemas
- CSRF protection enabled
- Environment variables for sensitive data

### State Management
- Zustand stores in `src/store/` for client-side state
- Server state managed via tRPC/React Query
- Real-time state via Socket.io connections

### Error Handling
- Consistent error types in tRPC procedures
- User-friendly error messages with translations
- Proper error boundaries in React components
- Logging with structured formats

## Environment Variables

Key environment variables (see `.env.example`):
- `DATABASE_URL`: PostgreSQL connection
- `REDIS_URL`: Redis connection
- `NEXTAUTH_SECRET`: Auth secret
- `STRIPE_SECRET_KEY`: Payment processing
- `NEXT_PUBLIC_APP_URL`: Application URL