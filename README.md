# LLM Personal Server 🚀

Welcome to the **LLM Personal Server**! This project is designed to bring powerful, private AI to your team, family, or startup without the need for expensive dedicated hardware (like a Mac Mini or DGX server) or costly API token subscriptions. 

By turning a single GPU-equipped laptop into a local AI host, multiple team members can connect and chat with a Large Language Model (LLM) simultaneously. The host device handles 100% of the heavy computation, leaving the connected client devices (phones, older laptops) completely compute-free. Best of all? Once the connection is established, the entire system can run **offline**.

---

## 🔌 How to Establish the Connection

### Step 1: Initialize the Host (The Compute Engine)
1. Using the computer that has a dedicated GPU, navigate to: **[https://llmpersonalserver.vercel.app](https://llmpersonalserver.vercel.app)**
2. Click **Initialize as Host**.
3. The application will download the model directly into your browser. *Note: It saves the model to your browser's local cache, so subsequent visits will load instantly without needing to download it again.*
4. Once loaded, the dashboard will display a **4-digit Room Code**.

![Host Interface](images/interface_host.png)

### Step 2: Connect the Clients (The Users)
1. Using any client device (a phone, tablet, or another laptop), go to the same website: **[https://llmpersonalserver.vercel.app](https://llmpersonalserver.vercel.app)**
2. Click **Connect to Host**.
3. Enter the 4-digit Room Code displayed on the Host's screen.

![Client Code Interface](images/interface_client_code.png)

4. You will be seamlessly routed to a chat interface where you can ask the model anything. Your device does zero computation; it simply acts as a terminal.

![Client Chat Interface](images/interface_client.png)

### Step 3: Go Offline (Optional but Recommended)
For ultimate privacy and zero-latency performance, make sure the Host and all Client devices are connected to the **same local Wi-Fi network or Mobile Hotspot**. 
Once the initial connections are made, you can completely disconnect your router from the internet. The inference and communication happen entirely peer-to-peer over your local network!

---

## 🧠 Under the Hood: GPU Memory & User Scaling

How does one GPU serve multiple users? 
When the host starts, the actual model weights (e.g., an 800MB Small Language Model) are loaded into the GPU's VRAM exactly once. 

However, as users connect and start chatting, the AI needs to remember their conversations. It does this by storing a "Context Cache" (KV Cache) in the VRAM for *each* user. 
* **The Limitation:** Your GPU's VRAM capacity is your ceiling. On a standard 6GB GPU laptop, the model takes up ~1GB, leaving ~5GB for user context. 
* **Small Environments:** A 6GB or 8GB GPU is perfect for a family or startup team of 3 to 5 people, providing everyone with a generous memory of their conversation.
* **Large Environments:** If you want to scale this up to a whole classroom or a larger office, the host machine simply needs a GPU with higher VRAM (like a 12GB RTX 3060 or a 24GB RTX 4090) to hold the massive, combined context cache of dozens of users.

---

## 🛠️ Part 2: Architecture, Code, and Reproduction

This project is built to be as lightweight and accessible as possible. There are **no build steps, no Node.js requirements, and no complex bundlers like Vite or Webpack**. It is written in pure Vanilla JavaScript, utilizing native ES Modules.

### Core Technologies:
* **WebLLM:** Powered by Apache TVM, this library compiles the LLM to run directly inside the browser using WebGPU. 
* **Web Workers:** The LLM engine is isolated in a background thread (`worker.js`). This ensures that the Host's UI never freezes, even when the GPU is calculating tokens for multiple users simultaneously.
* **PeerJS (WebRTC):** Used to establish the direct, offline local mesh network between the host and clients.

### File Structure:
```text
/edge-llm-server
├── index.html             # Landing page (Host vs Client selection)
├── host.html              # Host UI (Metrics, Room Code)
├── client.html            # Client UI (Chat interface)
├── /images                # UI Screenshots for documentation
├── /js
│   ├── config.js          # Global settings (Model ID)
│   ├── /host
│   │   ├── app.js         # Host UI logic & WebGPU checks
│   │   ├── network.js     # WebRTC router (queues prompts, streams tokens)
│   │   ├── engine.js      # Main-thread bridge to the WebWorker
│   │   └── worker.js      # Background thread executing WebLLM
│   └── /client
│       └── app.js         # Connects to WebRTC and updates chat UI
```

# How to Reproduce & Change the Model
Because it's Vanilla JS, you can clone this repository and immediately serve it via Vercel as a static site, or run it locally using VS Code's Live Server.

## To change the LLM to a more powerful one (or a smaller one):

* Open /js/config.js.

Change the MODEL_ID to any supported model from the WebLLM library.
(e.g., switch from Llama-3.2-1B-Instruct-q4f16_1-MLC to Phi-3.5-mini-instruct-q4f16_1-MLC)

Save the file and refresh your Host browser. The new model will automatically download, cache, and run!

* Note: Always ensure your chosen model's VRAM requirements do not exceed your Host hardware's physical limits.