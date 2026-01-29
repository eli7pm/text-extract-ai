#!/bin/bash

# Setup Docker Compose with JWT Public Key
# This script is a wrapper that calls the Python script for better reliability

set -e

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not found"
    echo ""
    echo "Please install Python 3 and try again."
    exit 1
fi

# Run the Python script
python3 setup-docker.py
