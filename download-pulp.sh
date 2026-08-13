#!/bin/bash
set -e

VERSION="0.56.8"
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    if [ "$OS" = "darwin" ]; then
        ARCH="universal"
    else
        ARCH="aarch64"
    fi
fi

# Map Darwin to macOS
if [ "$OS" = "darwin" ]; then
    OS="macos"
fi

# Map Windows environments
if [[ "$OS" == mingw* ]] || [[ "$OS" == msys* ]] || [[ "$OS" == cygwin* ]]; then
    OS="windows"
fi

ASSET="skred-${VERSION}-maxed-${OS}-${ARCH}.tar.gz"
if [ "$OS" = "windows" ]; then
    ASSET="skred-${VERSION}-maxed-${OS}-${ARCH}.zip"
fi
URL="https://github.com/octetta/pulp/releases/download/v${VERSION}/${ASSET}"
EXTRACT_DIR="clib/pulp"

echo "Downloading Pulp ${VERSION} for ${OS}-${ARCH}..."

mkdir -p "$EXTRACT_DIR"
curl -fLO "$URL" || { echo "Failed to download $URL"; exit 1; }

echo "Extracting ${ASSET}..."
if [ "$OS" = "windows" ]; then
    unzip -q -o "$ASSET" -d "$EXTRACT_DIR"
    # Pulp's zip might have a differently named root folder. 
    # Just move whatever directory was extracted up one level.
    SUBDIR=$(find "$EXTRACT_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)
    if [ -n "$SUBDIR" ]; then
        mv "$SUBDIR"/* "$EXTRACT_DIR/"
        rm -rf "$SUBDIR"
    fi
else
    tar -xzf "$ASSET" -C "$EXTRACT_DIR" --strip-components=1
fi
rm "$ASSET"

echo "Pulp downloaded and extracted to ${EXTRACT_DIR}!"
