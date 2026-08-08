# Delay-GUI UI Design Guide

This document explains how the user interface for the Pulp Delay GUI is constructed and how a designer or developer can easily add new knobs, sliders, and controls without writing any Go or TypeScript code.

## Architecture

The Wails framework automatically bundles everything inside the `frontend/` folder into the final compiled Go executable. The `index.html` file is embedded directly into the app and loaded by the native WebKit view. **Yes, it is entirely self-contained.**

## Adding New Parameters (The Data-Driven UI)

To keep the application highly extensible, we use a custom **data-driven attribute system**. Instead of writing custom event listeners for every single knob, the JavaScript engine globally listens for any input element with the `skode-control` class.

### How to add a new Skode control:
1. Open `frontend/index.html`.
2. Copy and paste an existing `.control-group` block.
3. Add the `skode-control` class to the `<input>` element.
4. Set the `data-skode` attribute to the exact Skode command you want to send. Use `{val}` as a placeholder for the slider's current value.
5. (Optional) Set `data-suffix` if you want a unit (like " ms" or " dB") to appear next to the value readout.

**Example: Adding a Bit Crush Slider**
```html
<div class="control-group">
    <label>Bit Crush (q) <span class="val-display">16 bits</span></label>
    <input type="range" 
           class="glass-slider skode-control" 
           data-skode="v0 q{val}" 
           min="1" max="16" step="1" value="16" 
           data-suffix=" bits">
</div>
```

When the user drags this slider to `8`, the JavaScript engine automatically replaces `{val}` with `8` and executes `SendSkodeCommand("v0 q8")` on the Go backend.

### Complex Multi-Parameter Commands
Some Skode commands require multiple parameters at once. For example, setting the Delay Line (`DL`) requires passing feedback and mix levels in a single string: `DL 1 - - 7 0 0 7`. 

For these multi-parameter commands, you cannot use the simple `data-skode` attribute. Instead, you must:
1. Add an ID to the slider (e.g., `id="feedback-slider"`).
2. Write a custom function in `frontend/src/main.ts` (e.g., `updateParams()`) that reads multiple sliders at once and formats the specific string before sending it to the backend.
