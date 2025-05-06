#!/bin/bash

# Print commands and exit on errors
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🔨 Building Banbury CLI..."
cd "$SCRIPT_DIR"
npm run build

# Create local bin directory if it doesn't exist
USER_BIN="$HOME/.local/bin"
mkdir -p "$USER_BIN"

echo "🔗 Installing Banbury CLI to $USER_BIN..."

# Create a wrapper script
cat > "$USER_BIN/banbury" << EOF
#!/bin/bash
node "$SCRIPT_DIR/dist/index.js" "\$@"
EOF

# Make executable
chmod +x "$USER_BIN/banbury"

# Add to PATH if needed
if [[ ":$PATH:" != *":$USER_BIN:"* ]]; then
    echo "⚠️ $USER_BIN is not in your PATH. You may need to add it."
    echo '   For bash: echo "export PATH=\$PATH:~/.local/bin" >> ~/.bashrc'
    echo '   For zsh: echo "export PATH=\$PATH:~/.local/bin" >> ~/.zshrc'
    echo "   Then restart your terminal or run: source ~/.bashrc (or ~/.zshrc)"
fi

echo "✅ Banbury CLI installation complete! Try 'banbury --help' for available commands." 