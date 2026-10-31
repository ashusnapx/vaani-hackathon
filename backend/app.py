"""Doorman backend: the tools Vaani calls mid-call, and the post-call webhook."""

import hmac
import html
import json
import os
import re

import httpx
from fastapi import FastAPI, Header, HTTPException, Query, Request
from pydantic import BaseModel

app = FastAPI(title="Doorman")

DOORMAN_KEY = os.getenv("DOORMAN_KEY", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
# ntfy topics are public to whoever knows the name, so it must be random.
NTFY_TOPIC = os.getenv("NTFY_TOPIC", "")
ELDER_NAME = os.getenv("ELDER_NAME", "Kamla ji")
# Real numbers live in env, never in this public repo.
# [{"name": "Rahul", "relation": "grandson", "phone": "+9198..."}]
TRUSTED_CONTACTS = json.loads(os.getenv("TRUSTED_CONTACTS", "[]"))
REPORTED_NUMBERS = set(json.loads(os.getenv("REPORTED_NUMBERS", "[]")))
FAMILY_CODE_WORD = os.getenv("FAMILY_CODE_WORD", "")


def authorised(key: str | None) -> None:
    if not DOORMAN_KEY or not key or not hmac.compare_digest(key, DOORMAN_KEY):
        raise HTTPException(status_code=401, detail="bad key")


def digits(phone: str | None) -> str:
    """Last 10 digits, so +91 98xxx, 098xxx and 98xxx compare equal."""
    return re.sub(r"\D", "", phone or "")[-10:]


def same_word(a: str | None, b: str) -> bool:
    norm = lambda s: re.sub(r"[^a-z0-9ऀ-ॿ]", "", (s or "").lower())
    return bool(b) and hmac.compare_digest(norm(a).encode(), norm(b).encode())


def telegram(text: str, urgent: bool = False) -> bool:
    """Alert the family: ntfy push if a topic is set, else Telegram."""
    plain = re.sub(r"</?b>", "", html.unescape(text))
    try:
        if NTFY_TOPIC:
            r = httpx.post(
                f"https://ntfy.sh/{NTFY_TOPIC}",
                content=plain.encode(),
                headers={"Priority": "urgent" if urgent else "default",
                         "Tags": "warning" if urgent else "telephone_receiver"},
                timeout=5,
            )
            return r.is_success
        if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
            r = httpx.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "HTML"},
                timeout=5,
            )
            return r.status_code == 200
    except httpx.HTTPError as e:
        print("alert failed:", e)
        return False
    print("no alert channel configured:", plain)
    return False


def esc(v) -> str:
    # Callers' words go into the family's chat; never let them inject markup.
    return html.escape(str(v)) if v not in (None, "") else "—"


class CheckCaller(BaseModel):
    claimed_name: str = ""
    claimed_relation: str = ""
    phone_number: str = ""
    code_word: str = ""


@app.post("/tools/check-caller")
def check_caller(body: CheckCaller, x_doorman_key: str | None = Header(None)):
    authorised(x_doorman_key)
    num = digits(body.phone_number)

    if num and num in {digits(n) for n in REPORTED_NUMBERS}:
        return {
            "status": "reported_scam",
            "next_step": "This number was reported as a scam. Do not share anything. "
            "Politely end the call and alert the family.",
        }

    by_number = next((c for c in TRUSTED_CONTACTS if num and digits(c["phone"]) == num), None)
    if by_number:
        return {
            "status": "trusted",
            "name": by_number["name"],
            "relation": by_number["relation"],
            "next_step": f"Known {by_number['relation']}. Greet them warmly and offer to "
            f"connect them to {ELDER_NAME} or take a message.",
        }

    claimed = f"{body.claimed_name} {body.claimed_relation}".lower()
    family = next(
        (c for c in TRUSTED_CONTACTS
         if c["name"].lower() in claimed or c["relation"].lower() in claimed),
        None,
    )
    if family:
        if body.code_word and same_word(body.code_word, FAMILY_CODE_WORD):
            return {
                "status": "family_verified",
                "name": family["name"],
                "next_step": "Code word correct. Treat as family: help them, take their "
                "message or connect them.",
            }
        if body.code_word:
            return {
                "status": "family_code_wrong",
                "next_step": "Code word is wrong. Voices can be cloned, so treat this as a "
                "likely impersonation scam. Do not share anything or promise money. Say you "
                f"will call {family['name']} back on the saved number, and alert the family.",
            }
        return {
            "status": "family_unverified",
            "name": family["name"],
            "next_step": f"The caller claims to be {family['name']} ({family['relation']}) "
            "from a number we do not know. Ask for the family code word before anything "
            "else. Never say what the code word is or hint at it.",
        }

    return {
        "status": "unknown",
        "next_step": "Unknown caller. Find out who they are and why they called. Never "
        "share personal, bank or OTP details. Take a message if genuine; alert the family "
        "if they push for money, OTP, apps or secrecy.",
    }


class Alert(BaseModel):
    risk: str = "high"
    scam_type: str = ""
    caller_claims: str = ""
    demand: str = ""
    amount: str = ""
    payment_details: str = ""
    caller_number: str = ""
    summary: str = ""


@app.post("/tools/alert-family")
def alert_family(body: Alert, x_doorman_key: str | None = Header(None)):
    authorised(x_doorman_key)
    sent = telegram(
        f"⚠️ <b>Scam call to {esc(ELDER_NAME)} — {esc(body.risk).upper()} risk</b>\n"
        f"<b>Type:</b> {esc(body.scam_type)}\n"
        f"<b>Caller claimed:</b> {esc(body.caller_claims)}\n"
        f"<b>Wanted:</b> {esc(body.demand)} {esc(body.amount)}\n"
        f"<b>Payment details given:</b> {esc(body.payment_details)}\n"
        f"<b>Caller number:</b> {esc(body.caller_number)}\n\n"
        f"{esc(body.summary)}\n\n"
        "Doorman is keeping them on the line and sharing nothing. "
        "Report: 1930 · cybercrime.gov.in",
        urgent=True,
    )
    return {"sent": sent, "next_step": "Family alerted. Keep refusing calmly; do not "
            "mention the alert to the caller."}


class Message(BaseModel):
    caller_name: str = ""
    organisation: str = ""
    purpose: str = ""
    callback_number: str = ""
    urgency: str = "normal"


@app.post("/tools/take-message")
def take_message(body: Message, x_doorman_key: str | None = Header(None)):
    authorised(x_doorman_key)
    sent = telegram(
        f"📞 <b>Message for {esc(ELDER_NAME)}</b> ({esc(body.urgency)})\n"
        f"<b>From:</b> {esc(body.caller_name)}, {esc(body.organisation)}\n"
        f"<b>About:</b> {esc(body.purpose)}\n"
        f"<b>Call back:</b> {esc(body.callback_number)}"
    )
    return {"saved": True, "sent": sent, "next_step": "Message passed to the family. "
            "Read back the key details to the caller and close politely."}


@app.post("/webhooks/vaani")
async def vaani_webhook(
    request: Request,
    key: str | None = Query(None),
    x_doorman_key: str | None = Header(None),
):
    authorised(key or x_doorman_key)
    event = await request.json()
    kind = event.get("event") or event.get("event_type") or event.get("type")
    if kind != "call_postprocessing":
        return {"ok": True, "ignored": kind}

    data = event.get("data") or event
    entities = data.get("entities") or {}
    lines = "\n".join(f"<b>{esc(k)}:</b> {esc(v)}" for k, v in entities.items()) or "—"
    telegram(
        f"🧾 <b>Call report</b> · {esc(data.get('call_id') or data.get('room_name'))}\n"
        f"{esc(data.get('summary'))}\n\n{lines}\n"
        f"<b>Outcome:</b> {esc(data.get('dispositions'))}"
    )
    return {"ok": True}


@app.get("/")
def health():
    return {"ok": True, "alerts": bool(NTFY_TOPIC or (TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)),
            "contacts": len(TRUSTED_CONTACTS), "code_word": bool(FAMILY_CODE_WORD)}
