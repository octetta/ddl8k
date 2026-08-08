# DDL8k
<p align="center">
  <img src="mascot.png" width="128" alt="DDL8k Mascot">
</p>

DDL8k is a premium GUI frontend for the Skode Delay Engine. It provides a modular, fully interactive, multi-window UI allowing complete control over delay routing, audio device selection, global configurations, file management, and deep Skode REPL interaction.

Built with Wails v2, Vue/Vanilla TS, and standard OS native UI bridges.

## Features

- **Multi-Window Modular Workspace:** Four distinct floating windows (Global Settings, Delay Controls, File Manager, and REPL) that remember their positions and minimized states across restarts.
- **Skode REPL Console:** Deep integration with the Skode engine via `Ctrl+\`` allowing manual commands (`%cd`, `%z`, `DL 1`, `v0`, etc.) with full syntax highlighting for commands vs responses.
- **Preset Management:** Up to 8 preset slots (4 Factory, 4 User) supporting rename overrides and direct export/import via JSON.
- **Audio Device Swapping:** Safely hot-swap your local audio inputs and outputs right from the UI without restarting the server.
- **Cross-Platform:** Out of the box native binaries for macOS, Linux, and Windows with no external dependencies (static builds, app bundles).

## Build Instructions

Ensure you have Go (1.21+) and Node.js (20+) installed.

```bash
# Install Wails
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# Navigate to the GUI dir
cd delay-gui

# Install JS dependencies
npm install

# Build standalone binaries for your OS
wails build -m
```

## Theme & Aesthetic

Includes a full Dark/Light theme toggler (`🌓`). The UI utilizes translucent frosted glass windows layered over a scalable vector octopus mascot background (`octopus.svg`) representing delay effects.

## License

Copyright (c) 2026 octetta (github.com/octetta). Licensed under MIT.
