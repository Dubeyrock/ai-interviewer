from __future__ import annotations

import json
from typing import Any

import httpx

from app.core.config import settings


class GroqService:
    def __init__(self) -> None:
        self.api_key = settings.groq_api_key
        self.model = settings.groq_model
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"

    def available(self) -> bool:
        return bool(self.api_key)

    def chat(self, messages: list[dict[str, str]], temperature: float = 0.3, json_mode: bool = False) -> str:
        if not self.api_key:
            raise RuntimeError("GROQ_API_KEY is missing")

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        with httpx.Client(timeout=60.0) as client:
            response = client.post(self.base_url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
        return data["choices"][0]["message"]["content"]

    @staticmethod
    def safe_json(text: str) -> dict[str, Any]:
        try:
            return json.loads(text)
        except Exception:
            return {}


groq_service = GroqService()
