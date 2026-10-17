const roomInput = document.getElementById('room-input');
const connectBtn = document.getElementById('connect-btn');
const statusText = document.getElementById('client-status');

const setupBox = document.getElementById('setup-box');
const chatBox = document.getElementById('chat-box');
const messagesDiv = document.getElementById('messages');
const promptInput = document.getElementById('prompt-input');
const sendBtn = document.getElementById('send-btn');

let conn = null;
let currentAIMessageDiv = null;

// The global 'Peer' object comes from the CDN in client.html
const peer = new Peer(); 

connectBtn.addEventListener('click', () => {
    const code = roomInput.value.trim();
    if (code.length !== 4) return alert("Please enter the 4-digit room code");
    
    statusText.innerText = "Connecting...";
    
    // Connect to the specific host ID we defined in the host's network.js
    conn = peer.connect(`edge-host-${code}`);

    conn.on('open', () => {
        statusText.innerText = "Connected!";
        setTimeout(() => {
            setupBox.style.display = 'none';
            chatBox.style.display = 'flex';
        }, 500);
    });

    // Listen for streaming tokens coming back from the Host GPU
    conn.on('data', (data) => {
        if (data.type === 'stream_start') {
            // Create a new chat bubble for the incoming AI response
            currentAIMessageDiv = document.createElement('div');
            currentAIMessageDiv.className = 'msg ai';
            messagesDiv.appendChild(currentAIMessageDiv);
        } 
        else if (data.type === 'stream_update') {
            // Update the chat bubble with the incoming stream
            if (currentAIMessageDiv) {
                currentAIMessageDiv.innerText = data.text;
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
        } 
        else if (data.type === 'stream_end') {
            // Stream complete
            currentAIMessageDiv = null;
        }
    });

    conn.on('close', () => {
        alert("Connection to host lost.");
        location.reload();
    });
});

// Sending prompts
sendBtn.addEventListener('click', () => {
    const text = promptInput.value.trim();
    if (!text || !conn) return;

    // Show user message on screen
    const userMsg = document.createElement('div');
    userMsg.className = 'msg user';
    userMsg.innerText = text;
    messagesDiv.appendChild(userMsg);
    
    promptInput.value = "";
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Fire the prompt to the Host over Wi-Fi
    conn.send({ type: 'prompt', text: text });
});

// Allow hitting "Enter" to send
promptInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
});