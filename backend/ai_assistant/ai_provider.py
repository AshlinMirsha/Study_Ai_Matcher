"""
ai_assistant app - AI provider abstraction.

Supports Gemini and OpenAI interchangeably (set AI_PROVIDER in .env).
If no API key is configured, every function falls back to a sensible
rule-based / templated response so the app still works end-to-end
during development without billing anything.
"""
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def _call_gemini(prompt: str) -> str:
    import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(prompt)
    return response.text


def _call_openai(prompt: str) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[{'role': 'user', 'content': prompt}],
    )
    return response.choices[0].message.content


def is_ai_configured() -> bool:
    if settings.AI_PROVIDER == 'gemini':
        return bool(settings.GEMINI_API_KEY)
    return bool(settings.OPENAI_API_KEY)


def generate_text(prompt: str) -> str | None:
    """Returns AI-generated text, or None if no provider is configured or the call fails."""
    if not is_ai_configured():
        return None
    try:
        if settings.AI_PROVIDER == 'gemini':
            return _call_gemini(prompt)
        return _call_openai(prompt)
    except Exception:
        logger.exception('AI provider call failed; falling back to rule-based response.')
        return None


def generate_json(prompt: str) -> dict | list | None:
    """Calls the AI provider expecting a JSON response; parses and returns it, or None on failure."""
    raw = generate_text(prompt + "\n\nRespond ONLY with valid JSON, no markdown formatting, no commentary.")
    if raw is None:
        return None
    cleaned = raw.strip().removeprefix('```json').removeprefix('```').removesuffix('```').strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning('AI returned non-JSON output: %s', raw[:200])
        return None
