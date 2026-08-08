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
    # Pulp's zip might have a root folder inside it. If so, move its contents up.
    if [ -d "$EXTRACT_DIR/skred-${VERSION}-maxed-${OS}-${ARCH}" ]; then
        mv $EXTRACT_DIR/skred-${VERSION}-maxed-${OS}-${ARCH}/* "$EXTRACT_DIR/"
        rm -rf "$EXTRACT_DIR/skred-${VERSION}-maxed-${OS}-${ARCH}"
    fi
else
    tar -xzf "$ASSET" -C "$EXTRACT_DIR" --strip-components=1
fi
rm "$ASSET"

echo "Pulp downloaded and extracted to ${EXTRACT_DIR}!"
