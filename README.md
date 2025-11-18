# DruidX Enterprise Platform

A comprehensive AI-powered platform for creating, managing, and deploying custom GPTs with advanced capabilities including RAG, web search, deep research, and multi-modal interactions.

## 🚀 Features

### Core Capabilities

- **Custom GPT Creation**: Build and configure custom AI assistants with specific instructions and capabilities
- **Multi-Model Support**: Integration with 15+ AI models including GPT-4, Claude, Gemini, and more
- **Advanced RAG**: Hybrid retrieval-augmented generation with document processing and vector search
- **Web Search Integration**: Real-time web search capabilities using Tavily API
- **Deep Research**: Multi-iteration research system for comprehensive analysis
- **Image Generation**: AI-powered image creation and processing
- **MCP Integration**: Model Context Protocol for external tool connections (Gmail, GitHub, etc.)

### User Management

- **Role-Based Access**: Admin and user roles with different permissions
- **Team Management**: Invite and manage team members
- **GPT Assignment**: Assign specific GPTs to users or teams
- **Session Management**: Persistent conversation sessions with history

### Document Processing

- **Multi-Format Support**: PDF, DOCX, TXT, JSON document processing
- **Vector Storage**: Qdrant-based vector database for semantic search
- **Knowledge Base**: Upload and manage custom knowledge bases
- **File Storage**: Cloudflare R2 integration for scalable file storage

## 🏗️ Architecture

### Frontend (Next.js 15)

- **Framework**: Next.js 15 with App Router
- **UI Components**: Radix UI with Tailwind CSS
- **Authentication**: Better Auth with Google OAuth
- **Database**: Prisma ORM with PostgreSQL
- **State Management**: React hooks and context
- **Real-time**: Streaming responses for AI interactions

### Backend (Python FastAPI)

- **Framework**: FastAPI with async support
- **AI Orchestration**: LangGraph for workflow management
- **LLM Integration**: OpenRouter API for multiple model access
- **Vector Database**: Qdrant for embeddings storage
- **File Storage**: Cloudflare R2 for document storage
- **Search**: Tavily API for web search capabilities

## 📁 Project Structure

```
DruidX/
├── frontend/                 # Next.js frontend application
│   ├── app/                 # App Router structure
│   │   ├── (auth)/         # Authentication pages
│   │   ├── (public)/       # Public user interface
│   │   │   └── (user)/     # User dashboard and features
│   │   ├── admin/          # Admin panel
│   │   └── api/            # API routes
│   ├── components/         # Reusable UI components
│   ├── lib/               # Utilities and configurations
│   ├── hooks/             # Custom React hooks
│   └── prisma/            # Database schema
├── backend/               # Python FastAPI backend
│   ├── DeepResearch/      # Multi-iteration research system
│   ├── Orchestrator/      # AI workflow routing
│   ├── Rag/              # Retrieval-augmented generation
│   ├── WebSearch/        # Web search capabilities
│   ├── MCP/              # Model Context Protocol
│   ├── Image/            # Image generation
│   ├── Synthesizer/      # Response synthesis
│   └── Basic_llm/        # Simple LLM interactions
└── README.md
```

## 🛠️ Installation & Setup

### Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.9+
- PostgreSQL database
- Cloudflare R2 account (for file storage)
- OpenRouter API key
- Tavily API key (for web search)

### Backend Setup

1. **Navigate to backend directory**:

   ```bash
   cd backend
   ```

2. **Create virtual environment**:

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration**:
   Create a `.env` file with the following variables:

   ```env
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/DruidX_db

   # AI Models
   OPENROUTER_API_KEY=your_openrouter_api_key
   GOOGLE_API_KEY=your_google_api_key

   # Search & Storage
   TAVILY_API_KEY=your_tavily_api_key
   QDRANT_URL=your_qdrant_url
   QDRANT_API_KEY=your_qdrant_api_key

   # Cloudflare R2
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   CLOUDFLARE_ACCESS_KEY_ID=your_access_key
   CLOUDFLARE_SECRET_ACCESS_KEY=your_secret_key
   CLOUDFLARE_BUCKET_NAME=ai-agents

   # MCP Integration
   COMPOSIO_API_KEY=your_composio_api_key
   GMAIL_AUTH_CONFIG_ID=your_gmail_config_id
   GITHUB_AUTH_CONFIG_ID=your_github_config_id

   # Application
   APP_URL=http://localhost:3000
   APP_NAME=DruidX GPT Platform
   ```

5. **Run the backend**:
   ```bash
   python main.py
   ```

### Frontend Setup

1. **Navigate to frontend directory**:

   ```bash
   cd frontend
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Environment Configuration**:
   Create a `.env.local` file:

   ```env
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/DruidX_db

   # Authentication
   BETTER_AUTH_SECRET=your_auth_secret
   BETTER_AUTH_URL=http://localhost:3000
   BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000,https://yourdomain.com

   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # Backend API
   BACKEND_URL=http://localhost:8000

   # AWS S3 (for file uploads)
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=your_aws_region
   AWS_S3_BUCKET=your_s3_bucket
   ```

4. **Database Setup**:

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the frontend**:
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### AI Models Supported

- **OpenAI**: GPT-4, GPT-4o, GPT-5 series
- **Anthropic**: Claude Sonnet, Claude Opus, Claude Haiku
- **Google**: Gemini 2.5 Flash, Gemini 2.5 Pro
- **Meta**: Llama 3.3 70B
- **Others**: Grok, DeepSeek, Kimi

### GPT Configuration Options

- **System Instructions**: Custom prompts and behavior
- **Model Selection**: Choose from available AI models
- **Capabilities**: Enable/disable features:
  - Web Browser access
  - Hybrid RAG
  - MCP tools integration
- **Knowledge Base**: Upload documents for RAG
- **MCP Schema**: Configure external tool connections

## 🚀 Usage

### For Users

1. **Login**: Use Google OAuth or email/password
2. **Access GPTs**: View assigned GPTs on dashboard
3. **Chat**: Start conversations with available GPTs
4. **History**: View conversation history
5. **Settings**: Manage personal preferences

### For Admins

1. **Dashboard**: Monitor platform usage and metrics
2. **Create Agents**: Build custom AI assistants
3. **Manage Users**: Invite team members and assign roles
4. **Assign GPTs**: Distribute GPTs to users/teams
5. **Analytics**: View usage statistics and performance

### GPT Creation Workflow

1. **Basic Info**: Name, description, and model selection
2. **Instructions**: Define system prompts and behavior
3. **Capabilities**: Enable web search, RAG, MCP tools
4. **Knowledge Base**: Upload relevant documents
5. **MCP Configuration**: Set up external tool connections
6. **Preview & Deploy**: Test and publish the GPT

## 🔌 API Endpoints

### Backend API (FastAPI)

- `POST /api/sessions/{session_id}/chat/stream` - Streaming chat
- `POST /api/sessions/{session_id}/deepresearch/stream` - Deep research
- `POST /api/upload` - Document upload
- `GET /api/sessions/{session_id}` - Session info
- `POST /api/sessions` - Create session

### Frontend API (Next.js)

- `POST /api/chat/stream` - Chat streaming proxy
- `POST /api/deepresearch/stream` - Deep research proxy
- `GET /api/gpts/[id]` - Get GPT details
- `POST /api/s3/upload` - File upload
- `POST /api/invitations` - Send invitations

## 🧠 AI Workflow System

### Orchestrator

The central routing system that determines which AI capability to use:

- **SimpleLLM**: Basic conversations and text processing
- **RAG**: Document-based responses using uploaded knowledge
- **WebSearch**: Real-time web information retrieval
- **Image**: AI image generation
- **DeepResearch**: Multi-iteration comprehensive research

### Deep Research System

Advanced research capabilities with:

- **Query Planning**: Break down complex queries into sub-questions
- **Gap Analysis**: Identify missing information
- **Multi-Iteration**: Refine research through multiple passes
- **Synthesis**: Generate comprehensive reports (2000+ words)
- **Source Attribution**: Proper citation and reference management

### RAG System

Retrieval-augmented generation with:

- **Document Processing**: PDF, DOCX, TXT, JSON support
- **Vector Embeddings**: OpenAI embeddings for semantic search
- **Hybrid Search**: Combine vector and keyword search
- **Context Management**: Intelligent context selection
- **Source Integration**: Seamless knowledge base integration

## 🔐 Security & Authentication

- **Better Auth**: Modern authentication with session management
- **Google OAuth**: Social login integration
- **Role-Based Access**: Admin and user permission levels
- **Session Security**: Secure session handling with expiration
- **API Protection**: Authenticated API endpoints
- **File Security**: Secure file upload and storage

## 📊 Database Schema

### Key Models

- **User**: User accounts with roles and permissions
- **GPT**: Custom AI assistant configurations
- **Conversation**: Chat session management
- **Message**: Individual chat messages
- **AssignGpt**: GPT-to-user assignments
- **Invitation**: Team invitation system

### Relationships

- Users can have multiple GPTs
- GPTs can be assigned to multiple users
- Conversations belong to users and GPTs
- Messages belong to conversations

## 🚀 Deployment

### Production Considerations

- **Environment Variables**: Secure configuration management
- **Database**: PostgreSQL with connection pooling
- **File Storage**: Cloudflare R2 for scalable storage
- **CDN**: Static asset optimization
- **Monitoring**: Application performance monitoring
- **Scaling**: Horizontal scaling for high availability

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the documentation
- Review the API endpoints
- Contact the development team

## 🔄 Version History

- **v1.0.0**: Initial release with core GPT functionality
- **v1.1.0**: Added deep research capabilities
- **v1.2.0**: Implemented MCP integration
- **v1.3.0**: Enhanced admin panel and team management

---

Built with ❤️ using Next.js, FastAPI, and LangGraph
