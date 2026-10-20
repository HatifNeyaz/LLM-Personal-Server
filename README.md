# Edge AI Workspace: P2P Browser-Based LLM Server

A serverless, purely browser-based distributed AI workspace that turns a single local GPU into a multi-tenant inference server. Built with Vanilla JavaScript, WebGPU, and WebRTC, this architecture allows multiple lightweight clients (phones, laptops) to connect to a host machine over Wi-Fi and execute complex SLM inference, PDF summarization, and peer-to-peer sharing with **zero backend infrastructure**.

## ✨ The Goodness: Universal GPU Support
This system is designed to run out-of-the-box on **any GPU**—from a weak 4GB integrated laptop chip to a 24GB enthusiast card. There are no CUDA drivers to configure, no Docker containers to build, and no Python environments to break. The Host dynamically allocates WebGPU memory bounds based on user selection, seamlessly scaling the context cache and parallel engine counts to perfectly fit the physical hardware limits without requiring further tweaks.

## 🚀 Key Features

*   **True Zero-Latency Parallelism:** Spawns multiple isolated Web Workers (one `MLCEngine` per client slot), allowing simultaneous, parallel token generation for all connected users without sequential queueing.
*   **Smart Cache Compression (50% Threshold):** Implements dynamic KV cache pruning. Instead of crashing on massive PDFs or deleting entire chat histories, the engine tracks memory thresholds and smartly truncates the oldest context while preserving Attention Sinks (System Prompts).
*   **Client-Side PDF Parsing:** Clients extract text from `.pdf` and `.txt` files locally using `pdf.js` before transmitting the raw text to the host via WebRTC, saving massive amounts of host GPU computation and network bandwidth.
*   **Native PDF Export:** Clients can instantly generate and download formatted PDF reports of the AI's insights using `jsPDF`.
*   **P2P Star Topology Network:** Integrated PeerJS routing allows clients to chat privately, broadcast messages, and natively share Base64 file attachments across the local network independently of the AI.

## ⚠️ Critical Host Prerequisites

To allow the browser to interface directly with the Host machine's dedicated hardware, the Host browser must be explicitly configured to allow high-performance WebGPU bindings. 

Before acting as a Host, open your browser (Chrome or Edge) and navigate to `chrome://flags` (or `edge://flags`). Enable the following settings:
1.  **WebGPU Developer Features:** `Enabled`
2.  **WebXR/WebGPU Binding:** `Enabled`
3.  **Choose ANGLE graphics backend:** Select `D3D11` or `Vulkan` (Forces the browser to utilize the High-Performance Dedicated GPU rather than integrated graphics).

*Note: Connecting Clients do not need a GPU and do not need to alter any browser flags.*

## 🛠️ Architecture & Tech Stack

*   **Compute Engine:** [WebLLM](https://webllm.mlc.ai/) (Llama-3.2-1B-Instruct & Phi-3.5-mini-instruct)
*   **Networking:** [PeerJS](https://peerjs.com/) (WebRTC Data Channels)
*   **Document Processing:** `pdf.js` (Extraction) & `jspdf` (Generation)
*   **Framework:** 100% Vanilla JavaScript (ES Modules, Web Workers) — No Webpack, No Vite, No Node.js.

## 📦 Installation & Usage

Because this project relies entirely on browser-native ES Modules and CDN imports, there is **no build step**.

1.  **Host the Files:** Deploy the directory to Vercel, GitHub Pages, or serve it locally using VS Code Live Server.
2.  **Initialize the Host:**
    *   Navigate to `index.html` on the machine with the GPU.
    *   Select your total VRAM, desired Model (Chat or Document), and number of parallel users.
    *   Click **Boot**.
3.  **Assign Clients:**
    *   Clients navigate to `client.html` on their own devices and enter the 4-digit Room Code displayed on the Host.
    *   The Host selects connected clients from the Lobby dropdowns to assign them dedicated WebGPU memory slots.
    *   The Host clicks **Boot Assigned Engines**.
4.  **Collaborate:** Clients can now prompt the AI, attach PDFs, and share insights across the local mesh network.

## 🧠 Memory Management (The 50% Threshold)

To prevent the dreaded `GPUDeviceLost` Out-Of-Memory (OOM) crash, the system enforces a strict token budget:
*   The Pre-Boot UI calculates base model weights ($~800$MB for Llama, $~2.2$GB for Phi-3.5) multiplied by the active parallel user count.
*   Remaining VRAM is mathematically divided into safe Token Budgets (1 Token $\approx$ 96 KB).
*   During inference, the Network Router tracks payload sizes. If a user's context exceeds 50% of their allotted budget, the system triggers a **Buffering** state on the client, slices out the oldest conversational middle-state, and retains the most recent prompts and core system instructions, guaranteeing the WebLLM engine never exceeds physical hardware constraints.