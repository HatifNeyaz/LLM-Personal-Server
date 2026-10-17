import { WebWorkerMLCEngineHandler } from "https://esm.run/@mlc-ai/web-llm";

// Instantiate the official WebLLM Worker Handler
const handler = new WebWorkerMLCEngineHandler();

// Route all incoming messages from the main thread directly to the handler
self.onmessage = (msg) => {
    handler.onmessage(msg);
};