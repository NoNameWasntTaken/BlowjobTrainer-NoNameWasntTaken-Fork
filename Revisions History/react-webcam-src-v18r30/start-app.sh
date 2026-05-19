#!/bin/bash

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please download and install Node.js from https://nodejs.org"
    exit 1
fi

echo "Starting the app..."
npx serve -s build 