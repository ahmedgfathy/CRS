#!/bin/bash

# CRS Mobile App - Quick Start Script

echo "🏠 CRS Mobile App - React Native Setup"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the CRSMobileApp directory"
    echo "   cd /path/to/CRS/mobile-application/CRSMobileApp"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "🔧 Configuration Check:"
echo "----------------------"

# Check if Supabase is configured
if grep -q "YOUR_SUPABASE_URL" services/supabase.ts; then
    echo "⚠️  Supabase not configured yet"
    echo "   → Open services/supabase.ts"
    echo "   → Replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY"
    echo ""
else
    echo "✅ Supabase appears to be configured"
fi

echo "🚀 Starting the development server..."
echo "   → Web: npm run web"
echo "   → iOS: npm run ios"  
echo "   → Android: npm run android"
echo ""

# Ask user what platform to run
echo "Which platform would you like to run?"
echo "1) Web (for quick testing)"
echo "2) iOS Simulator"
echo "3) Android Emulator"
echo "4) Just show QR code for device"
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "🌐 Starting web version..."
        npm run web
        ;;
    2)
        echo "📱 Starting iOS simulator..."
        npm run ios
        ;;
    3)
        echo "🤖 Starting Android emulator..."
        npm run android
        ;;
    4)
        echo "📲 Starting Expo server..."
        npx expo start
        ;;
    *)
        echo "🛠️ Manual start:"
        echo "   Run: npx expo start"
        echo "   Then choose your platform"
        ;;
esac
