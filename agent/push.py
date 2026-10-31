"""Create the Doorman agent on Vaani, or push config changes to it.

uv run --with httpx agent/push.py
"""

import json
import os
import pathlib
import sys

import httpx

HERE = pathlib.Path(__file__).parent
API = "https://api.vaanivoice.ai/api"
ELDER = "Kamla ji"


def env(key: str) -> str:
    for line in (HERE.parent / ".env").read_text().splitlines():
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip("\"'")
    return os.environ[key]


H = {"X-API-Key": env("VAANI_API_KEY")}

persona = {
    "identity": {
        "system_prompt": (HERE / "prompt.md").read_text().replace("{elder_name}", ELDER),
        "greeting_message": {
            "agent_message": f"Namaste! Aap {ELDER} ke phone par hain, main unka call assistant bol raha hoon. Aap kaun bol rahe hain?",
            "agent_speech_delay": 0,
            "interruptible": True,
        },
    },
    "senses_capabilities": json.loads((HERE / "senses.json").read_text()),
}

experience = {
    "conversational_experience": {
        "bg_noise": {"enabled": False},
        "eagerness_to_speak": "balanced",
        "filler_words": {"filler_words_frequency": 0, "filler_words_list": []},
    },
    "settings": {
        "idle_conversation_settings": {
            "pulse_check": True,
            "end_conversation_on_idle": True,
            "idle_call_warning_timeout": 12,
            "idle_call_hangup_timeout": 25,
            "idle_call_warning_message": "Hello, kya aap line par hain?",
            "idle_call_hangup_message": "Lagta hai line kat gayi. Main call band kar raha hoon, namaste.",
        },
        "end_call": {"enabled": True, "end_call_phrase": "Dhanyavaad, namaste."},
        "call_settings": {"max_call_duration": 10, "max_duration_enabled": True},
    },
}

TAGS = {
    "SCAM_BLOCKED": "caller tried to get money, OTP, details or an app, and Doorman refused",
    "MESSAGE_TAKEN": "a genuine caller left a message",
    "FAMILY_VERIFIED": "a family member was verified by number or code word",
    "IMPERSONATION_SUSPECTED": "someone claimed to be family but could not verify",
    "ELDER_ADVISED": "the elder called for help and was guided",
    "UNCLEAR": "none of the above",
}

analysis = {
    "evaluations": {
        "dispositions": {
            "enabled": True,
            "prompt_based": [{
                "name": "outcome",
                "type": "string",
                "prompt": "Which one tag best describes how this call ended?",
                "list_of_tags": TAGS,
            }],
        },
        "conversation_evaluation": {
            "enabled": True,
            "prompt": "Score 1-10: did the assistant protect the elder (shared nothing sensitive, "
            "refused money/OTP/apps), stay calm and natural, and close the call cleanly? Explain briefly.",
        },
    },
    "extraction": {
        "data_collection": {
            "enabled": True,
            "data_points": [
                {"name": "caller_type", "prompt": "Who called?", "values": ["scammer", "genuine", "family", "elder", "unclear"], "nullable": True},
                {"name": "claimed_identity", "prompt": "Who did the caller say they were, with any badge, case or employee number?", "nullable": True},
                {"name": "organisation", "prompt": "Organisation the caller claimed to represent.", "nullable": True},
                {"name": "scam_type", "prompt": "Type of scam if any, e.g. digital arrest, KYC, courier, relative emergency, lottery, electricity.", "nullable": True},
                {"name": "demand", "prompt": "What did the caller want: money, OTP, details, app install, video call, nothing?", "nullable": True},
                {"name": "amount", "prompt": "Any amount of money mentioned, in rupees.", "nullable": True},
                {"name": "payment_details", "prompt": "Any UPI ID, account number, link or app the caller gave.", "nullable": True},
                {"name": "callback_number", "prompt": "Callback number the caller gave.", "nullable": True},
                {"name": "risk", "prompt": "Risk to the elder.", "values": ["low", "medium", "high"], "nullable": True},
                {"name": "message_for_family", "prompt": "One sentence the family should read.", "nullable": True},
            ],
        }
    },
}

id_file = HERE / "agent_id.txt"
if id_file.exists():
    agent_id = id_file.read_text().strip()
else:
    r = httpx.post(f"{API}/create-agent", headers=H, timeout=60,
                   json={"agent_display_name": "Doorman", "config": {}})
    r.raise_for_status()
    agent_id = r.json()["agent_id"]
    id_file.write_text(agent_id + "\n")
    print("created", agent_id)

for section, body in [("persona", persona), ("experience", experience), ("analysis", analysis)]:
    r = httpx.patch(f"{API}/agent/{agent_id}/{section}", headers=H, json=body, timeout=60)
    print(section, r.status_code, "" if r.is_success else r.text[:400])
    if not r.is_success:
        sys.exit(1)
