# ClientPilot AI Starter

ClientPilot AI is an AI meeting memory + follow-up CRM for service businesses.

## MVP features included

- Landing page
- Login page using Supabase magic link
- Dashboard UI
- Clients page
- Audio upload/record UI
- AI transcription route
- AI summary/follow-up/task extraction route logic
- Supabase schema with RLS
- Stripe subscription checkout route
- Stripe webhook route skeleton

## Local setup

1. Install Node.js 20.9 or newer.
2. Create a Supabase project.
3. Run `supabase/schema.sql` inside the Supabase SQL editor.
4. Create a private/public bucket named `meeting-audio` in Supabase Storage.
5. Copy `.env.example` to `.env.local` and fill keys.
6. Run:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Important

This is a starter MVP, not a finished production SaaS. Before selling subscriptions, add:

- complete auth route protection
- webhook verification testing
- usage limits by plan
- error monitoring
- privacy policy and data deletion flow
- proper call/audio consent notices for each country
