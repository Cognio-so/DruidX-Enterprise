import redis
import os
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")

if REDIS_URL:
    try:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        redis_client.ping()
        print("[Redis] Successfully connected to Redis from URL.")
    except redis.exceptions.ConnectionError as e:
        print(f"[Redis] Could not connect to Redis using URL: {e}")
        redis_client = None
    except Exception as e:
        print(f"[Redis] An unexpected error occurred when connecting with URL: {e}")
        redis_client = None
else:
    print("[Redis] REDIS_URL not found. Falling back to local Redis instance on localhost:6379.")
    try:
        redis_client = redis.Redis(host=os.getenv("REDIS_HOST", "localhost"), 
                                   port=int(os.getenv("REDIS_PORT", 6379)), 
                                   db=0,
                                   decode_responses=True) 
        redis_client.ping()
        print("[Redis] Successfully connected to local Redis.")
    except redis.exceptions.ConnectionError as e:
        print(f"[Redis] Could not connect to local Redis: {e}")
        redis_client = None
    except Exception as e:
        print(f"[Redis] An unexpected error occurred with local Redis connection: {e}")
        redis_client = None
if REDIS_URL:
    try:
        redis_client_binary = redis.from_url(REDIS_URL, decode_responses=False)
        redis_client_binary.ping()
    except Exception:
        redis_client_binary = None
else:
    try:
        redis_client_binary = redis.Redis(host=os.getenv("REDIS_HOST", "localhost"), 
                                          port=int(os.getenv("REDIS_PORT", 6379)), 
                                          db=0,
                                          decode_responses=False)
        redis_client_binary.ping()
    except Exception:
        redis_client_binary = None
