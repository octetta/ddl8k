import './style.css';
import { GetSkredVersion, GetSkredParameters, GetAudioInputs, GetAudioOutputs, RefreshAudioDevices, StartDelayEngine, StopDelayEngine, SendSkodeCommand, ChangeAudioDevice, SaveConfig, LoadConfig, OpenDirectoryDialog, OpenFileDialog } from '../wailsjs/go/main/App';
import { BrowserOpenURL } from '../wailsjs/runtime/runtime';

let isRunning = false;

async function loadDevices() {
    try {
        const inputs = await GetAudioInputs();
        const outputs = await GetAudioOutputs();

        const inputSelect = document.getElementById('input-select') as HTMLSelectElement;
        const outputSelect = document.getElementById('output-select') as HTMLSelectElement;

        inputSelect.innerHTML = '';
        outputSelect.innerHTML = '';

        inputs.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.index.toString();
            opt.text = d.name;
            inputSelect.add(opt);
        });

        outputs.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.index.toString();
            opt.text = d.name;
            outputSelect.add(opt);
        });
    } catch (e) {
        console.error("Failed to load devices", e);
    }
}

async function changeDevice() {
    saveGlobalConfig();
    if (!isRunning) return;
    const inputIdx = parseInt((document.getElementById('input-select') as HTMLSelectElement).value);
    const outputIdx = parseInt((document.getElementById('output-select') as HTMLSelectElement).value);
    await ChangeAudioDevice(inputIdx, outputIdx);
    await syncGenericControls();
}

async function toggleEngine() {
    const btn = document.getElementById('toggle-btn') as HTMLButtonElement;
    if (!isRunning) {
        const inputIdx = parseInt((document.getElementById('input-select') as HTMLSelectElement).value);
        const outputIdx = parseInt((document.getElementById('output-select') as HTMLSelectElement).value);
        try {
            const msg = await StartDelayEngine(inputIdx, outputIdx);
            isRunning = true;
            await syncGenericControls();
            btn.innerText = '⏹ Stop Delay';
            btn.classList.add('active');
            addOutput(`--- ${msg} ---`, false);
        } catch (e) {
            console.error(e);
            alert("Error starting engine: " + e);
        }
    } else {
        await StopDelayEngine();
        isRunning = false;
        btn.innerText = '▶ Start Delay';
        btn.classList.remove('active');
        addOutput('--- Engine Stopped ---', false);
    }
}


// Sync all generic skode controls immediately
async function syncGenericControls() {
    if (!isRunning) return;
    const controls = document.querySelectorAll('.skode-control') as NodeListOf<HTMLInputElement | HTMLSelectElement>;
    for (const control of Array.from(controls)) {
        const cmdTemplate = control.getAttribute('data-skode');
        if (cmdTemplate) {
            const cmd = cmdTemplate.replace('{val}', control.value);
            await SendSkodeCommand(cmd);
        }
    }
    await syncTremolo();
}

async function syncTremolo() {
    if (!isRunning) return;
    const enable = (document.getElementById('am-enable-select') as HTMLSelectElement).value;
    const wave = (document.getElementById('am-wave-select') as HTMLSelectElement).value;
    const rate = (document.getElementById('am-rate-slider') as HTMLInputElement).value;
    const depth = (document.getElementById('am-depth-slider') as HTMLInputElement).value;
    const offset = (document.getElementById('am-offset-slider') as HTMLInputElement).value;

    if (enable === '1') {
        await SendSkodeCommand(`v1 m1 v1 f${rate} v1 w${wave} v1 a0 v1 l1 v0 A 1,${depth},${offset}`);
    } else {
        await SendSkodeCommand('v0 A- v1 l0');
    }
}

// Preset System
interface WindowConfig {
    left?: string;
    top?: string;
    width?: string;
    height?: string;
    minimized?: boolean;
    prevX?: string;
    prevY?: string;
    prevW?: string;
    prevH?: string;
}

interface Preset {
    name: string;
    values: Record<string, string>;
    readonly: boolean;
}

let presets: Preset[] = [
    { name: "Slapback", readonly: true, values: {"DL 1 {val}":"1", "DL 1 - {val}":"8", "DL 1 - - {val}":"0", "DL 1 - - - {val}":"0", "DL 1 - - - - {val}":"0", "DL 1 - - - - - {val}":"10", "ds v0 {val}":"0.8", "v0 J{val}":"0", "UI_cutoffRange":"full", "v0 K{val}":"15000", "v0 Q{val}":"0.707", "v0 q{val}":"0", "v0 h{val}":"0", "DF 1 {val}":"0", "DP 1 {val}":"0", "UI_am_enable":"0", "UI_am_wave":"0", "UI_am_rate":"1.0", "UI_am_depth":"1.0"} },
    { name: "Tape/Dub Echo", readonly: true, values: {"DL 1 {val}":"4", "DL 1 - {val}":"0", "DL 1 - - {val}":"10", "DL 1 - - - {val}":"2", "DL 1 - - - - {val}":"4", "DL 1 - - - - - {val}":"11", "ds v0 {val}":"0.7", "v0 J{val}":"11", "UI_cutoffRange":"mids", "v0 K{val}":"2000", "v0 Q{val}":"1.2", "v0 q{val}":"0", "v0 h{val}":"0", "DF 1 {val}":"0", "DP 1 {val}":"0", "UI_am_enable":"0", "UI_am_wave":"0", "UI_am_rate":"1.0", "UI_am_depth":"1.0"} },
    { name: "Ambient Wash", readonly: true, values: {"DL 1 {val}":"5", "DL 1 - {val}":"10", "DL 1 - - {val}":"14", "DL 1 - - - {val}":"3", "DL 1 - - - - {val}":"10", "DL 1 - - - - - {val}":"9", "ds v0 {val}":"1.0", "v0 J{val}":"1", "UI_cutoffRange":"treble", "v0 K{val}":"4000", "v0 Q{val}":"0.5", "v0 q{val}":"0", "v0 h{val}":"0", "DF 1 {val}":"0", "DP 1 {val}":"0", "UI_am_enable":"0", "UI_am_wave":"0", "UI_am_rate":"1.0", "UI_am_depth":"1.0"} },
    { name: "Dub Siren", readonly: true, values: {"DL 1 {val}":"2", "DL 1 - {val}":"0", "DL 1 - - {val}":"13", "DL 1 - - - {val}":"8", "DL 1 - - - - {val}":"15", "DL 1 - - - - - {val}":"14", "ds v0 {val}":"0.8", "v0 J{val}":"13", "UI_cutoffRange":"mids", "v0 K{val}":"800", "v0 Q{val}":"3.5", "v0 q{val}":"0", "v0 h{val}":"0", "DF 1 {val}":"0", "DP 1 {val}":"0", "UI_am_enable":"0", "UI_am_wave":"0", "UI_am_rate":"1.0", "UI_am_depth":"1.0"} },
    { name: "Phase-Shifted Chorus", readonly: true, values: {"DL 1 {val}":"0", "DL 1 - {val}":"3", "DL 1 - - {val}":"10", "DL 1 - - - {val}":"12", "DL 1 - - - - {val}":"22", "DL 1 - - - - - {val}":"12", "ds v0 {val}":"0.8", "v0 J{val}":"5", "UI_cutoffRange":"full", "v0 K{val}":"2000", "v0 Q{val}":"0.7", "v0 q{val}":"0", "v0 h{val}":"0", "DF 1 {val}":"0", "DP 1 {val}":"0", "UI_am_enable":"0", "UI_am_wave":"0", "UI_am_rate":"1.0", "UI_am_depth":"1.0"} },
    { name: "Lo-Fi Telephone", readonly: true, values: {"DL 1 {val}":"3", "DL 1 - {val}":"0", "DL 1 - - {val}":"3", "DL 1 - - - {val}":"0", "DL 1 - - - - {val}":"0", "DL 1 - - - - - {val}":"14", "ds v0 {val}":"1.0", "v0 J{val}":"3", "UI_cutoffRange":"mids", "v0 K{val}":"1500", "v0 Q{val}":"1.5", "v0 q{val}":"10", "v0 h{val}":"0", "DF 1 {val}":"0", "DP 1 {val}":"0", "UI_am_enable":"0", "UI_am_wave":"0", "UI_am_rate":"1.0", "UI_am_depth":"1.0"} },
    { name: "Infinite Drone", readonly: true, values: {"DL 1 {val}":"7", "DL 1 - {val}":"15", "DL 1 - - {val}":"15", "DL 1 - - - {val}":"0", "DL 1 - - - - {val}":"0", "DL 1 - - - - - {val}":"12", "ds v0 {val}":"1.0", "v0 J{val}":"1", "UI_cutoffRange":"bass", "v0 K{val}":"250", "v0 Q{val}":"0.9", "v0 q{val}":"0", "v0 h{val}":"0", "DF 1 {val}":"0", "DP 1 {val}":"0", "UI_am_enable":"0", "UI_am_wave":"0", "UI_am_rate":"1.0", "UI_am_depth":"1.0"} },
    { name: "Rhythmic Ping-Pong", readonly: true, values: {"DL 1 {val}":"4", "DL 1 - {val}":"0", "DL 1 - - {val}":"11", "DL 1 - - - {val}":"0", "DL 1 - - - - {val}":"0", "DL 1 - - - - - {val}":"12", "ds v0 {val}":"0.9", "v0 J{val}":"14", "UI_cutoffRange":"treble", "v0 K{val}":"6000", "v0 Q{val}":"1.8", "v0 q{val}":"0", "v0 h{val}":"0", "DF 1 {val}":"0", "DP 1 {val}":"1", "UI_am_enable":"0", "UI_am_wave":"0", "UI_am_rate":"1.0", "UI_am_depth":"1.0"} }
];
// Generate 32 User Presets dynamically
for (let i = 1; i <= 32; i++) {
    presets.push({ name: `User ${i}`, readonly: false, values: {} });
}
let currentPresetIdx = 0;

// Capture default state on boot for fallback
const defaultState: Record<string, string> = {};
const initialControls = document.querySelectorAll('.skode-control:not([data-no-preset="true"]), .ui-state-control') as NodeListOf<HTMLInputElement | HTMLSelectElement>;
initialControls.forEach(c => {
    const key = c.classList.contains('ui-state-control') ? `UI_${c.getAttribute('data-ui-key')}` : c.getAttribute('data-skode')!;
    if (c.type === 'checkbox') {
        defaultState[key] = (c as HTMLInputElement).checked ? '1' : '0';
    } else {
        defaultState[key] = c.value;
    }
});

function updatePresetSelect() {
    const sel = document.getElementById('preset-select') as HTMLSelectElement;
    sel.innerHTML = '';
    presets.forEach((p, i) => {
        const opt = document.createElement('option');
        opt.value = i.toString();
        opt.textContent = `${p.readonly ? '[Factory] ' : ''}${p.name}`;
        sel.appendChild(opt);
    });
    
    sel.value = currentPresetIdx.toString();
}

function capturePreset() {
    if (presets[currentPresetIdx].readonly) return; // Don't overwrite factory defaults
    const state: Record<string, string> = {};
    const controls = document.querySelectorAll('.skode-control:not([data-no-preset="true"]), .ui-state-control') as NodeListOf<HTMLInputElement | HTMLSelectElement>;
    controls.forEach(c => {
        const key = c.classList.contains('ui-state-control') ? `UI_${c.getAttribute('data-ui-key')}` : c.getAttribute('data-skode')!;
        if (c.type === 'checkbox') {
            state[key] = (c as HTMLInputElement).checked ? '1' : '0';
        } else {
            state[key] = c.value;
        }
    });
    presets[currentPresetIdx].values = state;
    saveGlobalConfig();
}

async function loadPreset(idx: number) {
    currentPresetIdx = idx;
    const state = presets[idx].values;
    const controls = document.querySelectorAll('.skode-control:not([data-no-preset="true"]), .ui-state-control') as NodeListOf<HTMLInputElement | HTMLSelectElement>;
    
    // Disable sending commands while we update the UI
    const wasRunning = isRunning;
    isRunning = false; 

    // Update UI controls first so they can affect skode control limits if needed
    for (const c of Array.from(controls)) {
        if (c.classList.contains('ui-state-control')) {
            const key = `UI_${c.getAttribute('data-ui-key')}`;
            const valToSet = state[key] !== undefined ? state[key] : defaultState[key];
            if (valToSet !== undefined) {
                c.value = valToSet;
                c.dispatchEvent(new Event('change')); // Trigger any dependent logic (e.g. Cutoff Range)
            }
        }
    }

    for (const c of Array.from(controls)) {
        if (c.classList.contains('skode-control')) {
            const key = c.getAttribute('data-skode')!;
            const valToSet = state[key] !== undefined ? state[key] : defaultState[key];
            if (valToSet !== undefined) {
                if (c.type === 'checkbox') {
                    (c as HTMLInputElement).checked = valToSet === '1';
                } else {
                    c.value = valToSet;
                    // update display
                    const display = c.parentElement!.querySelector('.val-display');
                    const suffix = c.getAttribute('data-suffix') || '';
                    if (display) display.textContent = c.value + suffix;
                }
            }
        }
    }
    
    isRunning = wasRunning;
    if (isRunning) {
        await syncGenericControls();
    }
}

document.getElementById('preset-select')!.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    capturePreset(); // save current to old index
    loadPreset(parseInt(val));
});

document.getElementById('copy-preset-btn')!.addEventListener('click', () => {
    // Find first empty user slot
    let targetIdx = presets.findIndex(p => !p.readonly && Object.keys(p.values).length === 0);
    if (targetIdx === -1) {
        // Fallback to first user slot if all are taken
        targetIdx = presets.findIndex(p => !p.readonly);
    }
    if (targetIdx === -1) return; // Should never happen unless zero user slots
    
    // Copy current UI state into targetIdx
    presets[targetIdx].name = presets[currentPresetIdx].name + " (Copy)";
    currentPresetIdx = targetIdx; 
    capturePreset(); // This saves current UI state directly into the new active user slot
    updatePresetSelect();
});

// Setup initial preset state
updatePresetSelect();
loadPreset(0);

// Rename Modal Logic
const renameModal = document.getElementById('rename-modal')!;
const renameInput = document.getElementById('rename-input') as HTMLInputElement;

function closeRenameModal() {
    renameModal.style.display = 'none';
}

document.getElementById('rename-preset-btn')!.addEventListener('click', () => {
    if (presets[currentPresetIdx].readonly) {
        alert("Cannot rename Factory presets!");
        return;
    }
    renameInput.value = presets[currentPresetIdx].name;
    renameModal.style.display = 'flex';
    renameInput.focus();
    renameInput.select();
});

document.getElementById('rename-close')!.addEventListener('click', closeRenameModal);
document.getElementById('rename-cancel')!.addEventListener('click', closeRenameModal);
document.getElementById('rename-confirm')!.addEventListener('click', () => {
    const newName = renameInput.value.trim();
    if (newName !== '') {
        presets[currentPresetIdx].name = newName;
        updatePresetSelect();
    }
    closeRenameModal();
});
renameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('rename-confirm')!.click();
    if (e.key === 'Escape') closeRenameModal();
});

document.getElementById('save-presets-btn')!.addEventListener('click', () => {
    capturePreset(); // make sure current is saved
    const data = JSON.stringify(presets);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ddl8k-presets.json';
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('load-presets-btn')!.addEventListener('click', () => {
    document.getElementById('preset-file')!.click();
});

document.getElementById('preset-file')!.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            presets = JSON.parse(e.target!.result as string);
            loadPreset(currentPresetIdx);
        } catch (err) {
            alert("Invalid preset file");
        }
    };
    reader.readAsText(file);
});

document.getElementById('input-select')!.addEventListener('change', changeDevice);
document.getElementById('output-select')!.addEventListener('change', changeDevice);
document.getElementById('refresh-devices-btn')!.addEventListener('click', async () => {
    await RefreshAudioDevices();
    await loadDevices();
});
document.getElementById('toggle-btn')!.addEventListener('click', toggleEngine);

    const slider = document.getElementById('filter-cutoff-slider') as HTMLInputElement;
    document.getElementById('cutoff-range-select')!.addEventListener('change', (e) => {
        const val = (e.target as HTMLSelectElement).value;
        const currentVal = parseInt(slider.value);
        if (val === 'bass') {
            slider.min = "20";
            slider.max = "300";
            slider.step = "1";
        } else if (val === 'mids') {
            slider.min = "300";
            slider.max = "3000";
            slider.step = "10";
        } else if (val === 'treble') {
            slider.min = "3000";
            slider.max = "20000";
            slider.step = "10";
        } else {
            slider.min = "20";
            slider.max = "20000";
            slider.step = "10";
        }
        
        // Clamp current value to new bounds
        if (currentVal > parseInt(slider.max)) slider.value = slider.max;
        if (currentVal < parseInt(slider.min)) slider.value = slider.min;
        
        // Update display text and trigger Skode update
        slider.dispatchEvent(new Event('input'));
        slider.dispatchEvent(new Event('change'));
        capturePreset();
    });

// Generic Data-Driven UI Event Listener
const skodeControls = document.querySelectorAll('.skode-control') as NodeListOf<HTMLInputElement | HTMLSelectElement>;
skodeControls.forEach(control => {
    control.addEventListener('input', async () => {
        const val = control.type === 'checkbox' ? ((control as HTMLInputElement).checked ? '1' : '0') : control.value;
        const display = control.parentElement!.querySelector('.val-display');
        const suffix = control.getAttribute('data-suffix') || '';
        
        if (display && control.type !== 'checkbox') {
            display.textContent = val + suffix;
        }

        if (isRunning) {
            const cmdTemplate = control.getAttribute('data-skode');
            if (cmdTemplate) {
                const cmd = cmdTemplate.replace('{val}', val);
                await SendSkodeCommand(cmd);
            }
        }
        saveGlobalConfig();
    });
});

// AM Control Listener
const amControls = document.querySelectorAll('.am-control') as NodeListOf<HTMLInputElement | HTMLSelectElement>;
amControls.forEach(control => {
    control.addEventListener('input', async () => {
        const display = control.parentElement!.querySelector('.val-display');
        const suffix = control.getAttribute('data-suffix') || '';
        if (display) {
            display.textContent = control.value + suffix;
        }
        await syncTremolo();
        saveGlobalConfig();
        capturePreset();
    });
});

// Theme Toggling Logic
const themeBtn = document.getElementById('theme-toggle')!;
function toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.body.removeAttribute('data-theme');
    } else {
        document.body.setAttribute('data-theme', 'dark');
    }
    saveGlobalConfig();
}
themeBtn.addEventListener('click', toggleTheme);

// Boot logic
(async () => {
    await loadDevices();
    await restoreGlobalConfig();
})();


function addOutput(text: string, isCmd: boolean = false) {
    const consoleOutput = document.getElementById('console-output')!;
    const div = document.createElement('div');
    div.className = isCmd ? 'console-cmd-line' : 'console-res-line';
    div.textContent = isCmd ? `> ${text}` : text;
    consoleOutput.appendChild(div);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// Initial welcome msg
addOutput('Pulp Skode REPL initialized.\nPress Ctrl+` to toggle.', false);

// Fetch Skred version natively
setTimeout(async () => {
    try {
        const v = await GetSkredVersion();
        if (v) document.getElementById('skred-ver-display')!.innerText = `Skred Version: ${v}`;
        
        const params = await GetSkredParameters();
        if (params) addOutput(params, false);
    } catch(e) {}
}, 500);

const consoleInput = document.getElementById('console-input') as HTMLInputElement;

let highestZIndex = 100;

// Universal Drag and Focus Logic
function makeDraggable(headerId: string, windowId: string) {
    const header = document.getElementById(headerId)!;
    const win = document.getElementById(windowId)!;
    let isDragging = false;
    let initialX = 0;
    let initialY = 0;

    // Click anywhere on window to bring to front
    win.addEventListener('mousedown', () => {
        highestZIndex++;
        win.style.zIndex = highestZIndex.toString();
    });

    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = win.getBoundingClientRect();
        initialX = e.clientX - rect.left;
        initialY = e.clientY - rect.top;
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();
            win.style.bottom = 'auto';
            win.style.right = 'auto';
            win.style.left = `${e.clientX - initialX}px`;
            win.style.top = `${e.clientY - initialY}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            saveGlobalConfig();
        }
    });
}

// Global Config Logic
let saveConfigTimeout: any;
let lastSavedConfigStr = "";
function saveGlobalConfig() {
    clearTimeout(saveConfigTimeout);
    saveConfigTimeout = setTimeout(async () => {
        const getWin = (id: string): WindowConfig => {
            const w = document.getElementById(id);
            if (!w) return {};
            return {
                left: w.style.left,
                top: w.style.top,
                width: w.style.width,
                height: w.style.height,
                minimized: w.classList.contains('minimized'),
                prevX: w.getAttribute('data-prev-x') || '',
                prevY: w.getAttribute('data-prev-y') || '',
                prevW: w.getAttribute('data-prev-w') || '',
                prevH: w.getAttribute('data-prev-h') || ''
            }
        };

        let config: any = {
            theme: document.body.getAttribute('data-theme') || 'light',
            presets: presets.filter(p => !p.readonly),
            currentPreset: typeof currentPresetIdx !== 'undefined' ? currentPresetIdx : 0,
            inputDevice: (document.getElementById('input-select') as HTMLSelectElement).value,
            outputDevice: (document.getElementById('output-select') as HTMLSelectElement).value,
            volumes: {
                main: (document.querySelector('[data-skode="V {val}"]') as HTMLInputElement).value,
                input: (document.querySelector('[data-skode="v0 a{val} l1"]') as HTMLInputElement).value
            },
            globalWindow: getWin('global-window'),
            controlsWindow: getWin('controls-window'),
            filterWindow: getWin('filter-window'),
            lofiWindow: getWin('lofi-window'),
            tremoloWindow: getWin('tremolo-window'),
            fileWindow: getWin('file-window'),
            aboutWindow: getWin('about-window'),
            replWindow: getWin('console-overlay')
        };
        
        const configStr = JSON.stringify(config);
        if (configStr !== lastSavedConfigStr) {
            await SaveConfig(configStr);
            lastSavedConfigStr = configStr;
            const ind = document.getElementById('save-indicator');
            if (ind) {
                ind.style.opacity = '1';
                setTimeout(() => ind.style.opacity = '0', 2000);
            }
        }
    }, 500);
}

async function restoreGlobalConfig() {
    try {
        const json = await LoadConfig();
        if (!json || json === '{}') {
            const defaultMin = ['filter-window', 'lofi-window', 'tremolo-window', 'file-window', 'console-overlay', 'about-window'];
            defaultMin.forEach(id => {
                const w = document.getElementById(id);
                if (w) toggleMinimize(w, true);
            });
            return;
        }
        const config = JSON.parse(json);
        
        if (config.theme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
        }
        
        if (config.presets) {
            // Restore only user presets from saved config to prevent overwriting updated factory defaults
            const loadedUserPresets = config.presets.filter((p: any) => !p.readonly);
            let userIdx = 0;
            for (let i = 0; i < presets.length; i++) {
                if (!presets[i].readonly && userIdx < loadedUserPresets.length) {
                    presets[i] = loadedUserPresets[userIdx];
                    userIdx++;
                }
            }
        }
               
        const setWin = (id: string, conf: any, defW: string, _defH: string) => {
            const mw = document.getElementById(id);
            if (!mw) return;
            if (!conf) {
                if (id === 'file-window' || id === 'console-overlay') mw.classList.add('minimized');
                return;
            }
            if (conf.left) {
                let x = parseInt(conf.left);
                if (x > window.innerWidth - 60) x = window.innerWidth - 60;
                if (x < 0) x = 0;
                mw.style.left = `${x}px`;
            }
            if (conf.top) {
                let y = parseInt(conf.top);
                if (y > window.innerHeight - 40) y = window.innerHeight - 40;
                if (y < 0) y = 0;
                mw.style.top = `${y}px`;
            }
            if (conf.width && parseInt(conf.width) >= parseInt(defW)) {
                mw.style.width = conf.width;
            } else {
                mw.style.width = '';
            }
            if (conf.height && parseInt(conf.height) >= 100) {
                mw.style.height = conf.height;
            } else {
                mw.style.height = '';
            }
            if (conf.prevX) mw.setAttribute('data-prev-x', conf.prevX);
            if (conf.prevY) mw.setAttribute('data-prev-y', conf.prevY);
            if (conf.prevW) mw.setAttribute('data-prev-w', conf.prevW);
            if (conf.prevH) mw.setAttribute('data-prev-h', conf.prevH);
            if (conf.minimized !== undefined) {
                // Because toggleMinimize checks if it's already in the target state, 
                // we first ensure the class doesn't match the target state before calling it,
                // or just remove the class completely before calling it.
                if (conf.minimized) {
                    mw.classList.remove('minimized');
                    toggleMinimize(mw, true);
                } else {
                    mw.classList.add('minimized');
                    toggleMinimize(mw, false);
                }
            } else {
                if (id === 'file-window' || id === 'console-overlay' || id === 'about-window') {
                    toggleMinimize(mw, true);
                }
            }
        };

        setWin('global-window', config.globalWindow, '540px', '380px');
        setWin('controls-window', config.controlsWindow, '400px', '360px');
        setWin('filter-window', config.filterWindow, '400px', '220px');
        setWin('lofi-window', config.lofiWindow, '400px', '160px');
        setWin('tremolo-window', config.tremoloWindow, '400px', '240px');
        setWin('file-window', config.fileWindow, '480px', '220px');
        setWin('about-window', config.aboutWindow, '360px', '460px');
        setWin('console-overlay', config.replWindow, '500px', '400px');
        
        if (config.volumes) {
            const mainV = document.querySelector('[data-skode="V {val}"]') as HTMLInputElement;
            if (mainV) mainV.value = config.volumes.main;
            const inputV = document.querySelector('[data-skode="v0 a{val} l1"]') as HTMLInputElement;
            if (inputV) inputV.value = config.volumes.input;
        }
        
        if (config.inputDevice !== undefined) {
            const inSel = document.getElementById('input-select') as HTMLSelectElement;
            if (inSel) inSel.value = config.inputDevice;
        }
        
        if (config.outputDevice !== undefined) {
            const outSel = document.getElementById('output-select') as HTMLSelectElement;
            if (outSel) outSel.value = config.outputDevice;
        }
        
        updatePresetSelect();
        if (config.currentPreset !== undefined && config.currentPreset >= 0 && config.currentPreset < presets.length) {
            currentPresetIdx = config.currentPreset;
            (document.getElementById('preset-select') as HTMLSelectElement).value = currentPresetIdx.toString();
            loadPreset(currentPresetIdx);
        }
        
        // Seed initial cache to prevent immediate redundant saves
        lastSavedConfigStr = json;
    } catch(e) {
        console.error("Failed to load config:", e);
    }
    
    // Always ensure global window starts on top
    const globalWin = document.getElementById('global-window');
    if (globalWin) {
        document.querySelectorAll('.draggable-win').forEach(w => (w as HTMLElement).style.zIndex = '100');
        globalWin.style.zIndex = '102';
    }
}

// Minimize Logic
function toggleMinimize(win: HTMLElement, forceMin?: boolean) {
    const isMin = forceMin !== undefined ? forceMin : !win.classList.contains('minimized');
    if (isMin === win.classList.contains('minimized')) return;
    
    const dockBar = document.getElementById('dock-bar')!;
    
    if (isMin) {
        win.classList.add('minimized');
        win.style.display = 'none';
        
        // Add button to dock
        const dockBtn = document.createElement('button');
        dockBtn.className = 'glass-btn';
        dockBtn.id = `dock-${win.id}`;
        dockBtn.style.whiteSpace = 'nowrap';
        
        // Extract title text safely, ignoring icons
        const titleSpan = win.querySelector('.window-header > span');
        let titleText = win.id;
        if (titleSpan) {
            const clone = titleSpan.cloneNode(true) as HTMLElement;
            const icon = clone.querySelector('.icon');
            if (icon) icon.remove();
            titleText = clone.textContent || win.id;
        }
        
        // Remove the inner auto-saved text if it exists
        if (titleText.includes('✓')) {
            titleText = titleText.split('✓')[0];
        }
        
        dockBtn.textContent = titleText.trim();
        dockBtn.onclick = () => {
            toggleMinimize(win, false);
            saveGlobalConfig();
        };
        dockBar.appendChild(dockBtn);
        
        // Ensure consistent dock order (Alphabetical)
        Array.from(dockBar.children).sort((a, b) => {
            const textA = a.textContent || '';
            const textB = b.textContent || '';
            return textA.localeCompare(textB);
        }).forEach(node => dockBar.appendChild(node));
        
        dockBar.style.display = 'flex';
        
    } else {
        win.classList.remove('minimized');
        win.style.display = 'flex';
        
        // Remove button from dock
        const dockBtn = document.getElementById(`dock-${win.id}`);
        if (dockBtn) {
            dockBtn.remove();
        }
        if (dockBar.children.length === 0) {
            dockBar.style.display = 'none';
        }
        
        highestZIndex++;
        win.style.zIndex = highestZIndex.toString();
    }
    
    const minBtn = win.querySelector('.window-minimize') as HTMLElement;
    if (minBtn) minBtn.innerText = isMin ? '+' : '−';
}

document.querySelectorAll('.window-minimize').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const win = (e.target as HTMLElement).closest('.draggable-win');
        if (win) {
            toggleMinimize(win as HTMLElement);
            saveGlobalConfig();
        }
    });
});

makeDraggable('global-header', 'global-window');
makeDraggable('controls-header', 'controls-window');
makeDraggable('filter-header', 'filter-window');
makeDraggable('lofi-header', 'lofi-window');
makeDraggable('tremolo-header', 'tremolo-window');
makeDraggable('file-header', 'file-window');
makeDraggable('about-header', 'about-window');

const consoleWin = document.getElementById('console-overlay')!;
makeDraggable('console-header', 'console-overlay');

document.addEventListener('keydown', (e) => {
    if (e.key === '`' && e.ctrlKey) {
        toggleMinimize(consoleWin);
        
        if (!consoleWin.classList.contains('minimized')) {
            document.getElementById('console-input')!.focus();
        }
        saveGlobalConfig();
    }
});

document.getElementById('console-overlay')!.addEventListener('click', () => {
    if (!document.getElementById('console-overlay')!.classList.contains('minimized')) {
        document.getElementById('console-input')!.focus();
    }
});

// File Manager Logic
document.getElementById('cd-browse-btn')!.addEventListener('click', async () => {
    try {
        const dir = await OpenDirectoryDialog();
        if (dir) (document.getElementById('cd-input') as HTMLInputElement).value = dir;
    } catch(e) { console.error(e); }
});
document.getElementById('cd-btn')!.addEventListener('click', () => {
    const p = (document.getElementById('cd-input') as HTMLInputElement).value;
    if (p) SendSkodeCommand(`[${p}]%cd`);
});

document.getElementById('zip-browse-btn')!.addEventListener('click', async () => {
    try {
        const file = await OpenFileDialog();
        if (file) (document.getElementById('zip-input') as HTMLInputElement).value = file;
    } catch(e) { console.error(e); }
});
document.getElementById('zip-btn')!.addEventListener('click', () => {
    const p = (document.getElementById('zip-input') as HTMLInputElement).value;
    if (p) SendSkodeCommand(`[${p}]%z`);
});

let history: string[] = [];
let historyIndex = 0;

consoleInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        const cmd = consoleInput.value.trim();
        if (cmd) {
            addOutput(cmd, true);
            try {
                const res = await SendSkodeCommand(cmd);
                addOutput(res, false);
                if (cmd.startsWith('.restart') || cmd.startsWith('-restart')) {
                    if (isRunning) {
                        isRunning = false;
                        const btn = document.getElementById('toggle-btn') as HTMLButtonElement;
                        btn.innerText = '▶ Start Delay';
                        btn.classList.remove('active');
                        await StopDelayEngine();
                        addOutput(`--- Engine Stopped for Configuration ---`, false);
                    }
                }
            } catch (err) {
                addOutput(`Error: ${err}`, false);
            }
            
            history.push(cmd);
            historyIndex = history.length;
            consoleInput.value = '';
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIndex > 0) {
            historyIndex--;
            consoleInput.value = history[historyIndex];
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
            historyIndex++;
            consoleInput.value = history[historyIndex];
        } else {
            historyIndex = history.length;
            consoleInput.value = '';
        }
    }
});

// About Links
document.querySelectorAll('.about-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const url = (e.currentTarget as HTMLElement).getAttribute('data-url');
        if (url) BrowserOpenURL(url);
    });
});
