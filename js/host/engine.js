// 👉 File: /js/host/engine.js
import { CONFIG } from '../config.js';
import { CreateWebWorkerMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

export class HostEngine {
    constructor(onLog, maxTokens) {
        this.onLog = onLog;
        this.maxTokens = maxTokens;
        this.engine = null;
    }

    async bootEngine() {
        this.onLog(`Initializing WebGPU bounds: ${this.maxTokens} tokens.`);
        const workerUrl = new URL('./worker.js', import.meta.url);
        const worker = new Worker(workerUrl, { type: 'module' });
        
        this.engine = await CreateWebWorkerMLCEngine(
            worker,
            CONFIG.MODEL_ID,
            { 
                initProgressCallback: (p) => this.onLog(`[Loading] ${Math.round(p.progress * 100)}%`),
                context_window_size: this.maxTokens,
                prefill_chunk_size: 1024 
            }
        );
    }

    async generateResponse(messagesArray, onUpdate, onFinish) {
        try {
            const chunks = await this.engine.chat.completions.create({ messages: messagesArray, stream: true });
            let fullReply = "";
            for await (const chunk of chunks) {
                fullReply += chunk.choices[0]?.delta?.content || "";
                onUpdate(fullReply);
            }
            onFinish(fullReply);
        } catch (error) {
            onUpdate(`\n\n[Engine Error: ${error.message}]`);
            onFinish("");
        }
    }
}