export const CONFIG = {
    MODELS: {
        chat: {
            id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
            name: "Fast Chat SLM",
            baseVramMB: 800
        },
        doc: {
            id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
            name: "Documentation SLM (128k Context)",
            baseVramMB: 2200
        }
    },
    // Safe total KV cache token bounds based on total VRAM
    VRAM_PROFILES: {
        "4096": 8192,   // 4GB GPU -> Max 8k tokens total
        "6144": 24000,  // 6GB GPU -> Max 24k tokens total (Perfect for 1660 Ti)
        "8192": 32000,  // 8GB GPU -> Max 32k tokens total
        "12288": 64000  // 12GB GPU -> Max 64k tokens total
    },
    KB_PER_TOKEN: 96 
};