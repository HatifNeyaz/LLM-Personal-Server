import { CONFIG } from '../config.js';
import { CreateWebWorkerMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

export class HostEngine {
    constructor(onProgress, onReady, onError, onLog) {
        this.onProgress = onProgress;
        this.onReady = onReady;
        this.onError = onError;
        this.onLog = onLog;
        this.engine = null;
    }

    async bootEngine() {
        this.onLog("Initializing official WebWorkerMLCEngine...");
        try {
            const workerUrl = new URL('./worker.js', import.meta.url);
            const worker = new Worker(workerUrl, { type: 'module' });
            
            worker.onerror = (error) => this.onError(`Worker Error: ${error.message}`);

            this.engine = await CreateWebWorkerMLCEngine(
                worker,
                CONFIG.MODEL_ID,
                { initProgressCallback: (p) => this.onProgress(p.text) }
            );
            
            this.onReady();
        } catch (err) {
            this.onError(`Failed to create engine: ${err.message}`);
        }
    }

    // New Function: Handles the actual inference queue
    async generateResponse(messagesArray, onUpdate, onFinish) {
        try {
            const chunks = await this.engine.chat.completions.create({
                messages: messagesArray,
                stream: true,
            });
            
            let fullReply = "";
            for await (const chunk of chunks) {
                const text = chunk.choices[0]?.delta?.content || "";
                fullReply += text;
                onUpdate(fullReply); // Stream tokens back to the caller
            }
            onFinish(fullReply);
        } catch (error) {
            console.error(error);
            onFinish("[Error: Inference failed on host]");
        }
    }
}