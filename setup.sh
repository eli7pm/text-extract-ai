#!/bin/bash

# Nutrient Document Engine Setup Script
# This script helps you set up the complete stack

set -e  # Exit on error

echo "🚀 Nutrient Document Engine Setup"
echo "=================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi
echo "✓ Node.js found: $(node --version)"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first."
    exit 1
fi
echo "✓ pnpm found: $(pnpm --version)"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi
echo "✓ Docker found: $(docker --version)"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
echo "✓ Docker Compose found: $(docker-compose --version)"

# Check OpenSSL
if ! command -v openssl &> /dev/null; then
    echo "❌ OpenSSL is not installed. Please install OpenSSL first."
    exit 1
fi
echo "✓ OpenSSL found: $(openssl version)"

echo ""
echo "📦 Installing dependencies..."

# Install frontend dependencies
echo "  → Installing frontend dependencies..."
pnpm install --silent

# Install backend dependencies
echo "  → Installing backend dependencies..."
cd server
pnpm install --silent
cd ..

echo "✓ Dependencies installed"
echo ""

# Generate JWT keys
echo "🔐 Generating JWT keys..."

if [ -f "server/keys/private_key.pem" ]; then
    echo "⚠️  JWT keys already exist. Skipping key generation."
else
    mkdir -p server/keys

    # Generate private key
    openssl genpkey -algorithm RSA -out server/keys/private_key.pem -pkeyopt rsa_keygen_bits:2048 2>/dev/null

    # Generate public key
    openssl rsa -pubout -in server/keys/private_key.pem -out server/keys/public_key.pem 2>/dev/null

    echo "✓ JWT keys generated"
fi

echo ""

# Copy environment file
echo "⚙️  Setting up environment..."

if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Skipping."
else
    cp server/.env.example .env
    echo "✓ .env file created"
fi

echo ""
echo "📄 Your public key (add this to docker-compose.yml):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat server/keys/public_key.pem
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Configure Docker Compose (automatic):"
echo "   ./setup-docker.sh"
echo ""
echo "   Or manually edit docker-compose.yml:"
echo "   - Copy the public key shown above into JWT_PUBLIC_KEY"
echo "   - Add your license from https://my.nutrient.io/"
echo ""
echo "2. Start Document Engine:"
echo "   docker-compose up -d"
echo ""
echo "3. Start the backend server (in one terminal):"
echo "   pnpm run server:dev"
echo ""
echo "4. Start the frontend (in another terminal):"
echo "   pnpm dev"
echo ""
echo "5. Open your browser:"
echo "   http://localhost:5173"
echo ""
echo "💡 Quick start: Run './setup-docker.sh' to automatically configure Docker Compose"
echo "📚 For detailed instructions, see SETUP_GUIDE.md"
echo ""