from dotenv import load_dotenv
import os
import asyncio
import logging
import time
from datetime import date
from typing import Optional, List, Callable, Any, AsyncIterable, AsyncGenerator
import sys
import subprocess
import platform
import json
import redis.asyncio as redis
import re

from livekit import agents
from livekit.agents import (
    Agent,
    AgentSession,
    RoomInputOptions,
    RoomOutputOptions,
    function_tool,
    RunContext,
    ChatContext,
    JobProcess,
    AudioConfig,
    BackgroundAudioPlayer,
    # BuiltinAudioClip,
    stt,
    tts,
    ConversationItemAddedEvent,
    UserInputTranscribedEvent,
)
from livekit.agents.llm import ImageContent, AudioContent, ChatMessage
from livekit.plugins import (
    google,
    openai,
    noise_cancellation,
    silero,
    speechify,
    deepgram,
    elevenlabs,
    cartesia,
    hume,
)

# Import the web search tool
from langgraph_websearcch import TavilyWebSearchTool

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from Rag.Rag import _search_collection
from redis_client import ensure_redis_client

# Set up logging to see more detailed error messages
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    stream=sys.stderr,  # Write to stderr so Railway can see it
)
logger = logging.getLogger("voice_assistant")

load_dotenv()


async def get_redis_client():
    """Initialize and return an async Redis client for the agent."""
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        logger.warning("REDIS_URL not found. Cannot fetch voice config from Redis.")
        return None
    try:
        client = await redis.from_url(redis_url, decode_responses=True)
        await client.ping()
        logger.info("Agent successfully connected to Redis.")
        return client
    except Exception as e:
        logger.error(f"Agent could not connect to Redis: {e}")
        return None


class ReliableDeepgramSTT(deepgram.STT):
    """Enhanced Deepgram STT implementation with better error handling"""

    def __init__(
        self,
        model: str = "nova-3",
        api_key: Optional[str] = None,
        language: str = "multi",
        max_retries: int = 3,
        retry_delay: float = 0.2,
    ):
        super().__init__(model=model, api_key=api_key, language=language)
        self.max_retries = max_retries
        self.retry_delay = retry_delay

    async def _run(self):
        """Override _run method to add retry logic"""
        retries = 3
        last_error = None

        while retries < self.max_retries:
            try:
                return await super()._run()
            except Exception as e:
                last_error = e
                retries += 1
                if retries < self.max_retries:
                    logger.warning(
                        f"STT error (attempt {retries}/{self.max_retries}): {str(e)}. Retrying in {self.retry_delay}s..."
                    )
                    await asyncio.sleep(self.retry_delay)
                    # Increase retry delay with each attempt (exponential backoff)
                    self.retry_delay *= 1.0

        logger.error(
            f"STT failed after {self.max_retries} attempts: {str(last_error)}"
        )
        try:
            logger.info("Attempting to restart Deepgram connection...")
            return await super()._run()
        except Exception as e:
            logger.error(f"Failed to restart Deepgram connection: {str(e)}")
            raise

DEEPGRAM_TTS_MODELS = ("aura-2-ophelia-en", "aura-2-helena-en", "aura-2-mars-en")
DEEPGRAM_STT_MODELS = ("nova-3", "nova-2")
CARTESIA_STT_MODELS = ("ink-whisper", "ink-whisper-2025-06-04")
ELEVENLABS_TTS_MODELS = ("ODq5zmih8GrVes37Dizd","Xb7hH8MSUJpSbSDYk0k2", "iP95p4xoKVk53GoZ742B")
CARTESIA_TTS_MODELS = ("f786b574-daa5-4673-aa0c-cbe3e8534c02", "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc","228fca29-3a0a-435c-8728-5cb483251068","6ccbfb76-1fc6-48f7-b71d-91ac6298247b")
CARTESIA_SONI3_MODEL = "sonic-3"
HUME_TTS_MODELS = ("Colton Rivers", "Ava Song","Priya","Suresh")

class VoiceAssistant:
    def __init__(
        self,
        instructions: str = None,
        tools: List[Callable] = None,
        openai_model: str = "gpt-4.1-nano",
        stt_model: str = "nova-3",
        tts_model: str = "f786b574-daa5-4673-aa0c-cbe3e8534c02",
        initial_greeting: str = "Greet the user warmly, introduce yourself as a voice assistant, and offer your assistance.",
        enable_parallel_tts: bool = False,
        vad_config: dict = None,
        job_ctx: agents.JobContext = None,
    ):
        if instructions is None:
            current_date = date.today().strftime("%B %d, %Y")
            self.instructions = (
                f"<prompt>"
                f"<today>{current_date}</today>"
                f"<persona>Helpful voice assistant with web search.</persona>"
                f"<behavior>Be concise, friendly, and accurate.</behavior>"
                f"<fallback>Call web_search when knowledge is insufficient.</fallback>"
                f"</prompt>"
            )
        else:
            self.instructions = instructions
        self.openai_model = openai_model
        self.stt_model = stt_model
        self.tts_model = tts_model
        self.initial_greeting = initial_greeting
        self.enable_parallel_tts = enable_parallel_tts
        self.vad_config = vad_config or {}
        self.job_ctx = job_ctx

        current_dir = os.path.dirname(os.path.abspath(__file__))

        audio_file_path = os.path.join(current_dir, "assets", "thinking_sound.wav")
        self.background_audio = BackgroundAudioPlayer(
            thinking_sound=[
                AudioConfig(audio_file_path, volume=0.05)
            ]
        )
        try:
            self.web_search_tool = TavilyWebSearchTool(max_results=3)
            logger.info("Tavily web search tool initialized.")
        except Exception as e:
            self.web_search_tool = None
            logger.error(f"Failed to initialize TavilyWebSearchTool: {e}")
        self.tools = tools or ([self.web_search] if self.web_search_tool else [])

        self.session = None
        self.agent_instance = None
        self.stt_error_count = 0
        self.tts_error_count = 0
        self.tts_semaphore = asyncio.Semaphore(1)
        self.last_printed_len = 0
        self.last_role = None
        self.ctx = None
        self.enable_rag = True
        self.rag_session_id = None
        self._session_cache: dict[str, dict] = {}


    @function_tool
    async def web_search(
        self,
        context: RunContext,
        query: str,
    ):
        """Used to search the web for information about a topic, event, or person."""
        if not self.web_search_tool:
            return "I'm sorry, my web search tool is currently unavailable."

        logger.info(f"Performing web search for: {query}")
        try:
            response_dict = await self.web_search_tool.asearch(query=query)
            if (
                not response_dict
                or "results" not in response_dict
                or not response_dict["results"]
            ):
                return f"I couldn't find any information about {query}."

            # Extract the actual list of results from the dictionary.
            search_results = response_dict["results"]

            # Format the results for a voice response
            summary = "Here's what I found: "
            snippets = []
            # Now, correctly slice the search_results list.
            for result in search_results[:2]:
                if "content" in result and result["content"]:
                    snippets.append(result["content"])

            if not snippets:
                return (
                    f"I found some results for {query}, but couldn't extract a clear summary."
                )

            # Combine snippets into a single summary
            summary += " ".join(snippets)

            # Keep the response concise for voice
            if len(summary) > 400:  # Approx 100 words
                summary = summary[:400] + "..."

            return summary

        except Exception as e:
            logger.error(f"Error during web search for '{query}': {e}")
            return "I'm sorry, I encountered an error while searching the web. Please try again."

    async def transcription_node(
        self, text: AsyncIterable[str | agents.voice.io.TimedString], model_settings: agents.ModelSettings
    ) -> AsyncGenerator[str | agents.voice.io.TimedString, None]:
        async for chunk in text:
            if isinstance(chunk, agents.voice.io.TimedString):
                logger.info(f"TimedString: '{chunk}' ({chunk.start_time} - {chunk.end_time})")
            yield chunk

    def _create_agent(self) -> Agent:
        """Create the agent instance with instructions, tools, and RAG injection"""
        from livekit.agents import ModelSettings
        from livekit.agents.llm import ChatChunk

        class RAGEnabledAgent(Agent):
            def __init__(self, voice_assistant_instance, chat_ctx: ChatContext):
                super().__init__(
                    chat_ctx=chat_ctx,
                    instructions=(
                        f"{voice_assistant_instance.instructions}"
                        "<prompt>"
                        "<audio_issue>Suggest text input if audio fails.</audio_issue>"
                        "<network_issue>Explain temporary connection problems calmly.</network_issue>"
                        "</prompt>"
                    ),
                    tools=voice_assistant_instance.tools,
                )
                self.voice_assistant = voice_assistant_instance

            async def llm_node(
                self,
                chat_ctx: ChatContext,
                tools: list,
                model_settings: ModelSettings
            ) -> AsyncIterable[ChatChunk | str]:
                """Override llm_node to inject RAG context before LLM runs"""
                logger.info(f"🤖 llm_node CALLED - Chat context has {len(chat_ctx.items)} items")

                try:
                    await self.voice_assistant._inject_rag_context(chat_ctx)
                except Exception as e:
                    logger.error(f"❌ Error injecting RAG context: {e}", exc_info=True)

                async for chunk in Agent.default.llm_node(self, chat_ctx, tools, model_settings):
                    yield chunk

        return RAGEnabledAgent(self, ChatContext())

    def _is_uuid_format(self, text: str) -> bool:
        """Check if text looks like a UUID (Cartesia voice ID format)"""
        if not text:
            return False
        import re
        uuid_pattern = r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
        return bool(re.match(uuid_pattern, text.lower()))

    async def _verify_api_keys(self) -> bool:
        """Verify that all required API keys are available"""
        required_keys = {
            "LIVEKIT_API_KEY": os.getenv("LIVEKIT_API_KEY"),
            "LIVEKIT_API_SECRET": os.getenv("LIVEKIT_API_SECRET"),
            "LIVEKIT_URL": os.getenv("LIVEKIT_URL"),
            "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
            "DEEPGRAM_API_KEY": os.getenv("DEEPGRAM_API_KEY"),
            "TAVILY_API_KEY": os.getenv("TAVILY_API_KEY"),
            "ELEVENLABS_API_KEY": os.getenv("ELEVENLABS_API_KEY"),
            "CARTESIA_API_KEY": os.getenv("CARTESIA_API_KEY"),
            "HUME_API_KEY": os.getenv("HUME_API_KEY"),
        }

        missing_keys = [key for key, value in required_keys.items() if not value]

        if missing_keys:
            for key in missing_keys:
                logger.error(f"{key} not found in environment variables")
            logger.error("Please add missing keys to your .env file and try again.")
            return False

        logger.info("All API keys found. Initializing agent...")
        return True

    async def initialize_session(self) -> Optional[AgentSession]:
        """Initialize the agent session with all required components and enhanced error handling"""
        if not await self._verify_api_keys():
            return None
        stt_plugin = None
        logger.info(f"Configuring STT with model: {self.stt_model}")
        if self.stt_model in DEEPGRAM_STT_MODELS:
            stt_plugin = deepgram.STT(model=self.stt_model,language="multi", api_key=os.getenv("DEEPGRAM_API_KEY"))
            logger.info("Using Deepgram STT plugin.")

        elif self.stt_model in CARTESIA_STT_MODELS:
            stt_plugin = cartesia.STT(model=self.stt_model, api_key=os.getenv("CARTESIA_API_KEY"))
            logger.info("Using Cartesia STT plugin.")
        else:
            logger.warning(f"STT model '{self.stt_model}' not recognized. Defaulting to Deepgram's 'nova-3'.")
            stt_plugin = deepgram.STT(model="nova-3")
        tts_plugin = None
        logger.info(f"Configuring TTS with voice ID/model from main.py: {self.tts_model}")
        
        if self.tts_model in CARTESIA_TTS_MODELS or self._is_uuid_format(self.tts_model):
            tts_plugin = cartesia.TTS(model="sonic-3", voice=self.tts_model, api_key=os.getenv("CARTESIA_API_KEY"))
            logger.info(f"Using Cartesia Soni 3 (Sonic-3) TTS plugin with voice ID from main.py: {self.tts_model}")
        elif self.tts_model in DEEPGRAM_TTS_MODELS:
            tts_plugin = deepgram.TTS(model=self.tts_model, api_key=os.getenv("DEEPGRAM_API_KEY"))
            logger.info(f"Using Deepgram TTS plugin with model from main.py: {self.tts_model}")
        elif self.tts_model in ELEVENLABS_TTS_MODELS:
            tts_plugin = elevenlabs.TTS(voice_id=self.tts_model, model="eleven_turbo_v2_5", api_key=os.getenv("ELEVENLABS_API_KEY"))
            logger.info(f"Using ElevenLabs TTS plugin with voice ID from main.py: {self.tts_model}")
        elif self.tts_model in HUME_TTS_MODELS:
            tts_plugin = hume.TTS(voice=hume.VoiceByName(name=self.tts_model, provider=hume.VoiceProvider.hume), api_key=os.getenv("HUME_API_KEY"))
            logger.info(f"Using Hume TTS plugin with voice from main.py: {self.tts_model}")
        else:
            logger.warning(f"TTS model '{self.tts_model}' from main.py not in recognized lists. Using Cartesia TTS as fallback.")
            try:
                tts_plugin = cartesia.TTS(model="sonic-3", voice=self.tts_model, api_key=os.getenv("CARTESIA_API_KEY"))
                logger.info(f"Using Cartesia TTS plugin with model from main.py: {self.tts_model}")
            except Exception as e:
                logger.warning(f"Failed to use '{self.tts_model}' as Cartesia model: {e}. Defaulting to Cartesia Sonic-3 model and voice: f786b574-daa5-4673-aa0c-cbe3e8534c02.")
                tts_plugin = cartesia.TTS(model="sonic-3", voice="f786b574-daa5-4673-aa0c-cbe3e8534c02", api_key=os.getenv("CARTESIA_API_KEY"))
                logger.info("Using Cartesia TTS plugin with default model: sonic-3 and default voice ID: f786b574-daa5-4673-aa0c-cbe3e8534c02")

        # VAD Caching Logic
        vad_cache = self.job_ctx.job.proc.userdata.get("vad_cache", {})
        default_params = {
            "min_speech_duration": 0.05,
            "max_buffered_speech": 60.0,
            "activation_threshold": 0.5,
            "min_silence_duration": 0.7,
        }
        current_params = {
            "min_speech_duration": self.vad_config.get("min_speech_duration", default_params["min_speech_duration"]),
            "max_buffered_speech": self.vad_config.get("max_buffered_speech", default_params["max_buffered_speech"]),
            "activation_threshold": self.vad_config.get("activation_threshold", default_params["activation_threshold"]),
            "min_silence_duration": self.vad_config.get("min_silence_duration", default_params["min_silence_duration"]),
        }
        vad_key = frozenset(current_params.items())
        vad_instance = vad_cache.get(vad_key)

        if not vad_instance:
            logger.info(f"VAD config not in cache. Loading new VAD instance with params: {current_params}")
            vad_instance = silero.VAD.load(
                force_cpu=False,
                sample_rate=16000,
                **current_params
            )
            vad_cache[vad_key] = vad_instance
        else:
            logger.info(f"Using cached VAD instance for params: {current_params}")

        self.session = AgentSession(
            vad=vad_instance,
            stt=stt_plugin,
            llm=openai.LLM(model=self.openai_model),
            tts=tts_plugin,
            use_tts_aligned_transcript=True,
        )

        logger.info("AgentSession initialized with the following models:")
        logger.info(f"  - VAD: Silero VAD (Custom config: {bool(self.vad_config)})")
        logger.info(f"  - STT: {stt_plugin.__class__.__module__} (Model: {self.stt_model})")
        logger.info(f"  - LLM: OpenAI (Model: {self.openai_model})")
        logger.info(f"  - TTS: {tts_plugin.__class__.__module__} (Model: {self.tts_model})")


        return self.session

    async def _setup_parallel_tts_for_web_search(self):
        """Set up parallel TTS functionality with better timing."""
        if not self.enable_parallel_tts or not self.session:
            return

        for tool in self.tools:
            if hasattr(tool, "__name__") and tool.__name__ == "web_search":
                original_web_search = tool

                @function_tool
                async def enhanced_web_search(context: RunContext, query: str):
                    """Enhanced web search with faster parallel TTS"""
                    is_first_chunk = True
                    tts_task = None

                    # Define the streaming callback
                    def streaming_callback(partial_text):
                        nonlocal is_first_chunk, tts_task

                        # Process any meaningful chunk immediately
                        if is_first_chunk and len(partial_text) > 15:
                            is_first_chunk = False

                            # Launch TTS immediately with minimal content
                            if self.session:
                                try:
                                    # Start TTS within 50ms with first sentence
                                    first_sentence = partial_text.split(".")[0] + "."

                                    async def process_tts():
                                        try:
                                            await self.session.generate_reply(
                                                text=first_sentence, interrupt=True
                                            )
                                        except Exception as e:
                                            logger.error(f"Parallel TTS error: {e}")

                                    tts_task = asyncio.create_task(process_tts())
                                except Exception as e:
                                    logger.error(f"Error scheduling TTS: {e}")

                    # Call original search with minimal timeout (3s)
                    try:
                        result = await asyncio.wait_for(
                            original_web_search(context, query), timeout=1.0
                        )
                        return result
                    except asyncio.TimeoutError:
                        # Return partial result while search continues in background
                        return "I'm looking into that now. Here's what I know so far..."

    def on_conversation_item_added(self, event: ConversationItemAddedEvent):
        """Callback for when a conversation item is added, streaming word by word."""
        if event.item.role == "assistant":
            # Check if this is a new response from the assistant
            if self.last_role != "assistant":
                self.last_printed_len = 0
                print(f"\n\nStreaming Assistant Response: ", end="", flush=True)

            if event.item.text_content:
                full_text = event.item.text_content
                new_text = full_text[self.last_printed_len:]

                # Print word by word to simulate typing
                words = new_text.split(" ")
                for i, word in enumerate(words):
                    if not word:
                        continue
                    print(f"{word}{' ' if i < len(words) - 1 else ''}", end="", flush=True)

                self.last_printed_len = len(full_text)

        # Update the last role seen to correctly detect the start of a new message
        self.last_role = event.item.role

    def on_user_input_transcribed(self, event: UserInputTranscribedEvent):
        """Callback for when user input is transcribed"""
        logger.info(
            f"🎤 User input transcribed: {event.transcript}, "
            f"language: {event.language}, "
            f"final: {event.is_final}, "
            f"speaker id: {event.speaker_id}"
        )
        
        # User transcriptions are automatically published via text streams

    async def _inject_rag_context(self, chat_ctx: ChatContext) -> None:
        """Perform RAG lookup from KB and inject context into chat context"""
        logger.info(f"🔍 _inject_rag_context called - RAG enabled: {self.enable_rag}")

        if not self.enable_rag:
            logger.debug("RAG is disabled, skipping KB lookup")
            return

        session_id = self.rag_session_id
        if not session_id and self.ctx and self.ctx.room:
            room_name = self.ctx.room.name
            if room_name and room_name.startswith("voice-"):
                suffix = room_name[len("voice-") :]
                if suffix:
                    session_id = suffix
                    self.rag_session_id = session_id

        if not session_id:
            logger.debug("No session_id found for RAG lookup")
            return

        session = await self._get_session_config(session_id)
        if not session:
            return

        gpt_config = session["gpt_config"]
        custom_instructions = gpt_config.get("instruction", "")
        gpt_id = gpt_config.get("gpt_id")
        user_id = gpt_config.get("userId")

        if not gpt_id or not user_id:
            logger.debug("No gpt_id or userId in session, skipping KB RAG")
            return

        collection_name = f"kb_{gpt_id}_{user_id}"

        user_query = ""
        if chat_ctx.items:
            for item in reversed(chat_ctx.items):
                if isinstance(item, ChatMessage) and item.role == "user":
                    if hasattr(item, "text_content") and item.text_content:
                        user_query = item.text_content
                    elif item.content:
                        if isinstance(item.content, str):
                            user_query = item.content
                        else:
                            user_query = " ".join(
                                str(part) for part in item.content if isinstance(part, str)
                            )
                    break

        if not user_query:
            logger.debug("No user query found in chat context")
            return

        logger.info(f"🔍 Performing RAG lookup for query: {user_query[:100]}")
        logger.info(
            f"🔍 RAG Search Config - Collection: {collection_name}, Query: {user_query[:100]}"
        )

        rag_results = await _search_collection(collection_name, user_query, limit=2)

        def _fallback_message():
            logger.info(
                "No relevant KB content found. Allowing agent to use general knowledge or web search."
            )
            fallback_xml = (
                "<prompt>"
                "<kb_status>missing</kb_status>"
                "<action>Answer with general reasoning and call web_search if needed.</action>"
                "</prompt>"
            )
            chat_ctx.add_message(role="system", content=fallback_xml)

        filtered_results = [chunk for chunk in rag_results if chunk and chunk.strip()]
        if not filtered_results:
            _fallback_message()
            return

        query_tokens = {
            token
            for token in re.findall(r"\b\w{4,}\b", user_query.lower())
        }
        if query_tokens:
            relevance_found = any(
                any(token in chunk.lower() for token in query_tokens)
                for chunk in filtered_results
            )
            if not relevance_found:
                _fallback_message()
                return

        logger.info(f"📚 Retrieved {len(filtered_results)} chunks from KB")
        rag_context = "\n\n".join(filtered_results[:2])

        if custom_instructions:
            context_message = (
                "<kb_prompt>"
                f"<role>{custom_instructions}</role>"
                f"<knowledge>{rag_context}</knowledge>"
                "<rules>"
                "<rule>Prefer the knowledge when it directly answers the question.</rule>"
                "<rule>If the question moves beyond this scope, reply like a normal voice assistant and use web_search if helpful.</rule>"
                "<rule>Reference concrete facts when you do use the knowledge.</rule>"
                "</rules>"
                "</kb_prompt>"
            )
        else:
            context_message = (
                "<kb_prompt>"
                "<role>General voice assistant with optional knowledge snippets.</role>"
                f"<knowledge>{rag_context}</knowledge>"
                "<rules>"
                "<rule>Blend these snippets naturally into your answer when relevant.</rule>"
                "<rule>If they do not help, rely on general reasoning or web_search.</rule>"
                "</rules>"
                "</kb_prompt>"
            )

        chat_ctx.add_message(
            role="assistant",
            content=context_message
        )

        logger.info(f"✅ Injected KB context for session {session_id}")

    async def _get_session_config(self, session_id: str) -> Optional[dict]:
        if session_id in self._session_cache:
            return self._session_cache[session_id]

        try:
            redis_client = await ensure_redis_client()
            if not redis_client:
                logger.warning("Redis not available for RAG session lookup")
                return None

            session_key = f"session:{session_id}"
            session_data = await redis_client.get(session_key)
            if not session_data:
                logger.warning(f"Session {session_id} not found in Redis for RAG lookup")
                logger.debug(f"Tried to access session key: {session_key}")
                return None

            session = json.loads(session_data)
            session.setdefault("gpt_config", {})
            self._session_cache[session_id] = session
            logger.info(f"✅ Cached session {session_id} from Redis for RAG")
            return session
        except Exception as e:
            logger.warning(f"Could not get session for RAG: {e}", exc_info=True)
            return None

    async def start(self, ctx: agents.JobContext) -> None:
        """Start the agent in the provided room context with error handling"""
        logger.info(f"Starting voice assistant for room: {ctx.room.name}")

        # Store context for use in callbacks
        self.ctx = ctx

        if ctx.room and ctx.room.name:
            room_name = ctx.room.name
            if room_name.startswith("voice-"):
                suffix = room_name[len("voice-") :]
                if suffix:
                    self.rag_session_id = suffix

        # Initialize session if not already done, with retry
        retry_count = 0
        while not self.session and retry_count < 2:
            if await self.initialize_session():
                break
            retry_count += 1
            if retry_count < 3:
                logger.warning(
                    f"Session initialization failed. Retrying ({retry_count}/3)..."
                )
                await asyncio.sleep(1)

        if not self.session:
            logger.error("Failed to initialize session after 3 attempts.")
            return

        # Set up parallel TTS for web search if enabled
        if self.enable_parallel_tts:
            await self._setup_parallel_tts_for_web_search()

        # Create agent instance with transcription hooks
        self.agent_instance = self._create_agent()

        # Hook into STT events to capture user transcriptions
        original_on_user_speech_committed = None
        if hasattr(self.session, "on_user_speech_committed"):
            original_on_user_speech_committed = self.session.on_user_speech_committed

            async def on_user_speech(text: str):
                logger.info(f"🎤 User speech committed: {text}")
                # REMOVE manual transcription sending - LiveKit handles this automatically
                if original_on_user_speech_committed:
                    await original_on_user_speech_committed(text)

            self.session.on_user_speech_committed = on_user_speech

        try:
            logger.info("Connecting agent to room...")
            # Connect to the room first
            await ctx.connect()
            logger.info("Agent connected to room successfully")

            # Start the session after connecting
            logger.info("Starting agent session...")
            await self.session.start(
                room=ctx.room,
                agent=self.agent_instance,
                room_input_options=RoomInputOptions(
                    # Noise cancellation
                    noise_cancellation=noise_cancellation.BVC(),
                ),
                room_output_options=RoomOutputOptions(sync_transcription=True),
            )
            # Register event listeners
            self.session.on("conversation_item_added", self.on_conversation_item_added)
            self.session.on("user_input_transcribed", self.on_user_input_transcribed)

            logger.info("Agent session started successfully")
            await self.background_audio.start(room=ctx.room, agent_session=self.session)

            # Generate initial greeting with retry and send transcription
            logger.info("Generating initial greeting...")
            await self._generate_greeting_with_retry()
            logger.info("Initial greeting sent successfully")

        except Exception as e:
            logger.error(f"Error starting assistant: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

    async def _generate_greeting_with_retry(self, max_attempts=1):
        """Generate initial greeting with retry mechanism"""
        for attempt in range(max_attempts):
            try:
                await self.session.generate_reply(instructions=self.initial_greeting)
                logger.info("✅ Initial greeting generated successfully!")
                return
            except Exception as e:
                if attempt < max_attempts - 1:
                    logger.warning(
                        f"Error generating initial greeting (attempt {attempt+1}/{max_attempts}): {str(e)}"
                    )
                    await asyncio.sleep(1)
                else:
                    logger.error(
                        f"Failed to generate initial greeting after {max_attempts} attempts: {str(e)}"
                    )

    async def _monitor_for_errors(self):
        """Monitor for repeated errors and attempt recovery"""
        while True:
            await asyncio.sleep(5)  # Check every 5 seconds

            # If multiple STT or TTS errors accumulate, try to recover
            if self.stt_error_count > 1 or self.tts_error_count > 1:
                logger.warning(
                    f"Detected multiple errors (STT: {self.stt_error_count}, TTS: {self.tts_error_count}). Attempting recovery..."
                )

                try:
                    # Reset error counters
                    self.stt_error_count = 0
                    self.tts_error_count = 0

                    # Attempt to notify user of the issue
                    if self.session:
                        try:
                            await self.session.generate_reply(
                                instructions="Inform the user that there may be temporary connection issues, and that you're working to resolve them."
                            )
                        except Exception:
                            pass  # Ignore errors in the notification itself

                except Exception as e:
                    logger.error(f"Error during recovery attempt: {str(e)}")

    async def run(self, ctx: agents.JobContext) -> None:
        """Run the agent and keep it alive until terminated with enhanced error recovery"""
        await self.start(ctx)

        if not self.session or not self.agent_instance:
            logger.error("Failed to start the agent properly.")
            return

        # Start the error monitoring task
        error_monitoring_task = asyncio.create_task(self._monitor_for_errors())

        # Keep the session running until terminated
        try:
            logger.info(
                "Agent is now listening. Press Ctrl+B to toggle between Text/Audio mode."
            )

            # Use a simple loop to keep the session alive with health checks
            while True:
                try:
                    await asyncio.sleep(1)

                except Exception as loop_error:
                    logger.error(f"Loop error: {str(loop_error)}")
                    # Try to continue despite the error

        except KeyboardInterrupt:
            logger.info("\nSession terminated by user. Goodbye!")

        except Exception as e:
            logger.error(f"\nError in main loop: {str(e)}")

        finally:
            # Clean up
            error_monitoring_task.cancel()
            try:
                await error_monitoring_task
            except asyncio.CancelledError:
                pass

def prewarm(proc: JobProcess):
    """
    Pre-warms a default VAD instance and creates a cache for different VAD configurations.
    This allows the worker to be ready for the most common case and dynamically load
    other configurations as needed without restarting.
    """
    # Create a cache to store VAD instances with different configurations
    proc.userdata["vad_cache"] = {}

    # Define the default VAD configuration
    default_config ={
        "min_speech_duration": 0.05,
        "max_buffered_speech": 60.0,
        "activation_threshold": 0.5,
        "min_silence_duration": 0.7,
    } 

    # Create a hashable key for the default configuration
    default_key = frozenset(default_config.items())

    # Load and cache the VAD instance with the default configuration
    logger.info(f"Pre-warming default VAD with config: {default_config}")
    proc.userdata["vad_cache"][default_key] = silero.VAD.load(
        force_cpu=False,
        sample_rate=16000,
        **default_config
    )

# Updated entrypoint function
async def entrypoint(ctx: agents.JobContext):
    """Enhanced entrypoint with improved error handling and proper shutdown"""
    try:
        logger.info("=" * 70)
        logger.info(f"🎯 Agent entrypoint CALLED for room: {ctx.room.name}")

        # Define default models and instructions
        #--------------------------------------------------------------
        # These defaults will be overridden by values from Redis if available (set in main.py)
        openai_model = "gpt-4.1-nano"
        stt_model = "nova-3"
        tts_model = "f786b574-daa5-4673-aa0c-cbe3e8534c02"  # Default TTS model (matches main.py default, can be overridden via Redis)
        instructions = None  # Default to None, letting VoiceAssistant use its internal default
        vad_config = {}

        # Try to extract session_id from room name
        session_id = None
        if ctx.room.name and ctx.room.name.startswith("voice-"):
            session_id = ctx.room.name[len("voice-"):]

        if session_id:
            redis_client = await get_redis_client()
            if redis_client:
                try:
                    config_key = f"voice_config:{session_id}"
                    config_data = await redis_client.get(config_key)
                    if config_data:
                        config = json.loads(config_data)
                        logger.info(f"Found voice config in Redis for session {session_id}: {config}")
                        
                        # Override defaults with values from Redis if they are not None/empty
                        openai_model = config.get("openai_model") or openai_model
                        stt_model = config.get("stt_model") or stt_model
                        tts_model = config.get("tts_model") or tts_model
                        instructions = config.get("instructions") or instructions
                        vad_config = config.get("vad_config") or vad_config
                    else:
                        logger.info(f"No voice config found in Redis for key '{config_key}'. Using default models.")
                except Exception as e:
                    logger.error(f"Error fetching/parsing voice config from Redis: {e}. Using default models.")
                finally:
                    await redis_client.close()
        else:
            logger.warning("Could not determine session_id from room name. Using default models.")

        logger.info("Initializing VoiceAssistant with the following config:")
        logger.info(f"  - OpenAI LLM Model: {openai_model}")
        logger.info(f"  - STT Model: {stt_model}")
        logger.info(f"  - TTS Model: {tts_model}")
        logger.info(f"  - VAD Config: {vad_config}")
        logger.info(f"  - Instructions: {'Custom' if instructions else 'Default'}")

        assistant = VoiceAssistant(
            instructions=instructions,
            openai_model=openai_model,
            stt_model=stt_model,
            tts_model=tts_model,
            vad_config=vad_config,
            job_ctx=ctx,
        )
        logger.info("VoiceAssistant created, starting run()...")
        await assistant.run(ctx)
        logger.info("✅ VoiceAssistant run() completed")
    except Exception as e:
        logger.critical(f"❌ Critical error in entrypoint: {str(e)}")
        import traceback
        traceback.print_exc()
        raise  # Re-raise to let LiveKit know the job failed
    finally:
        # This block ensures that shutdown is always called, fixing the warning.
        logger.info("Shutting down agent job context.")
        ctx.shutdown()
        logger.info("Agent job context shut down successfully.")


if __name__ == "__main__":
    # This block is now run directly by the subprocess call from main.py
    # (which no longer passes the "console" argument).
    import sys

    print("=" * 70, file=sys.stderr)
    print("🚀 LiveKit Agent Worker Starting...", file=sys.stderr)
    print(f"Python: {sys.executable}", file=sys.stderr)
    print(f"LIVEKIT_URL: {os.getenv('LIVEKIT_URL', 'NOT SET')}", file=sys.stderr)
    print("=" * 70, file=sys.stderr)

    print("Starting LiveKit agent worker in non-interactive mode...", file=sys.stderr)
    print("Connecting to LiveKit server...", file=sys.stderr)

    # --- ADD THESE TWO LINES ---
    # We must manually add the "start" command to sys.argv
    # so the LiveKit CLI parser knows to run in production mode.
    if len(sys.argv) == 1:
        sys.argv.append("start")
    # ---------------------------

    sys.stderr.flush()

    # This will now correctly execute the "start" command
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))