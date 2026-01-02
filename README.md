# Infoone ERP - React + TypeScript + Express

A comprehensive ERP/CRM system built with React, TypeScript, Express, and MySQL.

## Features

- ✅ User Authentication with JWT
- ✅ Role-based Access Control (ADMIN, CASHIER, ACCOUNTANT, WAREHOUSE)
- ✅ Product Management with PrestaShop Integration
- ✅ User Management (Admin only)
- ✅ Modern Material-UI Interface
- ✅ Offline-capable (IndexedDB for POS)

## Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite for fast development
- Material-UI for UI components
- React Router for routing
- Axios for API calls

**Backend:**
- Node.js with Express
- TypeScript
- JWT for authentication
- Prisma ORM
- MySQL database

**Integration:**
- PrestaShop API integration
- Fast XML Parser for PrestaShop data

## Project Structure

```
Infoone/
├── src/                  # React frontend
│   ├── components/       # Reusable components
│   │   ├── layouts/      # Layout components (DashboardLayout)
│   │   └── ProtectedRoute.tsx
│   ├── contexts/         # React contexts (AuthContext)
│   ├── pages/            # Page components
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Products.tsx
│   │   └── Users.tsx
│   ├── services/         # API service (axios instance)
│   └── types/            # TypeScript type definitions
├── server/               # Express backend
│   ├── routes/           # API routes
│   │   ├── auth.ts       # Authentication endpoints
│   │   ├── products.ts   # Product endpoints
│   │   └── users.ts      # User management
│   ├── middleware/       # Express middleware
│   │   └── auth.ts       # JWT authentication middleware
│   ├── lib/              # Utilities
│   │   └── prisma.ts     # Prisma client
│   └── index.ts          # Server entry point
├── prisma/               # Database
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MySQL server running
- PrestaShop API credentials

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env`:
```env
# Frontend
VITE_API_URL=http://localhost:5000

# Backend
DATABASE_URL="mysql://root:@localhost:3306/erpdb"
JWT_SECRET="your-secret-key-change-this-in-production"
PORT=5000

# PrestaShop API
PRESTASHOP_URL=https://infoone.com.tn
PRESTASHOP_API_KEY=your-api-key
```

3. Generate Prisma client and push schema to database:
```bash
npx prisma generate
npx prisma db push
```

4. Seed the database with admin user:
```bash
npx tsx prisma/seed.ts
```

### Development

Run both frontend and backend concurrently:
```bash
npm run dev
```

Or run them separately:

**Frontend only (Vite - Port 3000):**
```bash
npm run dev:frontend
```

**Backend only (Express - Port 5000):**
```bash
npm run dev:backend
```

### Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Login credentials:
  - Email: `infoone@admin.com`
  - Password: `infoone123`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Products
- `GET /api/products` - Get all products
- `POST /api/products/sync` - Sync products from PrestaShop

### Users
- `GET /api/users` - Get all users (Admin only)

## Database Schema

- **User** - User accounts with roles and authentication
- **Product** - Products with PrestaShop sync
- **StockAvailable** - Stock quantities per product
- **Client** - Customer information
- **PrestashopSyncLog** - Sync history logs

## Migration from Next.js

This project was migrated from Next.js to React + Express:

**Changes:**
- ✅ Next.js API routes → Express routes
- ✅ NextAuth → JWT authentication with cookies
- ✅ Next.js routing → React Router
- ✅ getServerSideProps → API calls with axios
- ✅ Separate frontend (Vite) and backend (Express) servers
- ✅ Material-UI Grid v2 API updated

## Build for Production

1. Build the frontend:
```bash
npm run build
```

2. Start the production server:
```bash
npm run server
```

## Troubleshooting

**Port already in use:**
- Frontend: Change port in `vite.config.ts`
- Backend: Change `PORT` in `.env`

**Database connection error:**
- Ensure MySQL is running
- Check `DATABASE_URL` in `.env`
- Verify database exists: `CREATE DATABASE erpdb;`

**Prisma errors:**
- Regenerate client: `npx prisma generate`
- Reset database: `npx prisma db push --force-reset`

## License

Private - Infoone ERP System
