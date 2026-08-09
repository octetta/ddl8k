# GUI Development Guidelines for DDL8K

When working on the DDL8K graphical user interface, you MUST adhere to the following design philosophies and layout expectations established by the user. Do not regress to arbitrary agent-assumed defaults.

## 1. Window Sizing and Layout
- **Dynamic Content Sizing:** NEVER hardcode explicit pixel dimensions (`width` or `height`) for main draggable windows in the HTML or inject them via Javascript on a clean slate. Allow the browser to natively auto-size `.draggable-win` containers so they tightly wrap their internal contents. Hardcoding dimensions leads to ugly scrollbars and squished layouts.
- **Clean Slate Defaults:** The default UI state should NOT overwhelm the user. Boot with only the primary operational windows (e.g., `Global Settings` and `Delay Controls`) visible in the workspace. All other secondary or utility windows must be docked/minimized by default.

## 2. Window Minimization & Dock Behavior
- **No Floating Iconified Windows:** Do NOT leave minimized windows floating awkwardly in the viewport as small title bars. They obstruct the workspace and break the layout.
- **Use a Unified Dock:** When a window is minimized, its physical DOM element must be completely hidden (`display: none`). Instead, generate a corresponding button for it inside a dedicated Dock Bar locked to the absolute bottom of the screen (`bottom: 15px`).
- **Consistent Dock Sorting:** The items in the dock must maintain a strictly consistent, logical order (e.g., strictly Alphabetical based on title text). They must NOT shuffle their physical position based on the chronological order in which they were minimized or restored. Muscle memory is critical.
- **Text Cleanliness:** Dock button text should be clean and strictly single-line (`white-space: nowrap`). Strip out emojis, icons, or status text (like "Auto-saved") from the window title before creating the dock button.

## 3. Z-Index and Layering Management
- Ensure the Dock Bar and any modal dialogs (like renaming prompts) are assigned an explicitly high z-index (e.g., `3000`) so they are never lost behind standard draggable windows. 
- Draggable windows must dynamically increment their z-index (`highestZIndex++`) upon interaction so the actively clicked window is always brought cleanly to the top of the stack.
