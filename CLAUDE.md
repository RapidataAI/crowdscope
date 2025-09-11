# Claude Development Notes

## Important Reminders

### Build Verification
**Always run `npm run build` after completing any feature to catch TypeScript errors and build issues early.**

This helps identify:
- TypeScript type errors
- Import/export issues
- Component prop mismatches
- Missing dependencies
- Build optimization problems

### Development Workflow
1. Implement feature
2. Test functionality locally with `npm run dev`
3. **Run `npm run build` to verify no build errors**
4. Fix any TypeScript/build issues
5. Commit changes

## Project Structure Notes

### Frontend (Next.js)
- `/src/app/` - App router pages
- `/src/components/` - Reusable components
- `/src/hooks/` - Custom React hooks for API calls
- `/src/services/` - API service functions

### Backend (Flask)
- `/api/routes/` - API route handlers
- `/api/services/` - Business logic services
- `/api/models/` - Database models
- `/api/migrations/` - Database migrations

## Current Features

### Signals System
- Signal creation and management
- Daily aggregated vote trends (for charts)
- Individual run tracking (for management)
- Country filtering (admin only)
- Public/private visibility controls