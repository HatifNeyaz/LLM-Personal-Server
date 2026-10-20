import { CONFIG } from '../config.js';
import { HostEngine } from './engine.js';
import { HostNetwork } from './network.js';

const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode') || 'chat';
const numUsers = parseInt(urlParams.get('users')) || 2;
const slotBudgetsMB = urlParams.get('slots').split(',').map(Number);
CONFIG.MODEL_ID = CONFIG.MODELS[mode].id;

const roomCodeDisplayEl = document.getElementById('room-code-display');
const clientListEl = document.getElementById('client-list');
const connectedCountEl = document.getElementById('connected-count');
const slotsContainer = document.getElementById('slots-container');
const startBtn = document.getElementById('start-btn');

let network;
let unassignedClients = {}; // peerId -> name

// Build the UI Slots
for (let i = 0; i < numUsers; i++) {
    slotsContainer.innerHTML += `
        <div class="slot-card" id="slot-card-${i}">
            <h4>Engine ${i + 1} (${slotBudgetsMB[i]} MB Cache Limit)</h4>
            <select id="slot-select-${i}" class="slot-dropdown">
                <option value="">-- Assign Client --</option>
            </select>
            <div class="engine-log" id="engine-log-${i}">Awaiting Assignment...</div>
        </div>
    `;
}

const updateDropdowns = () => {
    document.querySelectorAll('.slot-dropdown').forEach(dropdown => {
        const currentVal = dropdown.value;
        dropdown.innerHTML = '<option value="">-- Assign Client --</option>';
        Object.entries(unassignedClients).forEach(([id, name]) => {
            dropdown.innerHTML += `<option value="${id}">${name}</option>`;
        });
        if(unassignedClients[currentVal]) dropdown.value = currentVal;
    });
};

const onClientUpdate = (clients) => {
    unassignedClients = clients;
    connectedCountEl.innerText = Object.keys(clients).length;
    clientListEl.innerHTML = "";
    Object.values(clients).forEach(name => clientListEl.innerHTML += `<li>${name}</li>`);
    updateDropdowns();
};

network = new HostNetwork(onClientUpdate);
roomCodeDisplayEl.innerText = network.roomCode;

startBtn.addEventListener('click', async () => {
    // VALIDATION: Ensure at least one user is selected
    let hasAssignment = false;
    for (let i = 0; i < numUsers; i++) {
        if (document.getElementById(`slot-select-${i}`).value) hasAssignment = true;
    }
    if (!hasAssignment) {
        alert("⚠️ Please assign at least one connected client to an engine slot from the dropdowns!");
        return;
    }

    startBtn.disabled = true;
    startBtn.innerText = "Booting Parallel Engines... Please wait.";
    network.lockRoom();

    const assignedMapping = {}; // userId -> engineInstance
    
    // Boot an isolated engine for each assigned slot
    for (let i = 0; i < numUsers; i++) {
        const selectedUserId = document.getElementById(`slot-select-${i}`).value;
        const logBox = document.getElementById(`engine-log-${i}`);
        
        if (selectedUserId) {
            const onLog = (msg) => { logBox.innerHTML += `<div>${msg}</div>`; logBox.scrollTop = logBox.scrollHeight; };
            
            // Convert allocated MB to tokens (1 token = 96KB = 0.093MB)
            const maxTokens = Math.floor(slotBudgetsMB[i] / 0.09375);
            
            onLog(`Spawning Background Engine...`);
            const engine = new HostEngine(onLog, maxTokens);
            await engine.bootEngine();
            
            assignedMapping[selectedUserId] = { engine, maxTokens, allottedMB: slotBudgetsMB[i] };
            onLog(`<span style="color:#10b981">✅ Engine Online for ${unassignedClients[selectedUserId]}</span>`);
        }
    }
    
    // Signal the network router to transition clients into the chat interface
    network.startSession(assignedMapping);
    startBtn.innerText = "Session Active & Engines Running";
});