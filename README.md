# CashBook

Daily income & expense tracker — React Native + FastAPI + Supabase.

## Structure
cashbook/
├── frontend/        React Native Expo app (all screens designed)
├── backend/         FastAPI (stubs ready, implement when Supabase ready)
├── supabase/        SQL migrations + setup guide
└── CLAUDE.md        Full implementation guide

## Quick Start (Frontend)
cd frontend
cp .env.example .env
npm install
npx expo start
# Scan QR with Expo Go app

## Next Steps
1. Set up Supabase (run supabase/migrations/001_init.sql)
2. Fill in .env files
3. Implement backend/ routers (see CLAUDE.md)
4. Replace mock data in frontend/src/lib/api.ts with real API calls
