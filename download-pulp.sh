#!/bin/bash
set -e

VERSION="0.55.9"
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    if [ "$OS" = "darwin" ]; then
        ARCH="universal"
    else
        ARCH="aarch64"
    fi
fi

# Map Darwin to macOS for the release asset name
if [ "$OS" = "darwin" ]; then
    OS="macos"
fi

ASSET="skred-${VERSION}-maxed-${OS}-${ARCH}.tar.gz"
URL="https://github.com/octetta/pulp/releases/download/v${VERSION}/${ASSET}"
EXTRACT_DIR="clib/pulp"

echo "Downloading Pulp ${VERSION} for ${OS}-${ARCH}..."

mkdir -p "$EXTRACT_DIR"
curl -fLO "$URL" || { echo "Failed to download $URL"; exit 1; }

echo "Extracting ${ASSET}..."
tar -xzf "$ASSET" -C "$EXTRACT_DIR" --strip-components=1
rm "$ASSET"

echo "Pulp downloaded and extracted to ${EXTRACT_DIR}!"
