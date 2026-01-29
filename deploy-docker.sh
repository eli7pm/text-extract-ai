#!/bin/bash

# Docker Deployment Script
# Self-hosted backend with Docker Compose

set -e

echo "🚀 Nutrient Docker Deployment Script"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed${NC}"
echo -e "${GREEN}✓ Docker Compose is installed${NC}"
echo ""

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}⚠ .env.production not found${NC}"
    echo "Creating from example..."
    cp .env.production.example .env.production
    echo -e "${YELLOW}⚠ Please edit .env.production with your actual values${NC}"
    echo ""
    echo "Required values:"
    echo "  - POSTGRES_PASSWORD"
    echo "  - API_AUTH_TOKEN"
    echo "  - ANTHROPIC_API_KEY"
    echo "  - ALLOWED_ORIGINS (your GitHub Pages URL)"
    echo ""
    read -p "Press Enter after you've updated .env.production..."
fi

# Check if JWT keys exist
if [ ! -f server/keys/private_key.pem ]; then
    echo -e "${YELLOW}⚠ JWT keys not found${NC}"
    echo "Generating JWT key pair..."
    mkdir -p server/keys
    openssl genpkey -algorithm RSA -out server/keys/private_key.pem -pkeyopt rsa_keygen_bits:2048
    openssl rsa -pubout -in server/keys/private_key.pem -out server/keys/public_key.pem
    echo -e "${GREEN}✓ JWT keys generated${NC}"
    echo ""
fi

echo -e "${GREEN}✓ JWT keys found${NC}"
echo ""

# Ask what to do
echo "What would you like to do?"
echo "1) Start services (docker-compose up)"
echo "2) Stop services (docker-compose down)"
echo "3) View logs"
echo "4) Restart services"
echo "5) Rebuild and restart"
echo "6) View status"
echo ""
read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo ""
        echo "Starting Docker services..."
        docker-compose -f docker-compose.production.yml --env-file .env.production up -d
        echo ""
        echo -e "${GREEN}✓ Services started${NC}"
        echo ""
        echo "Services running:"
        docker-compose -f docker-compose.production.yml ps
        echo ""
        echo "Test your backend:"
        echo "  curl http://localhost:3001/health"
        echo ""
        echo "View logs:"
        echo "  docker-compose -f docker-compose.production.yml logs -f"
        ;;
    2)
        echo ""
        echo "Stopping Docker services..."
        docker-compose -f docker-compose.production.yml down
        echo -e "${GREEN}✓ Services stopped${NC}"
        ;;
    3)
        echo ""
        echo "Viewing logs (Ctrl+C to exit)..."
        docker-compose -f docker-compose.production.yml logs -f
        ;;
    4)
        echo ""
        echo "Restarting services..."
        docker-compose -f docker-compose.production.yml restart
        echo -e "${GREEN}✓ Services restarted${NC}"
        ;;
    5)
        echo ""
        echo "Rebuilding and restarting..."
        docker-compose -f docker-compose.production.yml up -d --build
        echo -e "${GREEN}✓ Services rebuilt and restarted${NC}"
        ;;
    6)
        echo ""
        docker-compose -f docker-compose.production.yml ps
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac
