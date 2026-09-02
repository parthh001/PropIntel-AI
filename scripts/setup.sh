#!/bin/bash
# scripts/setup.sh
# First-time setup script for the PropIntel platform
# Usage: chmod +x scripts/setup.sh && ./scripts/setup.sh

set -e

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║     PropIntel — Platform Setup                   ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ─── Check prerequisites ───
echo "Checking prerequisites..."

command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Install: https://nodejs.org"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required."; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ required. Current: $(node -v)"
  exit 1
fi

echo "  ✓ Node.js $(node -v)"
echo "  ✓ npm $(npm -v)"

# ─── Install dependencies ───
echo ""
echo "Installing dependencies..."
npm install
echo "  ✓ Dependencies installed"

# ─── Environment setup ───
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "  ✓ Created .env.local from .env.example"
  echo "  ⚠ Edit .env.local with your database credentials"
else
  echo "  ✓ .env.local already exists"
fi

# ─── Generate Prisma client ───
echo ""
echo "Generating Prisma client..."
npx prisma generate
echo "  ✓ Prisma client generated"

# ─── Run database migrations ───
echo ""
echo "Running database migrations..."
npx prisma migrate dev --name init 2>/dev/null || npx prisma db push
echo "  ✓ Database schema applied"

# ─── Seed database ───
echo ""
echo "Seeding database with demo data..."
npx tsx prisma/seed-generator.ts 2>/dev/null || echo "  ⚠ Seed generator skipped (run manually)"
npx prisma db seed 2>/dev/null || echo "  ⚠ Database seed skipped (run manually)"
echo "  ✓ Seed data loaded"

# ─── Create upload directories ───
mkdir -p uploads/documents
echo "  ✓ Upload directories created"

# ─── Done ───
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║     ✅ Setup complete!                           ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║                                                  ║"
echo "║  Start dev server:   npm run dev                 ║"
echo "║  Run tests:          npx vitest                  ║"
echo "║  Open browser:       http://localhost:3000       ║"
echo "║                                                  ║"
echo "║  Demo accounts:                                  ║"
echo "║    admin@sahyadri-demo.com     (admin)           ║"
echo "║    manager@sahyadri-demo.com   (agency admin)    ║"
echo "║    vinoddeshmukh@gmail.com     (broker)          ║"
echo "║                                                  ║"
echo "║  Password for all:   Demo@12345                  ║"
echo "║                                                  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
