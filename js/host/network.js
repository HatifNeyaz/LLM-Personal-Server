export class HostNetwork {
    constructor(onClientUpdate) {
        this.onClientUpdate = onClientUpdate;
        this.connections = {}; 
        this.userProfiles = {}; 
        this.userContexts = {}; 
        this.sessionActive = false;
        this.engineMap = {}; // Maps peerId to their dedicated SLM
        
        this.roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        this.peer = new Peer(`edge-host-${this.roomCode}`);

        this.peer.on('connection', (conn) => {
            if(this.sessionActive) { conn.close(); return; }

            this.connections[conn.peer] = conn;
            this.userContexts[conn.peer] = [{ role: "system", content: "You analyze documents and answer queries." }];
            
            conn.on('data', (data) => {
                if (data.type === 'identify') {
                    this.userProfiles[conn.peer] = data.name;
                    this.onClientUpdate(this.userProfiles);
                }
                else if (data.type === 'prompt' && this.sessionActive) {
                    this.processParallelRequest(conn.peer, data.text);
                }
                else if (data.type === 'peer_chat') {
                    this.routePeerMessage(conn.peer, data);
                }
            });

            conn.on('close', () => {
                delete this.connections[conn.peer];
                delete this.userProfiles[conn.peer];
                this.onClientUpdate(this.userProfiles);
            });
        });
    }

    lockRoom() { this.sessionActive = true; }
    
    startSession(assignedMapping) {
        this.engineMap = assignedMapping;
        Object.keys(this.connections).forEach(id => {
            if(this.engineMap[id]) this.connections[id].send({ type: 'session_start' });
            else this.connections[id].close(); // Kick unassigned
        });
    }

    routePeerMessage(senderId, data) {
        const payload = { type: 'peer_chat', senderName: this.userProfiles[senderId], text: data.text };
        Object.keys(this.connections).forEach(id => {
            if (id !== senderId) this.connections[id].send(payload);
        });
    }

    // THE 50% THRESHOLD COMPRESSION LOGIC
    checkAndCompress(userId, newPromptLength) {
        const config = this.engineMap[userId];
        const allottedMB = config.allottedMB;
        const thresholdMB = allottedMB * 0.50; // Trigger compression at 50% usage
        
        let history = this.userContexts[userId];
        // Estimate current cache MB (1 token ~ 4 chars ~ 0.093MB)
        let currentChars = history.reduce((acc, msg) => acc + msg.content.length, 0) + newPromptLength;
        let currentMB = (currentChars / 4) * 0.09375;

        if (currentMB >= thresholdMB && history.length > 2) {
            // Signal the UI to show the Buffering state
            this.connections[userId].send({ type: 'buffer_start', msg: 'Compressing KV Cache to prevent crash...' });
            
            // Aggressive Pruning: Remove oldest messages (keeping System [0]) to drop usage down
            while (currentMB >= (thresholdMB * 0.5) && history.length > 2) {
                history.splice(1, 2);
                currentChars = history.reduce((acc, msg) => acc + msg.content.length, 0) + newPromptLength;
                currentMB = (currentChars / 4) * 0.09375;
            }
            
            // Artificial delay so the user sees the "Buffering" UI briefly
            return new Promise(resolve => setTimeout(resolve, 1500));
        }
        return Promise.resolve();
    }

    // TRUE PARALLELISM: No isProcessing Lock! Both engines run simultaneously.
    async processParallelRequest(userId, promptText) {
        const engineData = this.engineMap[userId];
        if(!engineData) return;

        await this.checkAndCompress(userId, promptText.length);
        this.connections[userId].send({ type: 'buffer_end' });

        this.userContexts[userId].push({ role: "user", content: promptText });
        this.connections[userId].send({ type: 'stream_start' });

        await engineData.engine.generateResponse(
            this.userContexts[userId],
            (text) => this.connections[userId].send({ type: 'stream_update', text }),
            (final) => {
                this.userContexts[userId].push({ role: "assistant", content: final });
                this.connections[userId].send({ type: 'stream_end' });
            }
        );
    }
}