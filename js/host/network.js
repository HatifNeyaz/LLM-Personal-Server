export class HostNetwork {
    constructor(onLog, onUserCountChange, engine) {
        this.onLog = onLog;
        this.onUserCountChange = onUserCountChange;
        this.engine = engine;
        this.connections = {}; // Stores WebRTC connections
        this.userContexts = {}; // Stores the individual KV cache / message histories
        this.isProcessing = false; // The Queue lock
        this.queue = [];
        
        // Generate a random 4-digit room code
        this.roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        // Boot PeerJS (The global 'Peer' object comes from the CDN in host.html)
        this.peer = new Peer(`edge-host-${this.roomCode}`);
        
        this.peer.on('open', (id) => {
            this.onLog(`WebRTC Server running. Room Code: ${this.roomCode}`);
        });

        this.peer.on('connection', (conn) => {
            this.onLog(`Client connected: ${conn.peer}`);
            this.connections[conn.peer] = conn;
            
            // Initialize an empty message history for this new user
            this.userContexts[conn.peer] = [
                { role: "system", content: "You are a helpful AI assistant." }
            ];
            this.onUserCountChange(Object.keys(this.connections).length);

            // Listen for prompts from this specific phone/laptop
            conn.on('data', (data) => {
                if (data.type === 'prompt') {
                    this.onLog(`Received prompt from ${conn.peer}`);
                    this.queueRequest(conn.peer, data.text);
                }
            });

            conn.on('close', () => {
                delete this.connections[conn.peer];
                delete this.userContexts[conn.peer]; // Free up memory
                this.onUserCountChange(Object.keys(this.connections).length);
            });
        });
    }

    queueRequest(userId, promptText) {
        this.queue.push({ userId, promptText });
        this.processQueue(); // Kick off the loop
    }

    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;
        this.isProcessing = true; // Lock the GPU

        const { userId, promptText } = this.queue.shift();
        const conn = this.connections[userId];

        if (conn) {
            // Append user prompt to their specific history
            this.userContexts[userId].push({ role: "user", content: promptText });
            
            // Send an initialization signal to the client UI
            conn.send({ type: 'stream_start' });

            await this.engine.generateResponse(
                this.userContexts[userId],
                (currentText) => {
                    // Send stream chunks over WebRTC
                    conn.send({ type: 'stream_update', text: currentText });
                },
                (finalText) => {
                    // Save AI response to their history to maintain context
                    this.userContexts[userId].push({ role: "assistant", content: finalText });
                    conn.send({ type: 'stream_end' });
                }
            );
        }

        this.isProcessing = false; // Unlock the GPU
        this.processQueue(); // Check for next user in line
    }
}