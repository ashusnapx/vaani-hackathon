"""Sorted backend: the tools Vaani calls mid-call, the vendor-calling engine, and the live feed."""

import asyncio
import hmac
import json
import os
import re
import threading
import time

import httpx
from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

app = FastAPI(title="Sorted")

TOOL_KEY = os.getenv("DOORMAN_KEY", "")
NTFY_TOPIC = os.getenv("NTFY_TOPIC", "")
SORTED_NUMBER = os.getenv("DOORMAN_NUMBER", "+918064279097")
# Vaani allows 2 calls at once on this plan, so each leg waits for the last to hang up.
HANGUP_GRACE = int(os.getenv("HANGUP_GRACE", "12"))
WAVE_TIMEOUT = int(os.getenv("WAVE_TIMEOUT", "150"))
# [{"name": "Sharma AC Service", "phone": "+9198...", "services": ["ac"]}]; "*" or no list = any job.
# Real numbers stay in env, never in this public repo.
VENDORS = json.loads(os.getenv("VENDORS", "[]"))


def _root_env(key: str) -> str:
    """The Vaani key lives once, in the repo-root .env."""
    path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(path):
        for line in open(path).read().splitlines():
            if line.startswith(key + "="):
                return line.split("=", 1)[1].strip().strip("\"'")
    return ""


VAANI_API_KEY = os.getenv("VAANI_API_KEY") or _root_env("VAANI_API_KEY")
VAANI = "https://api.vaanivoice.ai/api"
AGENT_ID_FILE = os.path.join(os.path.dirname(__file__), "..", "agent", "agent_id.txt")
AGENT_ID = open(AGENT_ID_FILE).read().strip() if os.path.exists(AGENT_ID_FILE) else ""
PROMPT_FILE = os.path.join(os.path.dirname(__file__), "..", "agent", "prompt.md")
HERE_PROMPT = open(PROMPT_FILE).read() if os.path.exists(PROMPT_FILE) else ""

# shortcut: state lives in memory and vanishes on restart, fine for one demo day
EVENTS: list[dict] = []
TASKS: dict[str, dict] = {}
CALLS: dict[str, tuple[str, str]] = {}  # vendor call_id -> (task_id, vendor)
LOCK = threading.Lock()


def publish(kind: str, **data) -> None:
    EVENTS.append({"id": len(EVENTS) + 1, "type": kind, "at": time.time(), **data})


def authorised(key: str | None) -> None:
    if not TOOL_KEY or not key or not hmac.compare_digest(key, TOOL_KEY):
        raise HTTPException(status_code=401, detail="bad key")


def digits(phone: str | None) -> str:
    """Last 10 digits, so +91 98xxx, 098xxx and 98xxx compare equal."""
    return re.sub(r"\D", "", phone or "")[-10:]


def spoken(phone: str) -> str:
    return " ".join(digits(phone))


def rupees(v) -> int:
    m = re.search(r"\d[\d,]*", str(v or ""))
    return int(m.group().replace(",", "")) if m else 0


def notify(text: str) -> None:
    if not NTFY_TOPIC:
        return
    try:
        httpx.post(f"https://ntfy.sh/{NTFY_TOPIC}", content=text.encode(), timeout=5)
    except httpx.HTTPError as e:
        print("notify failed:", e)


def later(seconds: float, fn, *args) -> None:
    threading.Timer(seconds, fn, args).start()


def dispatch(kind: str, to_name: str, to_phone: str, prompt: str, greeting: str, tag: dict) -> str | None:
    """Start an outbound call on the same Vaani agent, wearing a different persona for this call."""
    if not (to_phone and VAANI_API_KEY and AGENT_ID):
        publish(kind, status="skipped", to=to_name, reason="phone or Vaani key not set", **tag)
        return None
    body = {
        "agent_id": AGENT_ID, "medium": "telephony", "name": to_name,
        "contact_number": to_phone, "outbound_number": SORTED_NUMBER,
        "dnd_check_skipped": True,  # every number dialled here asked to be called
        "metadata": {"kind": kind, **{k: str(v) for k, v in tag.items()}},
        "modify_agent": {"persona": {"identity": {
            "system_prompt": prompt,
            "greeting_message": {"agent_message": greeting, "agent_speech_delay": 0, "interruptible": True},
        }}},
    }
    try:
        r = httpx.post(f"{VAANI}/trigger-call/", headers={"X-API-Key": VAANI_API_KEY}, json=body, timeout=30)
        out = (r.json() or {}).get("output") or {}
        publish(kind, status="dialing" if r.is_success else "failed", to=to_name,
                call_id=out.get("call_id"), live_captions_url=out.get("live_captions_url"),
                error=None if r.is_success else r.text[:200], **tag)
        return out.get("call_id") if r.is_success else None
    except httpx.HTTPError as e:
        publish(kind, status="failed", to=to_name, error=str(e), **tag)
        return None


# ---- the engine: ring vendors in waves, bargain, decide, call back, book ----

def vendors_for(service: str) -> list[dict]:
    s = service.lower()
    match = [v for v in VENDORS if not v.get("services") or "*" in v["services"]
             or any(k.lower() in s for k in v["services"])]
    return match or VENDORS


def ring_next(task_id: str) -> None:
    with LOCK:
        t = TASKS[task_id]
        wave = t["pending"][:2]
        t["pending"] = t["pending"][2:]
        t["wave"] += 1
        t["in_wave"] = [v["name"] for v in wave]
        n = t["wave"]
    if not wave:
        call_back(task_id)
        return
    for v in wave:
        prompt = (
            f"You are Sorted, calling {v['name']} about a job for a customer. Job: {t['service']}. "
            f"Detail: {t['details']}. Locality: {t['area']}. Needed: {t['when']}. The customer's "
            f"budget is {t['budget']} rupees. Speak polite, brisk Hinglish, one or two short "
            "sentences at a time. Ask whether they do this work and can come at that time, then "
            "their total price including any visit charge. If the price is above the budget, say "
            "the customer's budget and ask if they can do it for that. If they still won't, ask "
            "once for their best final price; do not push further. As soon as you have a final "
            f"answer, call `record_quote` with task_id \"{task_id}\", vendor \"{v['name']}\", the "
            "final price as a number, when they can come, agreed true if the final price is within "
            "the budget, and short notes such as where the price started or what is extra. If they "
            "cannot do the job, call `record_quote` with price 0, agreed false, and the reason. Never "
            "share the customer's phone number or full address; say they get it once the customer "
            "confirms. Then say you will confirm shortly, thank them and end the call."
        )
        greeting = (f"Namaste, {v['name']}? Main Sorted se bol raha hoon. {t['area']} mein "
                    f"{t['service']} ka ek kaam hai, do minute baat kar sakte hain?")
        call_id = dispatch("vendor_call", v["name"], v["phone"], prompt, greeting,
                           {"task_id": task_id, "vendor": v["name"]})
        if call_id:
            CALLS[call_id] = (task_id, v["name"])
        else:
            settle(task_id, v["name"], {"price": 0, "agreed": False, "notes": "could not be dialled"})
    later(WAVE_TIMEOUT, close_wave, task_id, n)


def settle(task_id: str, vendor: str, quote: dict) -> None:
    """Record a vendor's final answer; when the whole wave has answered, decide what is next."""
    with LOCK:
        t = TASKS.get(task_id)
        if not t:
            return
        t["quotes"][vendor] = {"vendor": vendor, "at": time.time(), **quote}
        done = all(name in t["quotes"] for name in t["in_wave"])
        n = t["wave"]
    if done:
        later(HANGUP_GRACE, close_wave, task_id, n)


def close_wave(task_id: str, n: int) -> None:
    with LOCK:
        t = TASKS[task_id]
        if t["wave"] != n or t["called_back"]:
            return  # an earlier timer, or already decided
        for name in t["in_wave"]:  # anyone who never answered counts as no answer
            t["quotes"].setdefault(name, {"vendor": name, "price": 0, "agreed": False,
                                          "notes": "no answer", "at": time.time()})
        agreed = any(q["agreed"] for q in t["quotes"].values())
        more = bool(t["pending"])
    if agreed or not more:
        call_back(task_id)
    else:
        publish("wave", task_id=task_id, note="Nobody agreed yet, ringing the next two.")
        ring_next(task_id)


def decide(t: dict) -> dict:
    """Cheapest agreed price wins; ties go to whoever agreed first. Runner-up is the backup."""
    priced = [q for q in t["quotes"].values() if q["price"]]
    agreed = sorted((q for q in priced if q["agreed"]), key=lambda q: (q["price"], q["at"]))
    if agreed:
        return {"mode": "agreed", "best": agreed[0], "backup": agreed[1] if len(agreed) > 1 else None}
    if priced:
        return {"mode": "over_budget", "best": min(priced, key=lambda q: (q["price"], q["at"])), "backup": None}
    return {"mode": "none", "best": None, "backup": None}


def phone_of(vendor: str) -> str:
    return next((v["phone"] for v in VENDORS if v["name"] == vendor), "")


def call_back(task_id: str) -> None:
    with LOCK:
        t = TASKS[task_id]
        if t["called_back"]:
            return
        t["called_back"] = True
    d = decide(t)
    t["decision"] = d
    best, backup = d["best"], d["backup"]
    publish("decision", task_id=task_id, mode=d["mode"],
            best=best and {k: best[k] for k in ("vendor", "price", "eta", "notes")},
            backup=backup and {k: backup[k] for k in ("vendor", "price", "eta", "notes")})

    def offer(q):
        return (f"{q['vendor']}, {q['price']} rupees, can come {q['eta']}"
                f"{', ' + q['notes'] if q.get('notes') else ''}. Their number is {spoken(phone_of(q['vendor']))}.")

    if d["mode"] == "agreed":
        situation = (f"Best option: {offer(best)} "
                     + (f"Backup option: {offer(backup)} " if backup else "")
                     + "Recommend the best option in one sentence and say why (cheaper, or same price but "
                     "agreed first). Ask whether to confirm it.")
    elif d["mode"] == "over_budget":
        situation = (f"Nobody agreed to {t['budget']} rupees. The closest is {offer(best)} That is "
                     f"{best['price'] - t['budget']} rupees over budget. Explain this kindly and ask if "
                     "they want to go ahead with it.")
    else:
        situation = ("No service person could take the job right now. Apologise briefly, suggest a higher "
                     "budget or a different time, and tell them to call Sorted again whenever they like.")
    prompt = (
        f"You are Sorted, calling {t['name']} back about the job they asked for: {t['service']} "
        f"({t['details']}), {t['when']}, budget {t['budget']} rupees. You phoned the service people. "
        f"{situation} If they say yes to an option, call `book_vendor` with task_id \"{task_id}\" and "
        "that vendor's name exactly as written here. Then read the vendor's number again slowly, digit "
        "by digit, so they can note it, and say the vendor will also get a call with their address and "
        "time. If they want neither option, say that is fine and close. Speak simple Hinglish, one or "
        "two short sentences at a time, and never invent an option that is not written here."
    )
    greeting = (f"Namaste {t['name']}, Sorted se bol raha hoon. Aapke {t['service']} ke kaam ke liye "
                "maine service walon se baat kar li hai. Bataun kya hua?")
    dispatch("callback", t["name"], t["phone"], prompt, greeting, {"task_id": task_id})


def confirm_vendor(task_id: str) -> None:
    t = TASKS[task_id]
    q = t["quotes"].get(t["booked"], {})
    prompt = (
        f"You are Sorted, calling {t['booked']} to confirm a booking. Customer: {t['name']}. Job: "
        f"{t['service']} ({t['details']}). Agreed price: {q.get('price')} rupees. Time: {q.get('eta')}. "
        f"Full address: {t['address']}. Customer's number: {spoken(t['phone'])}. Read the address and "
        "the customer's number slowly, confirm price and time in one sentence, ask them to call the "
        "customer before leaving, thank them and end the call."
    )
    greeting = f"Namaste, Sorted se. {t['service']} ka kaam confirm ho gaya hai, address note kar lijiye."
    dispatch("confirm_call", t["booked"], phone_of(t["booked"]), prompt, greeting,
             {"task_id": task_id, "vendor": t["booked"]})


# ---- tools Vaani calls mid-call ----

class Task(BaseModel):
    name: str = ""
    phone: str = ""
    address: str = ""
    area: str = ""
    service: str = ""
    details: str = ""
    when: str = ""
    budget: str | int | float = 0


@app.post("/tools/create-task")
def create_task(body: Task, x_doorman_key: str | None = Header(None)):
    authorised(x_doorman_key)
    task_id = f"t{len(TASKS) + 1}"
    budget = rupees(body.budget)
    TASKS[task_id] = {**body.model_dump(), "budget": budget, "quotes": {}, "wave": 0, "in_wave": [],
                      "pending": list(vendors_for(body.service)), "called_back": False, "booked": None}
    publish("task", task_id=task_id, name=body.name, area=body.area, service=body.service,
            details=body.details, when=body.when, budget=budget,
            vendors=[v["name"] for v in TASKS[task_id]["pending"]])
    later(HANGUP_GRACE, ring_next, task_id)
    return {"task_id": task_id, "next_step": "Tell them you are calling a few service people now and will "
            "call back within about thirty minutes, usually sooner. Then end this call right away."}


class Quote(BaseModel):
    task_id: str
    vendor: str = ""
    price: str | int | float = 0
    eta: str = ""
    agreed: bool | None = None
    notes: str = ""


@app.post("/tools/record-quote")
def record_quote(body: Quote, x_doorman_key: str | None = Header(None)):
    authorised(x_doorman_key)
    t = TASKS.get(body.task_id)
    if not t:
        return {"ok": False, "next_step": "Thank them and end the call."}
    price = rupees(body.price)
    # Trust the number, not the agent's yes/no: agreed means within budget.
    agreed = bool(price) and (not t["budget"] or price <= t["budget"])
    publish("quote", task_id=body.task_id, vendor=body.vendor, price=price, eta=body.eta,
            agreed=agreed, notes=body.notes, budget=t["budget"])
    settle(body.task_id, body.vendor, {"price": price, "eta": body.eta, "agreed": agreed, "notes": body.notes})
    return {"ok": True, "next_step": "Noted. Say you will confirm shortly, thank them and end the call."}


class Booking(BaseModel):
    task_id: str
    vendor: str


@app.post("/tools/book-vendor")
def book_vendor(body: Booking, x_doorman_key: str | None = Header(None)):
    authorised(x_doorman_key)
    t = TASKS.get(body.task_id)
    if t and t["booked"]:
        return {"ok": True, "next_step": f"Already booked with {t['booked']}. Confirm that to them."}
    q = (t or {}).get("quotes", {}).get(body.vendor)
    if not t or not q or not q["price"]:
        return {"ok": False, "next_step": "That option is not available. Read the options again."}
    t["booked"] = body.vendor
    publish("booked", task_id=body.task_id, vendor=body.vendor, price=q["price"], eta=q["eta"],
            name=t["name"])
    notify(f"Sorted: {t['name']}'s {t['service']} booked with {body.vendor}, ₹{q['price']}, {q['eta']}.")
    later(5, confirm_vendor, body.task_id)
    return {"ok": True, "vendor_number": spoken(phone_of(body.vendor)),
            "next_step": "Booked. Read the vendor's number digit by digit and close warmly."}


class Status(BaseModel):
    phone: str = ""
    name: str = ""


@app.post("/tools/task-status")
def task_status(body: Status, x_doorman_key: str | None = Header(None)):
    authorised(x_doorman_key)
    mine = [t for t in TASKS.values()
            if (body.phone and digits(t["phone"]) == digits(body.phone))
            or (body.name and body.name.lower() in t["name"].lower())]
    if not mine:
        return {"status": "none", "next_step": "No request found. Offer to take a new one."}
    t = mine[-1]
    if t["booked"]:
        q = t["quotes"][t["booked"]]
        say = f"Booked with {t['booked']} for {q['price']} rupees, {q['eta']}."
    elif t["called_back"]:
        say = "We have already called back with the options."
    else:
        say = f"We are still calling service people for the {t['service']}; {len(t['quotes'])} have answered so far."
    return {"status": "found", "next_step": say + " Tell them this in one sentence."}


class CallMe(BaseModel):
    name: str = ""
    phone: str


@app.post("/actions/call-me")
def call_me(body: CallMe, key: str | None = Query(None)):
    """Outbound intake: Sorted rings the customer and takes the request on that call."""
    authorised(key)
    if len(digits(body.phone)) != 10:
        raise HTTPException(status_code=422, detail="Enter a 10-digit Indian mobile number")
    phone = "+91" + digits(body.phone)
    name = body.name.strip() or "there"
    prompt = (HERE_PROMPT + f"\n\n# This call\nYou are calling {name} at {phone} because they asked "
              "Sorted to call them. Their number is already known; confirm it instead of asking for it.")
    greeting = (f"Namaste {name}, Sorted se bol raha hoon. Aapne call back maanga tha. "
                "Bataiye, kaunsa kaam karwana hai?")
    publish("intake_call", to=name, phone_tail=digits(phone)[-4:])
    dispatch("intake_call", name, phone, prompt, greeting, {"requested_by": "web"})
    return {"ok": True}


# ---- Vaani webhook, live feed, history ----

@app.post("/webhooks/vaani")
async def vaani_webhook(request: Request, key: str | None = Query(None),
                        x_doorman_key: str | None = Header(None)):
    authorised(key or x_doorman_key)
    event = await request.json()
    kind = event.get("event") or event.get("event_type") or event.get("type")
    data = event.get("data") or event
    call_id = data.get("call_id") or data.get("room_name")
    if kind in ("call_no_answer", "call_rejected", "call_failed") and call_id in CALLS:
        task_id, vendor = CALLS[call_id]
        settle(task_id, vendor, {"price": 0, "agreed": False, "notes": kind.replace("call_", "").replace("_", " ")})
    if kind == "call_postprocessing":
        publish("report", call_id=call_id, summary=data.get("summary"), entities=data.get("entities") or {},
                dispositions=data.get("dispositions"), duration_ms=data.get("call_duration"))
    else:
        publish("call", event=kind, call_id=call_id)
    return {"ok": True}


@app.get("/events")
async def events(key: str | None = Query(None), after: int = 0):
    """SSE feed of everything Sorted does, for the dashboard."""
    authorised(key)

    async def stream():
        sent = max(after, len(EVENTS) - 60)
        while True:
            while sent < len(EVENTS):
                yield f"data: {json.dumps(EVENTS[sent], ensure_ascii=False)}\n\n"
                sent += 1
            yield ": ping\n\n"
            await asyncio.sleep(0.5)

    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@app.get("/calls")
def calls(key: str | None = Query(None)):
    """This agent's past calls from Vaani, newest first, trimmed for the dashboard."""
    authorised(key)
    if not VAANI_API_KEY:
        return []
    r = httpx.get(f"{VAANI}/call-history", headers={"X-API-Key": VAANI_API_KEY},
                  params={"page": 1, "page_size": 100}, timeout=30)
    rows = (r.json() or {}).get("data", []) if r.is_success else []
    keep = ("call_id", "Start_time", "duration_ms", "call_status", "call_type", "from_number",
            "to_number", "call_summary", "call_entity", "call_eval_tag", "post_processing_status")
    return [{k: row.get(k) for k in keep} for row in rows if row.get("agent_id") == AGENT_ID][:20]


@app.get("/recording/{call_id}")
def recording(call_id: str, key: str | None = Query(None)):
    authorised(key)
    if not re.fullmatch(r"[\w.-]+", call_id):
        raise HTTPException(status_code=400, detail="bad call id")
    r = httpx.get(f"{VAANI}/stream/{call_id}", headers={"X-API-Key": VAANI_API_KEY}, timeout=60)
    if not r.is_success:
        raise HTTPException(status_code=r.status_code, detail="no recording yet")
    return Response(r.content, media_type=r.headers.get("content-type", "audio/mpeg"))


@app.post("/demo/{scenario}")
def demo(scenario: str, key: str | None = Query(None)):
    """Replay a whole request as events, so the dashboard can be shown without placing calls."""
    authorised(key)
    tid = f"t{len(TASKS) + 1}"
    TASKS[tid] = {"name": "Priya", "phone": "", "quotes": {}, "called_back": True, "booked": None}
    a, b = "Sharma Cooling", "Cool Care Services"
    publish("task", task_id=tid, name="Priya", area="Koramangala", service="AC repair",
            details="not cooling, makes noise", when="kal subah 10 baje tak", budget=800, vendors=[a, b])
    publish("vendor_call", task_id=tid, vendor=a, to=a, status="dialing")
    publish("vendor_call", task_id=tid, vendor=b, to=b, status="dialing")
    if scenario == "none":
        publish("quote", task_id=tid, vendor=a, price=1200, eta="kal 9 baje", agreed=False, notes="won't go below 1,200", budget=800)
        publish("quote", task_id=tid, vendor=b, price=0, eta="", agreed=False, notes="no answer", budget=800)
        publish("decision", task_id=tid, mode="over_budget", best={"vendor": a, "price": 1200, "eta": "kal 9 baje", "notes": ""}, backup=None)
    else:
        publish("quote", task_id=tid, vendor=a, price=800, eta="kal 9 baje", agreed=True, notes="came down from 1,100", budget=800)
        publish("quote", task_id=tid, vendor=b, price=750, eta="kal 11 baje", agreed=True, notes="gas top-up extra", budget=800)
        publish("decision", task_id=tid, mode="agreed", best={"vendor": b, "price": 750, "eta": "kal 11 baje", "notes": "gas top-up extra"},
                backup={"vendor": a, "price": 800, "eta": "kal 9 baje", "notes": "came down from 1,100"})
        publish("callback", task_id=tid, to="Priya", status="dialing")
        publish("booked", task_id=tid, vendor=b, price=750, eta="kal 11 baje", name="Priya")
    return {"ok": True}


@app.get("/")
def health():
    return {"ok": True, "vendors": len(VENDORS), "agent": bool(AGENT_ID), "vaani": bool(VAANI_API_KEY),
            "tasks": len(TASKS)}
