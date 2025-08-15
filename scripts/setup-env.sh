#!/bin/bash

echo "🚀 Food Route Optimizer - Environment Setup"
echo "=========================================="
echo ""

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 1
    fi
fi

# Copy env.example to .env.local
cp env.example .env.local

echo "✅ Created .env.local from env.example"
echo ""
echo "📝 Next steps:"
echo "1. Edit .env.local and replace REPLACE_ME with your actual API keys"
echo "2. Get your Mapbox token from: https://account.mapbox.com/access-tokens/"
echo "3. Get your Supabase keys from your project settings"
echo ""
echo "🔒 Your .env.local file is automatically ignored by Git"
echo "   so your API keys won't be uploaded to GitHub."
echo ""
echo "📖 See README.md for detailed setup instructions"
