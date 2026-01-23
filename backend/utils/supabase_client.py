import os
from supabase import create_client, Client


def _get_supabase_url_and_key() -> tuple[str, str]:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY required")
    return url, key


def get_supabase_client() -> Client:
    """Get Supabase client. Use SERVICE_ROLE_KEY for server ops."""
    url, key = _get_supabase_url_and_key()
    return create_client(url, key)