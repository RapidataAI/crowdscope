# CrowdScope SaaS Execution Plan

## Project Vision
CrowdScope enables users to track trends and insights in population groups through recurring surveys, visualizing how public opinion changes over time.

## Technology Stack

### Frontend
- **Next.js 15** with TypeScript - Full-stack React framework
- **StackAuth** - Authentication and user management
- **Tailwind CSS** - Rapid UI development
- **Framer Motion** - Animations for engaging landing page
- **Recharts** - Data visualization for survey results

### Backend
- **Next.js API Routes** - Main application logic
- **Python FastAPI microservice** - Rapidata SDK integration
- **Prisma ORM** - Type-safe database operations
- **PostgreSQL** - Survey data storage

### Infrastructure
- **Vercel** - Next.js frontend and API deployment
- **Railway/Render** - Python microservice hosting
- **Vercel Postgres** - Managed database

## Core Concept: Signals

A **Signal** is a configured survey campaign that runs daily:
- Contains question, answer options, and vote count configuration
- Integrates with Rapidata to collect specified number of human responses
- Visualizes trends over time through response aggregation

## Database Schema

### Users
- id, email, created_at

### Signals  
- id, name, question, answer_options[], vote_count, created_by, active

### SignalRuns
- id, signal_id, rapidata_order_id, started_at, completed_at

### Responses
- id, signal_run_id, selected_option, timestamp

## MVP Features

### Landing Page
- Hero section with value proposition
- Interactive demo showing live signal results
- Early access signup form
- Social proof section

### Signal Management
- Signal creation interface (question + answer options + vote count)
- Daily execution scheduling
- Signal activation/deactivation
- Signal dashboard with overview

### Rapidata Integration
- Python microservice with Rapidata SDK
- Order creation and management
- Response collection and processing
- Status monitoring and error handling

### Data Visualization
- Real-time response distribution charts
- Trend analysis over time
- Signal performance metrics
- Export capabilities (PNG, PDF)

### User Management
- StackAuth integration
- User registration/login
- Basic user dashboard

## Development Phases

### Phase 1: Foundation Setup
- Initialize Next.js project with StackAuth
- Set up database with Prisma
- Create Python FastAPI microservice
- Basic authentication flow

### Phase 2: Signal System
- Signal creation and management UI
- Database operations for signals
- Python service for Rapidata integration
- Basic response collection

### Phase 3: Visualization & Analytics
- Data visualization components
- Real-time updates and trend analysis
- Signal analytics and insights
- Performance optimization

### Phase 4: Landing Page & Launch
- Engaging landing page design
- Demo integration with live data
- Final testing and bug fixes
- Deployment and monitoring

## Key Integration Points

### StackAuth Setup
```bash
npx @stackframe/init-stack@latest
```

### Rapidata Python Service
```python
from rapidata import RapidataClient
# Signal execution and response collection
```

### API Communication
- Next.js ↔ Python service via HTTP APIs
- Database updates from response processing
- Real-time data sync for visualizations

## Success Metrics
- User engagement with signal creation
- Response collection success rate
- Data visualization performance
- Landing page conversion rate

## Next Steps
1. Initialize project structure
2. Set up StackAuth authentication
3. Design signal management interface
4. Implement Rapidata integration
5. Build data visualization components