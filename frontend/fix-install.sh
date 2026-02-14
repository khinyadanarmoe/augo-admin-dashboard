#!/bin/bash

echo "Cleaning up corrupted node_modules..."
cd /Users/khinyadanarmoe/Desktop/senior_project/AUGo_Admin/frontend

# Force remove node_modules completely
chmod -R 777 node_modules 2>/dev/null
rm -rf node_modules 2>/dev/null

# Remove lockfiles
rm -f pnpm-lock.yaml package-lock.json 2>/dev/null

echo "Installing with npm..."
npm install

echo "Checking installation..."
ls -la node_modules/@types/react 2>&1
ls -la node_modules/react 2>&1 | head -5

echo "Done! Run 'npm run dev' to start the development server."
