#!/bin/bash

# Exit on error
set -e

# Set npm registry for faster installation (default: Taobao mirror for China)
# Available options: taobao, npmjs, tencent, huawei
export NPM_REGISTRY_TYPE=${NPM_REGISTRY_TYPE:-"taobao"}

case "$NPM_REGISTRY_TYPE" in
    "taobao")
        NPM_REGISTRY="https://registry.npmmirror.com"
        ;;
    "npmjs")
        NPM_REGISTRY="https://registry.npmjs.org"
        ;;
    "tencent")
        NPM_REGISTRY="https://mirrors.cloud.tencent.com/npm/"
        ;;
    "huawei")
        NPM_REGISTRY="https://repo.huaweicloud.com/repository/npm/"
        ;;
    *)
        echo "Error: Unknown registry type: $NPM_REGISTRY_TYPE"
        echo "Available types: taobao, npmjs, tencent, huawei"
        exit 1
        ;;
esac
export NPM_REGISTRY

echo "Building React frontend..."
cd frontend

# Check if node_modules exists, only install if missing
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies using $NPM_REGISTRY_TYPE registry: $NPM_REGISTRY"
    if ! npm config set registry "$NPM_REGISTRY"; then
        echo "Warning: Failed to set npm registry, trying with original registry"
    fi

    # Try to install with retry mechanism
    max_retries=3
    retry_count=0
    while [ $retry_count -lt $max_retries ]; do
        if npm install --no-audit --no-fund; then
            break
        fi
        retry_count=$((retry_count + 1))
        echo "npm install failed, retrying ($retry_count/$max_retries)..."
        sleep 2
    done

    if [ $retry_count -eq $max_retries ]; then
        echo "Error: npm install failed after $max_retries attempts"
        exit 1
    fi
else
    echo "node_modules already exists, skipping npm install"
fi

echo "Building frontend..."
if ! npm run build; then
    echo "Error: Frontend build failed"
    exit 1
fi
cd ..

echo "Moving frontend build to backend..."
# Copy dist folder into backend, creating a backend/frontend/dist structure
mkdir -p backend/frontend
if ! cp -r frontend/dist backend/frontend/dist; then
    echo "Error: Failed to copy frontend build to backend"
    exit 1
fi

echo "Building Go backend..."
cd backend
if ! go build -o ../mqtt-app; then
    echo "Error: Go backend build failed"
    exit 1
fi
cd ..

echo "Build complete! Run ./mqtt-app to start the server."
echo "Frontend built with: $NPM_REGISTRY_TYPE registry ($NPM_REGISTRY)"

# Optional: Restore original npm registry if needed
# npm config set registry https://registry.npmjs.org/
