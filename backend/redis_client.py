import redis.asyncio as redis
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")

redis_client = None
redis_client_binary = None
_initialization_lock = None

def _get_lock():
    """Get or create the async lock"""
    global _initialization_lock
    if _initialization_lock is None:
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                _initialization_lock = asyncio.Lock()
            else:
                _initialization_lock = asyncio.Lock()
        except RuntimeError:
            _initialization_lock = asyncio.Lock()
    return _initialization_lock

async def _initialize_redis_client():
    """Initialize the async Redis client"""
    global redis_client
    lock = _get_lock()
    async with lock:
        if redis_client is None:
            if REDIS_URL:
                try:
                    redis_client = await redis.from_url(REDIS_URL, decode_responses=True)
                    await redis_client.ping()
                    print("[Redis] Successfully connected to Redis from URL (async).")
                except redis.exceptions.ConnectionError as e:
                    print(f"[Redis] Could not connect to Redis using URL: {e}")
                    redis_client = None
                except Exception as e:
                    print(f"[Redis] An unexpected error occurred when connecting with URL: {e}")
                    redis_client = None
            else:
                print("[Redis] REDIS_URL not found. Falling back to local Redis instance on localhost:6379.")
                try:
                    redis_client = redis.Redis(
                        host=os.getenv("REDIS_HOST", "localhost"), 
                        port=int(os.getenv("REDIS_PORT", 6379)), 
                        db=0,
                        decode_responses=True
                    )
                    await redis_client.ping()
                    print("[Redis] Successfully connected to local Redis (async).")
                except redis.exceptions.ConnectionError as e:
                    print(f"[Redis] Could not connect to local Redis: {e}")
                    redis_client = None
                except Exception as e:
                    print(f"[Redis] An unexpected error occurred with local Redis connection: {e}")
                    redis_client = None
    return redis_client

async def _initialize_redis_client_binary():
    """Initialize the async Redis client for binary data"""
    global redis_client_binary
    lock = _get_lock()
    async with lock:
        if redis_client_binary is None:
            if REDIS_URL:
                try:
                    redis_client_binary = await redis.from_url(REDIS_URL, decode_responses=False)
                    await redis_client_binary.ping()
                except Exception:
                    redis_client_binary = None
            else:
                try:
                    redis_client_binary = redis.Redis(
                        host=os.getenv("REDIS_HOST", "localhost"), 
                        port=int(os.getenv("REDIS_PORT", 6379)), 
                        db=0,
                        decode_responses=False
                    )
                    await redis_client_binary.ping()
                except Exception:
                    redis_client_binary = None
    return redis_client_binary

async def ensure_redis_client():
    """Ensure Redis client is initialized"""
    if redis_client is None:
        await _initialize_redis_client()
    return redis_client

async def ensure_redis_client_binary():
    """Ensure Redis binary client is initialized"""
    if redis_client_binary is None:
        await _initialize_redis_client_binary()
    return redis_client_binary
