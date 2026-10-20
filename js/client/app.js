const roomInput = document.getElementById('room-input');
const nameInput = document.getElementById('name-input');
const connectBtn = document.getElementById('connect-btn');
const statusText = document.getElementById('client-status');
const setupBox = document.getElementById('setup-box');
const chatBox = document.getElementById('chat-box');
const messagesDiv = document.getElementById('messages');
const promptInput = document.getElementById('prompt-input');
const sendAiBtn = document.getElementById('send-ai-btn');
const sendPeerBtn = document.getElementById('send-peer-btn');
const attachBtn = document.getElementById('attach-btn');
const fileInput = document.getElementById('file-input');
const chatTargetSelect = document.getElementById('chat-target');
const attachmentIndicator = document.getElementById('attachment-indicator');
const attachedFileName = document.getElementById('attached-file-name');
const removeAttachmentBtn = document.getElementById('remove-attachment');

const bufferOverlay = document.getElementById('buffer-overlay');
const bufferMsg = document.getElementById('buffer-msg');

let conn = null;
let currentAIMessageDiv = null;
let currentAITextBlock = null; 
let myName = "";
let myId = "";
let pendingDocumentText = "";

const getRandomName = () => "User-" + Math.floor(Math.random() * 9999);
const peer = new Peer(); 

connectBtn.addEventListener('click', () => {
    const code = roomInput.value.trim();
    if (code.length !== 4) return alert("Please enter 4-digit code");
    
    myName = nameInput.value.trim() || getRandomName();
    statusText.innerText = "Connecting...";
    
    conn = peer.connect(`edge-host-${code}`);

    conn.on('open', () => {
        statusText.innerText = "Connected! Waiting for Host to assign you an Engine...";
        myId = peer.id;
        conn.send({ type: 'identify', name: myName });
    });

    conn.on('data', (data) => {
        if (data.type === 'session_start') {
            // The Host has booted our dedicated engine! Move to chat interface.
            setupBox.style.display = 'none';
            chatBox.style.display = 'flex';
            
            const sysMsg = document.createElement('div');
            sysMsg.className = 'msg ai';
            sysMsg.innerHTML = `<div class="sender-name">System</div>Host has assigned your Engine. You may now send prompts!`;
            messagesDiv.appendChild(sysMsg);
        }
        else if (data.type === 'roster_update') {
            chatTargetSelect.innerHTML = '<option value="all">Send to: Everyone</option>';
            data.roster.forEach(user => {
                if (user.id !== myId) {
                    const opt = document.createElement('option');
                    opt.value = user.id;
                    opt.innerText = `Private: ${user.name}`;
                    chatTargetSelect.appendChild(opt);
                }
            });
        }
        else if (data.type === 'buffer_start') {
            bufferMsg.innerText = data.msg;
            bufferOverlay.style.display = 'flex';
        }
        else if (data.type === 'buffer_end') {
            bufferOverlay.style.display = 'none';
        }
        else if (data.type === 'stream_start') {
            currentAIMessageDiv = document.createElement('div');
            currentAIMessageDiv.className = 'msg ai';
            currentAIMessageDiv.innerHTML = `<div class="sender-name">AI Assistant</div><span class="content">...</span>`;
            currentAITextBlock = currentAIMessageDiv.querySelector('.content');
            messagesDiv.appendChild(currentAIMessageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        } 
        else if (data.type === 'stream_update') {
            if (currentAITextBlock) {
                currentAITextBlock.innerText = data.text;
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
        } 
        else if (data.type === 'stream_end') {
            if (currentAIMessageDiv && currentAITextBlock) {
                const finalContent = currentAITextBlock.innerText;
                const exportBtn = document.createElement('button');
                exportBtn.className = 'btn-pdf-export';
                exportBtn.innerText = "📄 Export as PDF";
                exportBtn.onclick = () => exportToPDF(finalContent);
                currentAIMessageDiv.appendChild(document.createElement('br'));
                currentAIMessageDiv.appendChild(exportBtn);
            }
            currentAIMessageDiv = null;
        }
        else if (data.type === 'peer_chat') {
            const msgDiv = document.createElement('div');
            msgDiv.className = `msg peer ${data.private ? 'private' : ''}`;
            msgDiv.innerHTML = `<div class="sender-name">${data.senderName} ${data.private ? '(Private)' : ''}</div>${data.text}`;
            messagesDiv.appendChild(msgDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    });

    conn.on('close', () => {
        alert("Connection to host lost or you were not assigned an engine slot.");
        location.reload();
    });
});

const sendToAI = () => {
    let text = promptInput.value.trim();
    if (!text && !pendingDocumentText) return;

    let displayMsg = text;
    if (pendingDocumentText) {
        displayMsg = text ? `${text} 📎 [Doc Attached]` : `📎 Please analyze this document.`;
        text = text ? `${text}\n\n--- DOCUMENT ---\n${pendingDocumentText}` : `Please analyze this document:\n\n--- DOCUMENT ---\n${pendingDocumentText}`;
    }

    const userMsg = document.createElement('div');
    userMsg.className = 'msg user';
    userMsg.innerHTML = `<div class="sender-name">You</div>${displayMsg}`;
    messagesDiv.appendChild(userMsg);
    
    promptInput.value = "";
    clearAttachment();
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    conn.send({ type: 'prompt', text: text });
};

const sendToPeer = () => {
    const text = promptInput.value.trim();
    if (!text || !conn) return;

    const targetId = chatTargetSelect.value;
    const isPrivate = targetId !== 'all';

    const userMsg = document.createElement('div');
    userMsg.className = `msg user ${isPrivate ? 'private' : ''}`;
    userMsg.innerHTML = `<div class="sender-name">You ${isPrivate ? '(Private)' : ''}</div>${text}`;
    messagesDiv.appendChild(userMsg);
    
    promptInput.value = "";
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    conn.send({ type: 'peer_chat', targetId: targetId, text: text });
};

sendAiBtn.addEventListener('click', sendToAI);
sendPeerBtn.addEventListener('click', sendToPeer);

promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendToAI();
    }
});

function exportToPDF(textData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const splitText = doc.splitTextToSize(textData, 180);
    doc.text(splitText, 15, 20);
    doc.save(`AI_Report_${Date.now()}.pdf`);
}

attachBtn.addEventListener('click', () => fileInput.click());
removeAttachmentBtn.addEventListener('click', clearAttachment);

function clearAttachment() {
    pendingDocumentText = "";
    fileInput.value = "";
    attachmentIndicator.style.display = 'none';
}

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    attachedFileName.innerText = `📎 ${file.name}`;
    attachmentIndicator.style.display = 'flex';
    promptInput.placeholder = "Type instructions for this document...";

    if (file.name.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            pendingDocumentText += content.items.map(item => item.str).join(" ") + "\n";
        }
    } else {
        pendingDocumentText = await file.text();
    }
});