# LLM Checker 2.0.3 🚀

Advanced CLI tool that scans your hardware and tells you exactly **which LLM or sLLM models you can run locally**, with **full Ollama integration**.
![image](https://github.com/user-attachments/assets/77d156b7-e484-4475-80cc-2e4f275a161b)


---

## ✨ What’s New in v2.0

- 🦙 **Full Ollama integration** – Detects installed models, benchmarks performance and handles downloads automatically
- 🐣 **sLLM (Small Language Model) support** – From 0.5 B all the way up to ultra‑efficient models
- 📊 **Expanded model database** – 40 + models including **Gemma 3, Phi‑4, DeepSeek‑R1, Qwen 2.5**
- 🎯 **Improved compatibility analysis** – Granular 0‑100 scoring system
- 🏷️ **Detailed categorisation** – ultra‑small, small, medium, large, embedding, multimodal
- ⚡ **Performance estimation** – tokens/s, memory footprint, energy consumption
- 🧠 **Use‑case‑based recommendations** – general, code, chat, embeddings, multimodal
- 📱 **Redesigned CLI** – cleaner UX with colours & emojis

---

## 🚀 Installation

### Option 1 – Global NPM **(recommended)**

```bash
npm install -g llm-checker
```

### Option 2 – With Ollama **(recommended for running models)**

```bash
# 1 Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# 2 Install LLM Checker
npm install -g llm-checker

# 3 Verify
llm-checker check
```

### Option 3 – Local development

```bash
git clone https://github.com/developer31f/llm-checker.git
cd llm-checker
npm install
npm link
```

---

## 📖 Usage

### Main command – full analysis

```bash
# Full system scan + Ollama detection
llm-checker check

# Detailed hardware info
llm-checker check --detailed

# Run a performance benchmark
llm-checker check --performance-test
```

#### Filter by model category

```bash
llm-checker check --filter ultra_small   # Models < 1 B params
llm-checker check --filter small         # 1–4 B
llm-checker check --filter medium        # 5–15 B
llm-checker check --filter large         # > 15 B
```

#### Filter by specialisation

```bash
llm-checker check --filter code         # Programming models
llm-checker check --filter chat         # Conversational
llm-checker check --filter multimodal   # Vision + text
llm-checker check --filter embeddings   # Embedding models
```

#### Use‑case presets

```bash
llm-checker check --use-case code        # Optimised for coding
llm-checker check --use-case chat        # Optimised for conversation
llm-checker check --use-case embeddings  # Semantic search
```

#### Ollama‑only / include cloud

```bash
llm-checker check --ollama-only          # Only local models
llm-checker check --include-cloud        # Include cloud models for comparison
```

---

### Ollama management

```bash
# List installed models
llm-checker ollama --list

# Show running models
llm-checker ollama --running

# Benchmark a specific model
llm-checker ollama --test llama3.2:3b

# Download a model
llm-checker ollama --pull phi3:mini

# Remove a model
llm-checker ollama --remove old-model:tag
```

---

### Explore the model database

```bash
llm-checker browse                 # All models
llm-checker browse --category small
llm-checker browse --year 2024
llm-checker browse --multimodal
```

---

### Help commands

```bash
llm-checker --help                # Global help
llm-checker check --help          # Help for a specific command
llm-checker ollama --help
```

---

## 🎯 Example output

### High‑end system with Ollama

```
🖥️  System Information:
CPU: Apple M2 Pro (12 cores, 3.5 GHz)
Architecture: Apple Silicon
RAM: 32 GB total (24 GB free, 25 % used)
GPU: Apple M2 Pro (16 GB VRAM, dedicated)
OS: macOS Sonoma 14.2.1 (arm64)

🏆 Hardware Tier: HIGH (Overall Score: 92/100)

🦙 Ollama Status: ✅ Running (v0.1.17)
📦 Local Models: 5 installed
🚀 Running Models: llama3.1:8b

⚡ Performance Benchmark:
CPU Score: 95/100
Memory Score: 88/100
Overall Score: 91/100

✅ Compatible Models (Score ≥ 75):
┌─────────────────────┬──────────┬───────────┬──────────┬──────────┬───────────┬──────────┐
│ Model               │ Size     │ Score     │ RAM      │ VRAM     │ Speed     │ Status   │
├─────────────────────┼──────────┼───────────┼──────────┼──────────┼───────────┼──────────┤
│ Llama 3.1 8B        │ 8 B      │ 98/100    │ 8 GB     │ 4 GB     │ medium    │ 📦 🚀    │
│ Mistral 7B v0.3     │ 7 B      │ 97/100    │ 8 GB     │ 4 GB     │ medium    │ 📦       │
│ CodeLlama 7B        │ 7 B      │ 97/100    │ 8 GB     │ 4 GB     │ medium    │ 💻       │
│ Phi‑3 Mini 3.8B     │ 3.8 B    │ 99/100    │ 4 GB     │ 2 GB     │ fast      │          │
│ Gemma 3 1B          │ 1 B      │ 100/100   │ 2 GB     │ 0 GB     │ very_fast │          │
└─────────────────────┴──────────┴───────────┴──────────┴──────────┴───────────┴──────────┘
```

### Resource‑limited system

```
🖥️  System Information:
CPU: Intel Core i5‑8400 (6 cores, 2.8 GHz)
Architecture: x86‑64
RAM: 8 GB total (3 GB free, 62 % used)
GPU: Intel UHD Graphics 630 (0 GB VRAM, integrated)
OS: Ubuntu 22.04 LTS (x64)

🏆 Hardware Tier: LOW (Overall Score: 45/100)

🦙 Ollama Status: ❌ Ollama not running (connection refused)
```

---

## 🔧 Supported models (40 +)

### 🐣 Ultra‑small (< 1 B params)

- **Qwen 0.5B** – Ultra lightweight, requires 1 GB RAM
- **LaMini‑GPT 774 M** – Multilingual compact model, 1.5 GB RAM

### 🐤 Small (1 – 4 B)

- **TinyLlama 1.1 B** – Perfect for testing, 2 GB RAM
- **Gemma 3 1 B** – Mobile‑optimised, 2 GB RAM, 32 K context
- **MobileLLaMA 1.4 B / 2.7 B** – 40 % faster than TinyLlama
- **Llama 3.2 1 B / 3 B** – Compact Meta models
- **Phi‑3 Mini 3.8 B** – Great reasoning from Microsoft, 4 GB RAM
- **Gemma 2 B** – Efficient Google model, 3 GB RAM

### 🐦 Medium (5 – 15 B)

- **Llama 3.1 8 B** – Perfect balance, 8 GB RAM
- **Mistral 7 B v0.3** – High‑quality EU model, 8 GB RAM
- **Qwen 2.5 7 B** – Multilingual with strong coding ability
- **CodeLlama 7 B** – Specialised for coding, 8 GB RAM
- **DeepSeek Coder 6.7 B** – Advanced code generation
- **Phi‑4 14 B** – Latest Microsoft model with improved capabilities
- **Gemma 3 4 B** – Multimodal with long context (128 K)

### 🦅 Large (> 15 B)

- **Llama 3.3 70 B** – Meta flagship, 48 GB RAM
- **DeepSeek‑R1 70 B** – Advanced reasoning (o1‑style)
- **Mistral Small 3.1 22 B** – High‑end EU model
- **Gemma 3 12 B / 27 B** – Google multimodal flagships
- **CodeLlama 34 B** – Heavy coding tasks, 24 GB RAM
- **Mixtral 8×7 B** – Mixture‑of‑Experts, 32 GB RAM

### 🖼️ Multimodal (Vision + text)

- **LLaVA 7 B** – Image understanding, 10 GB RAM
- **LLaVA‑NeXT 34 B** – Advanced vision capabilities
- **Gemma 3 4 B / 12 B / 27 B** – Google multimodal family

### 🧲 Embedding models (semantic search)

- **all‑MiniLM‑L6‑v2** – Compact 0.5 GB embedding model
- **BGE‑small‑en‑v1.5** – High‑quality English embeddings

### ☁️ Cloud models (for comparison)

- **GPT‑4** – OpenAI, requires API key & internet
- **Claude 3.5 Sonnet** – Anthropic, 200 K context

---

## 🛠️ Advanced Ollama integration

### Automatic model management

```bash
llm-checker ollama --list       # Details of every local model
llm-checker ollama --running    # Monitor VRAM usage
llm-checker ollama --test llama3.1:8b
```

### Smart installation

```bash
# After analysis, install all recommended models automatically
llm-checker check --filter small | grep "ollama pull" | bash
```

### Real‑time model comparison

```bash
for model in $(ollama list | grep -v NAME | awk '{print $1}'); do
  echo "Testing $model:"
  llm-checker ollama --test $model
done
```

---

## 📊 Detailed compatibility system

### Scoring scale (0‑100)

| Score | Meaning      |
|-------|--------------|
| 90‑100 | 🟢 **Excellent** – full speed, all features |
| 75‑89  | 🟡 **Very good** – great performance |
| 60‑74  | 🟠 **Marginal** – usable with tweaks / quantisation |
| 40‑59  | 🔴 **Limited** – only for testing |
| 0‑39   | ⚫ **Incompatible** – missing critical hw |

### Compatibility factors

1. **Total RAM vs requirement** (40 %)
2. **Available VRAM** (25 %)
3. **CPU cores** (15 %)
4. **CPU architecture** (10 %)
5. **Quantisation availability** (10 %)

### Hardware tiers

- 🚀 **ULTRA_HIGH** – 64 GB RAM, 32 GB VRAM, 12+ cores
- ⚡ **HIGH** – 32 GB RAM, 16 GB VRAM, 8+ cores
- 🎯 **MEDIUM** – 16 GB RAM, 8 GB VRAM, 6+ cores
- 💻 **LOW** – 8 GB RAM, 2 GB VRAM, 4+ cores
- 📱 **ULTRA_LOW** – below the above

---

## ⚙️ Advanced configuration

### Environment variables

```bash
export OLLAMA_BASE_URL=http://localhost:11434
export LLM_CHECKER_RAM_GB=16
export LLM_CHECKER_VRAM_GB=8
export LLM_CHECKER_CPU_CORES=8
export LLM_CHECKER_LOG_LEVEL=debug
export LLM_CHECKER_CACHE_DIR=/custom/cache
export NO_COLOR=1
```

### Configuration file `~/.llm-checker.json`

```json
{
  "analysis": {
    "defaultUseCase": "code",
    "performanceTesting": true,
    "includeCloudModels": false
  },
  "ollama": {
    "baseURL": "http://localhost:11434",
    "enabled": true,
    "timeout": 30000
  },
  "display": {
    "maxModelsPerTable": 15,
    "showEmojis": true,
    "compactMode": false
  },
  "filters": {
    "minCompatibilityScore": 70,
    "excludeModels": ["very-large-model"]
  },
  "customModels": [
    {
      "name": "Custom Model 7B",
      "size": "7B",
      "requirements": { "ram": 8, "vram": 4 }
    }
  ]
}
```

---

## 🎮 Specific use cases

### Coding

```bash
llm-checker check --use-case code --filter medium
ollama pull $(llm-checker check --use-case code --ollama-only | grep "ollama pull" | head -1 | awk '{print $3}')
echo "def fibonacci(n):" | ollama run codellama:7b "Complete this Python function"
```

### Chatbots / assistants

```bash
llm-checker check --use-case chat --filter small,medium
ollama pull llama3.2:3b
ollama run llama3.2:3b "Hello! How can you help me today?"
```

### Semantic search / RAG

```bash
llm-checker check --filter embeddings
ollama pull all-minilm
```

### Multimodal analysis

```bash
llm-checker check --multimodal
ollama pull llava:7b
# echo "image.jpg" | ollama run llava:7b "Describe this image"
```

---

## 🔍 Troubleshooting

### Ollama not detected

```bash
curl http://localhost:11434/api/version          # Should return JSON

# Install or start service
curl -fsSL https://ollama.ai/install.sh | sh
sudo systemctl start ollama                      # Linux
```

### Incorrect hardware detection

```bash
llm-checker check --detailed
export LLM_CHECKER_RAM_GB=16
export LLM_CHECKER_VRAM_GB=8
llm-checker check
```

### Models marked as incompatible

```bash
llm-checker check --min-score 0
llm-checker check --include-marginal
llm-checker check --quantization Q2_K
```

### Permission errors (Linux/macOS)

```bash
sudo chmod +r /sys/class/dmi/id/*
sudo chmod +r /proc/meminfo
sudo llm-checker check
```

---

## 🧪 Programmatic API (Node)

```javascript
const LLMChecker = require('llm-checker');
const OllamaClient = require('llm-checker/ollama');

const checker = new LLMChecker();
const analysis = await checker.analyze({
  useCase: 'code',
  includeCloud: false,
  performanceTest: true
});

console.log('Compatible models:', analysis.compatible);

const ollama = new OllamaClient();
const localModels = await ollama.getLocalModels();
```

---

## 🚀 CI/CD Workflows

### GitHub Actions

```yaml
name: LLM Compatibility Check
on: [push, pull_request]

jobs:
  llm-check:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'

    - name: Install LLM Checker
      run: npm install -g llm-checker

    - name: Check LLM Compatibility
      run: |
        llm-checker check --format json > compatibility.json
        cat compatibility.json

    - name: Upload Results
      uses: actions/upload-artifact@v4
      with:
        name: llm-compatibility
        path: compatibility.json
```

### Docker integration

```dockerfile
FROM node:18-alpine

RUN apk add --no-cache dmidecode lm-sensors
RUN npm install -g llm-checker

COPY analyze.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/analyze.sh

CMD ["analyze.sh"]
```

---

## 🤝 Contributing

### Local development

```bash
git clone https://github.com/developer31f/llm-checker.git
cd llm-checker
npm install
npm test
npm run dev check
npm link
```

### Adding new models

Edit `src/models/expanded_database.js`:

```javascript
{
  name: "New Model 7B",
  size: "7B",
  type: "local",
  category: "medium",
  requirements: { ram: 8, vram: 4, cpu_cores: 4, storage: 7 },
  frameworks: ["ollama", "llama.cpp"],
  quantization: ["Q4_0", "Q4_K_M", "Q5_0"],
  performance: {
    speed: "medium",
    quality: "very_good",
    context_length: 8192,
    tokens_per_second_estimate: "15-30"
  },
  installation: {
    ollama: "ollama pull new-model:7b",
    description: "Description of the new model"
  },
  specialization: "general",
  languages: ["en"],
  year: 2024
}
```

### Improving hardware detection

Edit `src/hardware/detector.js`:

```javascript
detectNewGPU(gpu) {
  const model = gpu.model.toLowerCase();
  if (model.includes('new-gpu')) {
    return {
      dedicated: true,
      performance: 'high',
      optimizations: ['new-api']
    };
  }
  return null;
}
```

### Contribution guide

1. **Fork** the repository
2. **Create** a feature branch `git checkout -b feature/awesome-feature`
3. **Commit** your changes `git commit -am 'Add awesome feature'`
4. **Push** the branch `git push origin feature/awesome-feature`
5. **Open** a Pull Request

### Reporting issues

Include the following:

```bash
llm-checker check --detailed --export json > debug-info.json
DEBUG=1 llm-checker check > debug.log 2>&1
uname -a
node --version
npm --version
```

---

## 📊 Roadmap

### v2.1 (Q2 2025)

- 🔌 Plugin system for extensions
- 📱 Mobile optimisations
- 🌐 Optional web UI
- 📈 Usage metrics & analytics
- 🔄 Automatic model DB updates

### v2.2 (Q3 2025)

- 🤖 More back‑end frameworks (MLX, TensorRT)
- ☁️ Local vs cloud auto comparison
- 🎯 Fine‑tuning advisor
- 📊 Historical performance dashboard
- 🔒 Enterprise mode

### v3.0 (Q4 2025)

- 🧠 AI performance predictor
- 🔄 Multi‑model orchestration
- 📱 Mobile companion app
- 🌍 Advanced multilingual models
- 🚀 Public cloud integrations

---

## 🏆 Credits

### Technologies used

- **systeminformation** – cross‑platform HW detection
- **Ollama** – local LLM management
- **Commander.js** – CLI framework
- **Chalk** – terminal colours
- **Ora** – elegant spinners

### Communities & projects

- **llama.cpp** – efficient LLM inference
- **Hugging Face** – model & dataset hub
- **Meta Llama** – open‑source Llama models
- **Mistral AI** – European LLMs
- **Google Gemma** – open Gemma family

### Contributors

- **[Pavel Chmirenko](mailto:developer31f@gmail.com)** – Lead developer & maintainer


### Special thanks

- **The Ollama team** for an amazing local LLM tool
- **Georgi Gerganov** for `llama.cpp`
- **The open‑source community** for making AI accessible

---

## 📄 License

MIT – see [LICENSE](LICENSE) for details.

---

## 💝 Support the project

If **LLM Checker** saves you time:

⭐ **Star** the repo  
🐛 **Report bugs** & suggest features  
🤝 **Contribute** code or docs  
📢 **Share** with fellow devs  
☕ **[Buy me a coffee](https://buymeacoffee.com/pavelchmirenko)**

---

<div align="center">

**Got questions?** 💬 [Open an issue](https://github.com/developer31f/llm-checker/issues)  
**Want to contribute?** 🚀 [Read the guide](CONTRIBUTING.md)  
**Need advanced usage?** 📚 [Full docs](ADVANCED_USAGE.md)

**Made with ❤️ for the open‑source AI community**

</div>
