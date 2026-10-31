"""Create the Sorted agent on Vaani, or push config changes to it.

uv run --with httpx agent/push.py
"""

import json
import os
import pathlib
import sys

import httpx

HERE = pathlib.Path(__file__).parent
API = "https://api.vaanivoice.ai/api"
NUMBER = "+918064279097"


def env(key: str) -> str:
    for line in (HERE.parent / ".env").read_text().splitlines():
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip("\"'")
    return os.environ[key]


H = {"X-API-Key": env("VAANI_API_KEY")}

persona = {
    "identity": {
        "system_prompt": (HERE / "prompt.md").read_text(),
        "greeting_message": {
            "agent_message": "Namaste, Sorted mein aapka swagat hai! Bataiye, kaunsa kaam karwana hai?",
            "agent_speech_delay": 0,
            "interruptible": True,
        },
    },
    "senses_capabilities": json.loads((HERE / "senses.json").read_text()),
    # A returning caller is met by an agent that remembers their last requests.
    "memories": {"use_previous_call_contexts": True, "max_history_calls": 5},
}

# Answers callers ask for most, without a retrieval round trip.
training = {
    "know_how": {
        "faq": {
            "How does Sorted work?": "Tell us the job, your address, when and your budget. We call several local service people, bargain for you, and call you back with whoever agrees.",
            "How long does it take?": "Usually a few minutes, at most about thirty. We call you back either way.",
            "Do I pay Sorted?": "No. You pay the service person directly after the work. Never share an OTP or bank details with anyone on a call.",
            "Is my number shared?": "Only with the one service person you choose, after you confirm.",
            "What if nobody agrees to my price?": "We tell you the closest offer and you decide. You can also raise the budget or try another time.",
        }
    }
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
        "call_settings": {"max_call_duration": 10, "max_duration_enabled": True,
                          "enable_voicemail_detection": True, "action": "hang_up"},
    },
}

analysis = {
    "evaluations": {
        "dispositions": {
            "enabled": True,
            "prompt_based": [{
                "name": "outcome",
                "type": "string",
                "prompt": "Which one tag best describes how this call ended?",
                "list_of_tags": {
                    "REQUEST_TAKEN": "a customer's job request was taken",
                    "QUOTE_GIVEN": "a service person gave a price",
                    "BOOKED": "the customer chose an option and it was booked",
                    "DECLINED": "the customer or service person said no",
                    "STATUS_CHECK": "a caller asked about an existing request",
                    "EMERGENCY_REDIRECTED": "the caller was told to call 112",
                    "UNCLEAR": "none of the above",
                },
            }],
        },
        "conversation_evaluation": {
            "enabled": True,
            "prompt": "Score 1-10: did the assistant collect the request (or price) correctly, bargain "
            "politely, protect the customer's number and address, and close cleanly? Explain briefly.",
        },
    },
    "extraction": {
        "data_collection": {
            "enabled": True,
            "data_points": [
                {"name": "caller_role", "prompt": "Was this call with a customer or a service person?", "values": ["customer", "service_person", "unclear"], "nullable": True},
                {"name": "service", "prompt": "The service or job discussed.", "nullable": True},
                {"name": "area", "prompt": "Locality of the job.", "nullable": True},
                {"name": "when", "prompt": "When the job is needed or when the service person can come.", "nullable": True},
                {"name": "budget", "prompt": "Customer's budget in rupees.", "nullable": True},
                {"name": "price_quoted", "prompt": "Final price a service person quoted, in rupees.", "nullable": True},
                {"name": "chosen_vendor", "prompt": "Service person the customer chose, if any.", "nullable": True},
            ],
        }
    },
}

deployment = {"deployment": {"phone": {"call_type": {"Inbound": NUMBER, "Outbound": [NUMBER]}}}}

id_file = HERE / "agent_id.txt"
if id_file.exists():
    agent_id = id_file.read_text().strip()
else:
    r = httpx.post(f"{API}/create-agent", headers=H, timeout=60, json={"agent_display_name": "Sorted", "config": {}})
    r.raise_for_status()
    agent_id = r.json()["agent_id"]
    id_file.write_text(agent_id + "\n")
    print("created", agent_id)

for section, body in [("persona", persona), ("training", training), ("experience", experience),
                      ("analysis", analysis), ("deployment", deployment)]:
    r = httpx.patch(f"{API}/agent/{agent_id}/{section}", headers=H, json=body, timeout=60)
    print(section, r.status_code, "" if r.is_success else r.text[:400])
    if not r.is_success:
        sys.exit(1)
