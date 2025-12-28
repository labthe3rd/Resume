#!/bin/bash
# Deploy script for Louis Bersine Portfolio with AI Control System

set -e

echo "🚀 Starting deployment..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

# Build and start containers
echo "📦 Building containers..."
docker compose up -d --build

# Wait for Ollama
echo "⏳ Waiting for Ollama to start..."
sleep 10

# Pull LLM model
echo "🤖 Pulling LLM model..."
docker exec ollama ollama pull llama3.2

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Portfolio:        http://localhost:3000"
echo "🔌 API Gateway:      http://localhost:3001"
echo "🏭 OPC-UA Server:    opc.tcp://localhost:4840"
echo "🤖 Ollama:           http://localhost:11434"
echo ""
echo "📊 View logs: docker compose logs -f"
echo "🛑 Stop all:  docker compose down"
