import './style.css';
import { GetSkredVersion, GetAudioInputs, GetAudioOutputs, RefreshAudioDevices, StartDelayEngine, StopDelayEngine, SendSkodeCommand, ChangeAudioDevice, SaveConfig, LoadConfig, OpenDirectoryDialog, OpenFileDialog } from '../wailsjs/go/main/App';
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
            await StartDelayEngine(inputIdx, outputIdx);
            isRunning = true;
            await syncGenericControls();
            btn.innerText = '⏹ Stop Delay';
            btn.classList.add('active');
        } catch (e) {
            console.error(e);
            alert("Error starting engine: " + e);
        }
    } else {
        await StopDelayEngine();
        isRunning = false;
        btn.innerText = '▶ Start Delay';
        btn.classList.remove('active');
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
}

// Preset System
interface Preset {
    name: string;
    values: Record<string, string>;
    readonly: boolean;
}

// 4 Built-ins from the Patchbook, plus 4 User presets
let presets: Preset[] = [
    { name: "Slapback", readonly: true, values: {"DL 1 {val}":"1", "DL 1 - {val}":"8", "DL 1 - - {val}":"0", "DL 1 - - - {val}":"0", "DL 1 - - - - {val}":"0", "DL 1 - - - - - {val}":"10", "v0 J{val}":"0", "ds v0 {val}":"0.8"} },
    { name: "Tape/Dub Echo", readonly: true, values: {"DL 1 {val}":"4", "DL 1 - {val}":"0", "DL 1 - - {val}":"10", "DL 1 - - - {val}":"2", "DL 1 - - - - {val}":"4", "DL 1 - - - - - {val}":"11", "v0 J{val}":"1", "v0 K{val}":"5000", "ds v0 {val}":"0.7"} },
    { name: "Ambient Wash", readonly: true, values: {"DL 1 {val}":"5", "DL 1 - {val}":"10", "DL 1 - - {val}":"14", "DL 1 - - - {val}":"3", "DL 1 - - - - {val}":"10", "DL 1 - - - - - {val}":"9", "ds v0 {val}":"1.0"} },
    { name: "Dub Siren", readonly: true, values: {"DL 1 {val}":"1", "DL 1 - {val}":"2", "DL 1 - - {val}":"15", "DL 1 - - - {val}":"20", "DL 1 - - - - {val}":"28", "DL 1 - - - - - {val}":"14", "ds v0 {val}":"0.9"} },
    { name: "User 1", readonly: false, values: {} },
    { name: "User 2", readonly: false, values: {} },
    { name: "User 3", readonly: false, values: {} },
    { name: "User 4", readonly: false, values: {} }
];
let currentPresetIdx = 0;

// Capture default state on boot for fallback
const defaultState: Record<string, string> = {};
const initialControls = document.querySelectorAll('.skode-control:not([data-no-preset="true"])') as NodeListOf<HTMLInputElement | HTMLSelectElement>;
initialControls.forEach(c => {
    if (c.type === 'checkbox') {
        defaultState[c.getAttribute('data-skode')!] = (c as HTMLInputElement).checked ? '1' : '0';
    } else {
        defaultState[c.getAttribute('data-skode')!] = c.value;
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
    const controls = document.querySelectorAll('.skode-control:not([data-no-preset="true"])') as NodeListOf<HTMLInputElement | HTMLSelectElement>;
    controls.forEach(c => {
        const key = c.getAttribute('data-skode')!;
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
    const controls = document.querySelectorAll('.skode-control:not([data-no-preset="true"])') as NodeListOf<HTMLInputElement | HTMLSelectElement>;
    
    // Disable sending commands while we update the UI
    const wasRunning = isRunning;
    isRunning = false; 

    for (const c of Array.from(controls)) {
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
    
    isRunning = wasRunning;
    if (isRunning) {
        await syncGenericControls();
    }
}

document.getElementById('preset-select')!.addEventListener('change', (e) => {
    capturePreset(); // save current to old index
    loadPreset(parseInt((e.target as HTMLSelectElement).value));
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


const consoleOutput = document.getElementById('console-output')!;
const addOutput = (text: string, isCmd: boolean = false) => {
    const div = document.createElement('div');
    div.className = isCmd ? 'console-cmd-line' : 'console-res-line';
    div.textContent = isCmd ? `> ${text}` : text;
    consoleOutput.appendChild(div);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
};

// Initial welcome msg
addOutput('Pulp Skode REPL initialized.\nPress Ctrl+` to toggle.', false);

// Fetch Skred version natively
setTimeout(async () => {
    try {
        const v = await GetSkredVersion();
        if (v) document.getElementById('skred-ver-display')!.innerText = `Skred Version: ${v}`;
    } catch(e) {}
}, 500);

const consoleInput = document.getElementById('console-input') as HTMLInputElement;

// Universal Drag and Focus Logic
function makeDraggable(headerId: string, windowId: string) {
    const header = document.getElementById(headerId)!;
    const win = document.getElementById(windowId)!;
    let isDragging = false;
    let initialX = 0;
    let initialY = 0;

    // Click anywhere on window to bring to front
    win.addEventListener('mousedown', () => {
        document.querySelectorAll('.draggable-win').forEach(w => (w as HTMLElement).style.zIndex = '100');
        win.style.zIndex = '101';
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
function saveGlobalConfig() {
    clearTimeout(saveConfigTimeout);
    saveConfigTimeout = setTimeout(async () => {
        const globalWindow = document.getElementById('global-window')!;
        const controlsWindow = document.getElementById('controls-window')!;
        const fileWindow = document.getElementById('file-window')!;
        const aboutWindow = document.getElementById('about-window')!;
        const replWindow = document.getElementById('console-overlay')!;
        const config = {
            theme: document.body.getAttribute('data-theme') || 'light',
            presets: presets,
            currentPreset: currentPresetIdx,
            inputDevice: (document.getElementById('input-select') as HTMLSelectElement).value,
            outputDevice: (document.getElementById('output-select') as HTMLSelectElement).value,
            volumes: {
                main: (document.querySelector('[data-skode="V {val}"]') as HTMLInputElement).value,
                input: (document.querySelector('[data-skode="v0 a{val} l1"]') as HTMLInputElement).value
            },
            globalWindow: {
                top: globalWindow.style.top, left: globalWindow.style.left,
                width: globalWindow.style.width, height: globalWindow.style.height,
                minimized: globalWindow.classList.contains('minimized')
            },
            controlsWindow: {
                top: controlsWindow.style.top, left: controlsWindow.style.left,
                width: controlsWindow.style.width, height: controlsWindow.style.height,
                minimized: controlsWindow.classList.contains('minimized')
            },
            fileWindow: {
                top: fileWindow.style.top, left: fileWindow.style.left,
                width: fileWindow.style.width, height: fileWindow.style.height,
                minimized: fileWindow.classList.contains('minimized')
            },
            aboutWindow: {
                top: aboutWindow.style.top, left: aboutWindow.style.left,
                width: aboutWindow.style.width, height: aboutWindow.style.height,
                minimized: aboutWindow.classList.contains('minimized')
            },
            replWindow: {
                top: replWindow.style.top, left: replWindow.style.left,
                width: replWindow.style.width, height: replWindow.style.height,
                minimized: replWindow.classList.contains('minimized')
            }
        };
        await SaveConfig(JSON.stringify(config));
    }, 500);
}

async function restoreGlobalConfig() {
    try {
        const json = await LoadConfig();
        if (!json || json === '{}') return;
        const config = JSON.parse(json);
        
        if (config.theme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
        }
        
        if (config.presets) presets = config.presets;
               
        const setWin = (id: string, conf: any, defW: string, defH: string) => {
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
                mw.style.width = defW;
            }
            if (conf.height && parseInt(conf.height) >= 100) {
                mw.style.height = conf.height;
            } else {
                mw.style.height = defH;
            }
            if (conf.minimized !== undefined) {
                if (conf.minimized) {
                    mw.classList.add('minimized');
                    const minBtn = mw.querySelector('.window-minimize') as HTMLElement;
                    if (minBtn) minBtn.innerText = '+';
                } else {
                    mw.classList.remove('minimized');
                    const minBtn = mw.querySelector('.window-minimize') as HTMLElement;
                    if (minBtn) minBtn.innerText = '−';
                }
            } else {
                if (id === 'file-window' || id === 'console-overlay' || id === 'about-window') {
                    mw.classList.add('minimized');
                    const minBtn = mw.querySelector('.window-minimize') as HTMLElement;
                    if (minBtn) minBtn.innerText = '+';
                }
            }
        };

        setWin('global-window', config.globalWindow, '540px', '280px');
        setWin('controls-window', config.controlsWindow, '640px', '600px');
        setWin('file-window', config.fileWindow, '480px', '220px');
        setWin('about-window', config.aboutWindow, '360px', '320px');
        setWin('console-overlay', config.replWindow, '500px', '400px');
        
        if (config.volumes) {
            const mainV = document.querySelector('[data-skode="V {val}"]') as HTMLInputElement;
            if (mainV) mainV.value = config.volumes.main;
            const inputV = document.querySelector('[data-skode="v0 a{val} l1"]') as HTMLInputElement;
            if (inputV) inputV.value = config.volumes.input;
        }
        
        updatePresetSelect();
        if (config.currentPreset !== undefined && config.currentPreset >= 0 && config.currentPreset < presets.length) {
            currentPresetIdx = config.currentPreset;
            (document.getElementById('preset-select') as HTMLSelectElement).value = currentPresetIdx.toString();
            loadPreset(currentPresetIdx);
        }
    } catch(e) {
        console.error("Failed to load config:", e);
    }
}

// Minimize Logic
document.querySelectorAll('.window-minimize').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const win = (e.target as HTMLElement).closest('.draggable-win');
        if (win) {
            win.classList.toggle('minimized');
            (e.target as HTMLElement).innerText = win.classList.contains('minimized') ? '+' : '−';
            saveGlobalConfig();
        }
    });
});

makeDraggable('global-header', 'global-window');
makeDraggable('controls-header', 'controls-window');
makeDraggable('file-header', 'file-window');
makeDraggable('about-header', 'about-window');

const consoleWin = document.getElementById('console-overlay')!;
makeDraggable('console-header', 'console-overlay');

document.addEventListener('keydown', (e) => {
    if (e.key === '`' && e.ctrlKey) {
        consoleWin.classList.toggle('minimized');
        const minBtn = consoleWin.querySelector('.window-minimize') as HTMLElement;
        if (minBtn) minBtn.innerText = consoleWin.classList.contains('minimized') ? '+' : '−';
        
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
        const url = (e.target as HTMLElement).getAttribute('data-url');
        if (url) BrowserOpenURL(url);
    });
});
