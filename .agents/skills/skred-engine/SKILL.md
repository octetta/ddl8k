---
name: skred-engine
description: Technical quirks and interaction rules for the Skred/Skode audio engine.
---

# Skred Engine: Technical Quirks & UI Implementation Rules

When building or modifying user interfaces that dispatch commands to the Skred backend, you MUST adhere to the following rules based on the engine's architectural quirks.

### 1. The Global State "Voice Leakage" Trap
**Quirk:** The Skred backend is strictly stateful and remembers the last voice that was targeted. If you send a command like `a0.5` without a prefix, it will blindly apply it to whatever voice was last modified—even if that modification happened in a completely different UI window a second ago.
**Rule:** NEVER assume context. Every single command string dispatched from the UI must explicitly prefix the target voice (e.g., `v0 a0.5`) to prevent cross-contamination.

### 2. Modulators are "Virtual Voices"
**Quirk:** Modulation effects (like Tremolo/LFOs) are not simple parameters on the main delay line. Skred treats LFOs and modulators as entirely separate, independent synthesizer voices (e.g., `v1`).
**Rule:** To create an effect like Tremolo, you must configure a silent virtual voice (`v1 m1 v1 f1.0 v1 w0 v1 a0 v1 l1`) and then explicitly route the primary voice to be modulated by it (`v0 A 1,depth,offset`).

### 3. Amplitude Modulation (AM) Math & Phase
**Quirk:** The `A` opcode (Amplitude Modulation) operates on raw signal math. Setting the offset to `0.0` creates true ring modulation (swinging the phase into the negative and creating metallic sidebands).
**Rule:** When exposing Tremolo controls, you must expose or carefully calculate the `offset` parameter. To create a standard tremolo (volume swell), the offset must remain positive (typically `1.0` or `1.0 - depth`). To allow ring modulation, allow the offset to reach `0.0`. A range of `-1.0` to `1.0` is recommended for full flexibility.

### 4. Configuration Saving & UI Initialization
**Quirk:** The backend does not broadcast its current state on boot. The frontend UI is the definitive source of truth.
**Rule:** On startup, the UI must load the JSON configuration, hydrate the DOM elements, and subsequently dispatch all necessary Skode commands to sync the backend engine to match the restored UI state.
