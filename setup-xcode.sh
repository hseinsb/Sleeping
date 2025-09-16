#!/bin/bash

echo "🚀 Setting up Sleep Optimizer for iOS App Store submission..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📱 Step 1: Checking requirements...${NC}"

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}❌ Error: macOS required for iOS development${NC}"
    echo "Please run this on a Mac with Xcode installed."
    exit 1
fi

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}❌ Error: Xcode not found${NC}"
    echo "Please install Xcode from the Mac App Store"
    exit 1
fi

# Check if CocoaPods is installed
if ! command -v pod &> /dev/null; then
    echo -e "${YELLOW}⚠️  CocoaPods not found. Installing...${NC}"
    sudo gem install cocoapods
fi

echo -e "${GREEN}✅ Requirements check passed${NC}"

echo -e "${BLUE}📦 Step 2: Installing dependencies...${NC}"

# Install npm dependencies if not already installed
if [ ! -d "node_modules" ]; then
    npm install
fi

echo -e "${BLUE}🔧 Step 3: Building Capacitor project...${NC}"

# Sync Capacitor
npx cap sync ios

echo -e "${BLUE}📂 Step 4: Opening Xcode project...${NC}"

# Open Xcode workspace
if [ -d "ios/App/App.xcworkspace" ]; then
    open ios/App/App.xcworkspace
    echo -e "${GREEN}✅ Xcode project opened${NC}"
else
    echo -e "${RED}❌ Error: Xcode workspace not found${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Next steps in Xcode:${NC}"
echo "1. Replace app icons in Assets.xcassets/AppIcon.appiconset/"
echo "2. Update splash screens in Assets.xcassets/Splash.imageset/"
echo "3. Configure signing & capabilities"
echo "4. Set deployment target to iOS 15.0+"
echo "5. Archive and upload to App Store Connect"

echo -e "${GREEN}🎉 Setup complete! Check the iOS_App_Store_Guide.md for detailed instructions.${NC}"
