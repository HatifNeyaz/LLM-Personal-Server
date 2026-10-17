import { CONFIG } from '../config.js';
import { HostEngine } from './engine.js';
import { HostNetwork } from './network.js'; // New Import

const modelNameEl = document.getElementById('model-name');
const progressTextEl = document.getElementById('progress-text');
const debugLogsEl = document.getElementById('debug-logs');
const roomBoxEl = document.getElementById('room-box');
const roomCodeDisplayEl = document.getElementById('room-code-display');
const connectedCountEl = document.getElementById('connected-count');

modelNameEl.innerText = CONFIG.MODEL_ID;

const onLog = (message) => {
    console.log(message);
    const logLine = document.createElement('div');
    logLine.className = 'log-line';
    logLine.innerText = `> ${message}`;
    debugLogsEl.appendChild(logLine);
};

const onProgress = (text) => progressTextEl.innerText = text;

// --- THIS IS THE MAJOR CHANGE ---
const onReady = () => {
    progressTextEl.innerText = "✅ Model loaded into VRAM. Engine is idle and ready.";
    progressTextEl.style.color = "#10b981";
    
    // Now that the GPU is ready, open the network ports!
    const network = new HostNetwork(
        onLog, 
        (count) => { connectedCountEl.innerText = `Connected Users: ${count}`; },
        engine
    );
    
    // Show the room code to the teacher/host
    roomBoxEl.style.display = 'block';
    roomCodeDisplayEl.innerText = network.roomCode;
};

const onError = (errorMessage) => {
    progressTextEl.innerText = `❌ Error: ${errorMessage}`;
    progressTextEl.style.color = "#ef4444";
    onLog(`FATAL ERROR: ${errorMessage}`);
};

let engine;
async function startApp() {
    onLog("Checking for WebGPU support...");
    if (!navigator.gpu) return onError("WebGPU is not supported.");
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return onError("No GPU adapter found.");
    
    engine = new HostEngine(onProgress, onReady, onError, onLog);
    engine.bootEngine();
}
startApp();