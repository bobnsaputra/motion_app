# Stage Motion

A visual web-based tool for theatre directors, stage managers, and drama educators to plan character blocking and stage layouts.

## Project Structure

```
stage-motion/
├── frontend/              # React + Vite application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── lib/           # Supabase client
│   │   └── types.ts       # TypeScript types
│   └── .env               # Supabase keys
│
└── supabase/
    └── migrations/        # Database migrations
```

## Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Supabase** account ([supabase.com](https://supabase.com))

## Setup Instructions

### 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and copy your project URL and anon key
3. Push the database schema:
   - Option A: Run the SQL in `supabase/migrations/` via the [SQL Editor](https://supabase.com/dashboard)
   - Option B: Use the CLI:
     ```bash
     npx supabase login
     npx supabase link --project-ref YOUR_PROJECT_REF
     npx supabase db push
     ```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
# Edit frontend/.env with your Supabase credentials:
#   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
#   VITE_SUPABASE_ANON_KEY=your-anon-key

# Start development server
npm run dev
```

The app will start on http://localhost:5173

## Environment Configuration

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Production Build

```bash
cd frontend
npm run build
# Output will be in frontend/dist/
```

## Features

### Authentication (Supabase Auth)
- ✅ User registration with email
- ✅ Secure password handling (managed by Supabase)
- ✅ Session persistence
- ✅ Premium glassmorphism login UI

### Stage Blocking Tool
- Character management with visual representation
- Drag-and-drop positioning
- Direction and gaze controls
- Smart alignment guides
- Save/load layouts
- Export to JSON/PNG
- Undo/Redo system

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Canvas | HTML5 Canvas API |
| Auth & Database | Supabase |
| Deployment | Vercel (planned) |

## License

[Specify your license here]

## Support

For issues or questions, please open an issue on GitHub.
