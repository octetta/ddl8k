# DDL8k Design Documentation

## Architecture
DDL8k acts as a Wails v2 wrapper around the `skode` backend delay engine logic.

1. **Backend (Go)**:
   - Houses the core `app.go` wrapper which controls the C-bindings or CLI arguments for Skode.
   - Manages Audio Device listing and selection natively.
   - Exposes global file I/O operations (config persistence) and native File Pickers (`OpenDirectoryDialog`, `OpenFileDialog`) to the frontend.

2. **Frontend (TypeScript / Vanilla CSS)**:
   - **No Heavy Frameworks**: Hand-rolled, lightweight Vanilla TypeScript mapped to `index.html`.
   - **Modular UI System**: A custom `makeDraggable` system handles multiple window elements overlaid on a single Wails frameless window or standard container.
   - **Data-Skode Engine**: UI controls (sliders, selects, checkboxes) contain `data-skode` string templates (e.g. `v0 K{val}`). An event listener dynamically swaps `{val}` for the slider's value and executes `SendSkodeCommand(cmd)`. This keeps the UI fully stateless—it operates entirely by firing one-way strings to the backend!

## File Storage & Settings
Settings, user presets, volume levels, and window placements are automatically serialized into `config.json`.
- **Location**: Found in the OS-specific User Config Directory (`~/.config/ddl8k/config.json` on Linux).
- **Multiple Instances**: Currently shared globally. Independent configurations require modifying the Go backend to accept a `--config` startup parameter.

## Cross-Platform Considerations
1. **macOS**: Built as a `.app` bundle via Wails out-of-the-box (`wails build -platform darwin/universal`).
2. **Windows**: Fully standalone `.exe` without requiring external MinGW DLLs (built via MSVC/MinGW static flags managed inside Wails).
3. **Linux**: Depends on `libwebkit2gtk-4.1-dev` (or 4.0) at compile-time but runs smoothly as a standalone binary in deployment contexts assuming GTK3 is present.
