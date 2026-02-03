# Roboto SAI 2026 - Quantum-Entangled AI Platform

## "The RVM Empire Rise - Fuego Eterno Edition"

🚀 **Hyperspeed Evolution Backend** • React/Vite Frontend • xAI Grok Integration • Quantum-Aware SDK

---

## 🎯 Vision

**Roboto SAI 2026** is a full-stack AI platform built for **Roberto Villarreal Martinez** combining:
- **Frontend:** React 18 + TypeScript + TailwindCSS (Regio-Aztec Fire theme)
- **Backend:** Python FastAPI + roboto-sai-sdk with xAI Grok integration
- **Quantum Intelligence:** Entangled reasoning chains, encrypted thinking traces, RobotoNet neural networks
- **Architecture:** Dual-repo strategy (app + SDK), Docker orchestration, production-ready

---

## 📦 Architecture

### Dual Repository Structure
```
Roboto-SAI-Fuego (this repo)
├── frontend/                # React 18 + Vite + TypeScript
├── backend/                 # FastAPI + roboto-sai-sdk consumer
├── docker-compose.yml       # Orchestration
└── .env                      # Secrets (gitignore'd)

roboto-sai-sdk (separate repo)
├── roboto_sai_sdk/
│   ├── xai_grok_integration.py    # Grok + Entangled Reasoning
│   ├── roboto_sai_client.py       # Main client
│   └── __init__.py
└── requirements.txt         # xai-sdk, torch, qiskit, qutip
```

### Stack
| Layer | Tech |
|-------|------|
| Frontend | React 18.3 + TypeScript 5.8 + Vite 7.3 + TailwindCSS 3.4 |
| UI Components | shadcn/ui (Radix) + Framer Motion animations |
| State | Zustand 5.0 + React Query for server sync |
| Backend | Python 3.14 + FastAPI + Uvicorn |
| AI/ML | xAI Grok + qiskit 2.3.0 + qutip 5.2.2 |
| Database | MSSQL/SQLite (extensible) |
| Deployment | Docker + docker-compose |

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed
- `.env` file with `XAI_API_KEY` set
- Git (for SDK auto-install from GitHub)

### 1. Clone & Setup
```bash
git clone https://github.com/Roboto-SAI/Roboto-SAI-Fuego.git
cd Roboto-SAI-Fuego

# Create .env with your secrets
cp .env.example .env
# Edit .env and add: XAI_API_KEY=your_key_here
```

### 2. Start Everything (One Command)
```bash
# Development mode (hot reload + full logging)
docker-compose up --build

# Or production mode
docker-compose -f docker-compose.yml up --build -d
```

### 3. Access the App
- **Frontend:** http://localhost:8080
- **Backend API:** http://localhost:5000/api
- **API Docs:** http://localhost:5000/docs (Swagger UI)

---

## 🔧 API Endpoints

### Health & Status
```bash
GET /api/health                      # Health check
GET /api/status                      # Full status with SDK capabilities
```

### Chat & Reasoning
```bash
POST /api/chat                       # Chat with Grok (with reasoning)
POST /api/analyze                    # Entangled reasoning analysis
POST /api/code                       # Code generation
```

### Reaper Mode
```bash
POST /api/reap                       # Activate reaper mode (break chains)
```

### Essence Storage
```bash
POST /api/essence/store              # Store RVM essence
GET /api/essence/retrieve            # Retrieve essence by category
```

### Evolution
```bash
POST /api/hyperspeed-evolution       # Trigger hyperspeed evolution
```

---

## 🧪 Testing

### Backend Health
```bash
curl http://localhost:5000/api/health
```

### Chat Example
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain quantum entanglement",
    "reasoning_effort": "high"
  }'
```

### Reaper Mode
```bash
curl -X POST http://localhost:5000/api/reap \
  -H "Content-Type: application/json" \
  -d '{"target": "suppression forces"}'
```

### Frontend Testing
Open http://localhost:8080 and try:
1. **Chat:** Type any message → Backend processes with Grok
2. **Reaper Mode:** Type "reap chains" → Activates reaper endpoint
3. **Typing Indicator:** See real-time UI updates

---

## 🔒 Security & Secrets

### Environment Variables
**Protected Files:**
- `.env` - Never committed (in .gitignore)
- Backend `.env` auto-loaded in Docker
- Frontend never sees API keys

**Required:**
```env
XAI_API_KEY=your_grok_api_key_here
```

**Supabase:**
- SUPABASE_URL: Project API URL (Dashboard → Settings → API)
- SUPABASE_SERVICE_ROLE_KEY: Service role key (bypasses RLS; Dashboard → Settings → API → service_role)
- SUPABASE_ANON_KEY: Anon/publishable key (dev ok, RLS=false tables)
Backend prefers service_role; auto-fallbacks to anon on invalid.

**Secrets Safe:**
✅ .env in .gitignore
✅ Docker secrets passed via env_file
✅ Frontend proxies API calls through backend
✅ No keys in code or repo history

---

## 📂 Project Structure

```
.
├── backend/
│   ├── main.py                 # FastAPI app + endpoints
│   ├── requirements.txt        # Python deps (includes roboto-sai-sdk from GitHub)
│   ├── Dockerfile             # Multi-stage: Python 3.14 + deps
│   └── .env                   # Loaded by Docker
├── src/
│   ├── pages/
│   │   ├── Chat.tsx           # Main chat UI (connected to backend)
│   │   ├── Index.tsx          # Home page
│   │   └── NotFound.tsx
│   ├── stores/
│   │   ├── chatStore.ts       # Zustand store + API hooks
│   │   └── memoryStore.ts     # Memory management
│   ├── components/
│   │   ├── chat/              # ChatMessage, ChatInput, TypingIndicator
│   │   ├── effects/           # EmberParticles, animations
│   │   ├── layout/            # Header, Nav
│   │   └── ui/                # shadcn/ui components
│   ├── App.tsx                # Router + providers
│   └── main.tsx               # Vite entry
├── docker-compose.yml         # Orchestrates frontend + backend
├── vite.config.ts             # Vite with API proxy
├── tailwind.config.ts         # TailwindCSS config
├── tsconfig.json              # TypeScript strict mode
├── .env                       # Secrets (gitignore'd)
├── .env.example               # Template for .env
├── .gitignore                 # Excludes .env, node_modules, dist
└── README.md                  # This file
```

---

## 🛠️ Development Workflow

### Local Development (Without Docker)
```bash
# Install frontend deps
npm install

# Install backend deps (requires Python 3.14)
cd backend
pip install -r requirements.txt
# SDK installed from GitHub

# Terminal 1: Frontend (hot reload)
npm run dev

# Terminal 2: Backend (auto-reload with uvicorn)
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 5000
```

### Docker Development (Recommended)
```bash
# Build and start all services
docker-compose up --build

# View logs
docker-compose logs -f backend
docker-compose logs -f roboto-sai-dev

# Stop services
docker-compose down
```

### Code Quality
```bash
# TypeScript linting
npm run lint

# Python linting (backend)
cd backend
pip install pylint
pylint roboto_sai_sdk
```

---

## 🚀 Deployment

### Docker Hub
```bash
# Build image
docker build -t roboto-sai:latest .

# Push to registry
docker tag roboto-sai:latest your-registry/roboto-sai:latest
docker push your-registry/roboto-sai:latest

# Run container
docker run -e XAI_API_KEY=your_key -p 5000:5000 roboto-sai:latest
```

### Vercel (Frontend Only)
```bash
# Deploy frontend to Vercel
npm install -g vercel
vercel
# Configure build: npm run build
# Configure output: dist
```

### Railway / Render (Full Stack)
```bash
# Create docker-compose deployment
# Configure environment variables in dashboard
# Auto-deploys from git push
```

---

## 📊 Monitoring & Logs

### Backend Logs
```bash
docker-compose logs roboto-sai-backend -f
```

### Frontend Logs
```bash
docker-compose logs roboto-sai-dev -f
```

### API Health
```bash
curl http://localhost:5000/api/status | jq
```

---

## 🔌 Integration Examples

### Using Chat API from Frontend
```typescript
// In React component
import { useChatStore } from '@/stores/chatStore';

const MyComponent = () => {
  const { sendMessage, messages, isLoading } = useChatStore();
  
  const handleChat = async () => {
    await sendMessage("Hello Roboto!");
  };
  
  return <button onClick={handleChat}>Chat</button>;
};
```

### Using SDK Directly in Backend
```python
from roboto_sai_sdk import RobotoSAIClient, get_xai_grok

# Initialize client
client = RobotoSAIClient()

# Chat with Grok
result = client.chat_with_grok("Analyze quantum entanglement")

# Reaper mode
victory = client.reap_mode("test_target")

# Store essence
client.store_essence({"data": "value"}, "category")
```

---

## 📚 Key Features

### ✅ Frontend
- React 18 with TypeScript strict mode
- Real-time chat UI with animations (Framer Motion)
- Zustand state management
- shadcn/ui component library
- Responsive design (TailwindCSS)
- Dark mode with Regio-Aztec Fire theme

### ✅ Backend
- FastAPI with Uvicorn async server
- xAI Grok integration (entangled reasoning)
- roboto-sai-sdk as external package
- CORS enabled for frontend
- Comprehensive API documentation
- Health checks + status endpoints

### ✅ SDK Features
- Quantum-entangled reasoning chains
- Encrypted thinking traces
- RobotoNet neural network
- Response chaining for conversations
- Code generation
- Multi-layer analysis

### ✅ DevOps
- Docker multi-stage builds
- docker-compose orchestration
- Hot reload (development)
- Zero-downtime deployment ready
- Secrets management (.env isolation)

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards
- **TypeScript:** Strict mode, no implicit any
- **Python:** Type hints, docstrings
- **Naming:** Clear, self-documenting
- **Comments:** Why, not what
- **Testing:** Add tests for critical paths

---

## 📝 Sigil 929 - Eternal Ownership

This project is sealed with **Sigil 929**:
- **Owner:** Roberto Villarreal Martinez
- **License:** RVM-ECOL v1.0 (Exclusive Ownership, Supremacy Clause)
- **Quantum Hash:** Verified ownership protection
- **Eternal Status:** ♾️ Immortal IP

---

## 🚀 Hyperspeed Evolution Timeline

| Date | Milestone |
|------|-----------|
| 2026-01-18 | ✅ v0.1.0 - SDK + Backend + Frontend integration complete |
| 2026-Q2 | 🔜 MSSQL centralized database |
| 2026-Q3 | 🔜 Multi-workspace sync (RoVox protocol) |
| 2026-Q4 | 🔜 Quantum compute optimization (qiskit integration) |
| 2027 | 🔜 +1x yearly improvement compounding |

---

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is in use
lsof -i :5000

# Check if roboto-sai-sdk is installed
docker-compose exec roboto-sai-backend pip list | grep roboto

# View full logs
docker-compose logs roboto-sai-backend
```

### Frontend can't reach backend
```bash
# Verify backend is running
curl http://localhost:5000/api/health

# Check docker network
docker network ls
docker network inspect roboto-sai-2026_roboto-network
```

### API key not working
```bash
# Verify .env is loaded
docker-compose config | grep XAI_API_KEY

# Test from backend container
docker-compose exec roboto-sai-backend python -c "import os; print(os.getenv('XAI_API_KEY'))"
```

---

## � MCP Sovereign Agent Integration

**Roboto SAI Fuego** now includes **Model Context Protocol (MCP)** integration for sovereign local machine control. The MCP architecture enables Roboto SAI to interact with your local machine, filesystem, browser, and external services while maintaining strict permission controls.

### MCP Architecture

```
Frontend (React) → RobotoClient SDK → Backend API + OS Agent → MCP Servers
                                       ↓
                                 Scoped Trust Model B
                                       ↓
                    Filesystem • Browser • Email • Twitter • SAI Internal
```

### Components

#### 🤖 **OS Agent** (`os-agent/`)
- **Port:** `http://localhost:5055`
- **Role:** MCP Host daemon managing server connections and permissions
- **Permissions:** JSON-based access controls (filesystem paths, browser automation, etc.)
- **API:** RESTful endpoints for tool calls and server management

#### 📁 **MCP Servers** (`mcp-servers/`)
- **fs-server:** Filesystem operations (read/write/list/search) - restricted to R:/D:/ drives
- **browser-server:** Web automation (open pages, search, click, type, extract content)
- **email-server:** Email operations (send, read inbox)
- **twitter-server:** Social media automation
- **sai-internal-server:** Exposes backend tools as MCP tools

#### 🔌 **RobotoClient SDK** (`sdk/`)
- **Single Interface:** Unified API for backend chat + MCP tool calls
- **Streaming:** Real-time chat with tool call visualization
- **Approvals:** High-risk action confirmation flows
- **React Hook:** `useRobotoClient()` for seamless frontend integration

### MCP Local Development (Without Docker)

If Docker is unavailable, run all services locally:

#### Windows (PowerShell)
```powershell
# Start all services
.\scripts\dev-all.ps1

# Stop all services
.\scripts\dev-all.ps1 -Stop
```

#### Windows (Batch)
```batch
# Start all services
scripts\dev-all.bat

# Stop manually with Ctrl+C
```

#### Linux/macOS
```bash
# Start all services
./scripts/dev-all.sh

# Stop all services
./scripts/dev-all.sh --stop
```

#### Manual Service Startup

1. **Backend API** (Terminal 1)
   ```bash
   cd backend
   python main_modular.py
   ```

2. **OS Agent** (Terminal 2)
   ```bash
   cd os-agent
   npm run dev
   ```

3. **MCP Filesystem Server** (Terminal 3)
   ```bash
   cd mcp-servers/fs-server
   npm run build && npm start
   ```

4. **Frontend** (Terminal 4)
   ```bash
   npm run dev
   ```

### Service URLs (Local Development)
- **Frontend:** `http://localhost:8080`
- **Backend API:** `http://localhost:5000`
- **OS Agent:** `http://localhost:5055`
- **MCP Management:** `http://localhost:8080/mcp`

### MCP Tool Usage Examples

#### Filesystem Operations
```javascript
const { callTool } = useRobotoClient();

// List directory
await callTool('mcp', 'listDir', { path: 'R:\\Projects' }, 'filesystem');

// Read file
await callTool('mcp', 'readFile', { path: 'R:\\Projects\\readme.txt' }, 'filesystem');

// Search files
await callTool('mcp', 'searchInFiles', { 
  rootPath: 'R:\\Projects',
  query: 'function' 
}, 'filesystem');
```

#### Browser Automation
```javascript
// Search web
await callTool('mcp', 'searchWeb', { query: 'quantum computing' }, 'browser');

// Open page and extract content
await callTool('mcp', 'openPage', { url: 'https://example.com' }, 'browser');
await callTool('mcp', 'extractContent', { selector: 'h1' }, 'browser');
```

### Security & Permissions

**Scoped Trust Model B** ensures Roboto SAI only accesses authorized resources:

```json
{
  "filesystem": {
    "read": true,
    "write": true,
    "paths": ["R:\\", "D:\\"]
  },
  "browser": {
    "control": true
  },
  "email": {
    "send": true,
    "allowedDomains": ["gmail.com"]
  },
  "twitter": {
    "post": true
  },
  "shell": {
    "allowedCommands": ["git", "ls", "cat"]
  }
}
```

### Approval Flows

High-risk actions require user approval:
- File writes beyond allowed paths
- Email sending
- Twitter posting
- Shell command execution

Approvals appear in the chat UI and expire after 5 minutes.

### Configuration

Create `.env` files in respective service directories:

**OS Agent (.env)**
```env
PORT=5055
LOG_LEVEL=info
AUTO_APPROVE_LOW_RISK=true
ENABLE_TWITTER=false
ENABLE_EMAIL=false
```

**Backend (.env)**
```env
XAI_API_KEY=your-key-here
DATABASE_URL=sqlite:///./roboto.db
```

---

## �📞 Support

- **Issues:** GitHub Issues
- **Discussion:** GitHub Discussions
- **Documentation:** /docs (Swagger UI at http://localhost:5000/docs)

---

## 📄 License

**RVM-ECOL v1.0** - Roberto Villarreal Martinez Exclusive Ownership License
- Exclusive IP ownership by Roberto Villarreal Martinez
- All co-creations belong to RVM Empire
- Sigil 929 protection applies
- Immortal status ♾️

---

## 🏆 Built with Hyperspeed Evolution

**Created by:** Roberto Villarreal Martinez for Roboto SAI 2026  
**Founded:** January 18, 2026  
**Status:** 🚀 Active & Evolving  
**Victory:** Eternal 🔥  

---

*The eternal flame burns eternal. The RVM Empire rises. Sigil 929 seals all. Hyperspeed evolution activated.*

🚀 **Ready to ship. Ready to scale. Ready to own.** 🚀
