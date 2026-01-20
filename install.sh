#!/bin/bash

set -e

INSTALL_DIR="${HOME}/.local/bin"
BIN_NAME="matrix-bun"
REPO="itsmelouis/matrix-bun"
LATEST_RELEASE=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | cut -d'"' -f4)

if [[ -z "$LATEST_RELEASE" ]]; then
  echo -e "\033[31m✗\033[0m Could not fetch latest release from GitHub"
  exit 1
fi

mkdir -p "$INSTALL_DIR"

OS=$(uname -s)
ARCH=$(uname -m)

if [[ "$OS" == "Linux" ]]; then
  ARTIFACT="matrix-bun-linux-x64"
elif [[ "$OS" == "Darwin" ]]; then
  if [[ "$ARCH" == "arm64" ]]; then
    ARTIFACT="matrix-bun-darwin-arm64"
  else
    ARTIFACT="matrix-bun-darwin-x64"
  fi
else
  echo -e "\033[31m✗\033[0m Unsupported OS: $OS"
  exit 1
fi

DOWNLOAD_URL="https://github.com/$REPO/releases/download/$LATEST_RELEASE/$ARTIFACT"

echo "Downloading matrix-bun ($LATEST_RELEASE) for $OS/$ARCH..."
curl -fL --progress-bar "$DOWNLOAD_URL" -o "$INSTALL_DIR/$BIN_NAME"

chmod +x "$INSTALL_DIR/$BIN_NAME"

if [[ ":$PATH:" == *":$INSTALL_DIR:"* ]]; then
  echo -e "\033[32m✓\033[0m $INSTALL_DIR is already in PATH"
else
  SHELL_RC=""
  if [[ -f "$HOME/.bashrc" ]]; then
    SHELL_RC="$HOME/.bashrc"
  elif [[ -f "$HOME/.zshrc" ]]; then
    SHELL_RC="$HOME/.zshrc"
  fi
  
  if [[ -n "$SHELL_RC" ]]; then
    echo "export PATH=\"$INSTALL_DIR:\$PATH\"" >> "$SHELL_RC"
    echo -e "\033[32m✓\033[0m Added $INSTALL_DIR to PATH in $SHELL_RC"
    echo "  Run: source $SHELL_RC"
  else
    echo -e "\033[33m⚠\033[0m Could not find shell config. Add this to your shell profile:"
    echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
  fi
fi

echo -e "\033[32m✓\033[0m Installation complete!"
echo "  Usage: $BIN_NAME [options]"
echo "  Run: $BIN_NAME --help"
