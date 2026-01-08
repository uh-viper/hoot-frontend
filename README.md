# Hoot Frontend

This is the frontend application for Hoot, built with [Next.js](https://nextjs.org), TypeScript, and Tailwind CSS.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Supabase** - Backend as a service (database, auth, real-time)
- **Stripe** - Payment processing
- **React Hook Form** - Form handling with Zod validation
- **date-fns** - Date utility library
- **Axios** - HTTP client

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase project (get one at [supabase.com](https://supabase.com))
- A Stripe account (optional, for payments)

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe (optional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

You can find your Supabase credentials in your Supabase project settings under API.

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
hoot-frontend/
├── app/                # Next.js App Router pages and layouts
├── lib/                # Utility functions and configurations
│   └── supabase/       # Supabase client utilities (client, server, middleware)
├── public/             # Static assets
└── middleware.ts       # Next.js middleware for Supabase auth
```

## Supabase Setup

This project includes Supabase configuration for:
- Client-side Supabase client (`lib/supabase/client.ts`)
- Server-side Supabase client (`lib/supabase/server.ts`)
- Middleware for authentication (`lib/supabase/middleware.ts`)

The middleware automatically handles session refresh and can redirect unauthenticated users. You can modify the middleware behavior in `middleware.ts`.

## Deployment

This project is configured for deployment on Vercel. The deployment will automatically:
- Build the Next.js application
- Set up environment variables from Vercel's dashboard
- Deploy to production

### Manual Deployment to Vercel

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add your environment variables in Vercel's project settings
4. Deploy!

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
