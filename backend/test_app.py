import json
import os

os.environ.update(
    DOORMAN_KEY="k",
    VAANI_API_KEY="",
    HANGUP_GRACE="3600",  # timers never fire during tests
    WAVE_TIMEOUT="3600",
    VENDORS=json.dumps([
        {"name": "A", "phone": "+91 90000 00001", "services": ["ac"]},
        {"name": "B", "phone": "+91 90000 00002", "services": ["ac"]},
        {"name": "C", "phone": "+91 90000 00003"},
    ]),
)

from fastapi.testclient import TestClient  # noqa: E402

import app as m  # noqa: E402

m.VAANI_API_KEY = ""
c = TestClient(m.app)
H = {"X-Doorman-Key": "k"}


def task(budget="₹800", service="AC repair"):
    return c.post("/tools/create-task", json={"name": "Priya", "phone": "98765 43210", "service": service,
                                             "area": "Koramangala", "budget": budget}, headers=H).json()["task_id"]


def quote(t, vendor, price, agreed=None):
    return c.post("/tools/record-quote", json={"task_id": t, "vendor": vendor, "price": price, "agreed": agreed}, headers=H)


def test_rejects_without_key():
    assert c.post("/tools/create-task", json={}).status_code == 401


def test_budget_parsed_from_speech():
    assert m.TASKS[task("800 rupees")]["budget"] == 800
    assert m.TASKS[task("₹1,200")]["budget"] == 1200


def test_vendors_filtered_by_service_with_fallback():
    assert [v["name"] for v in m.vendors_for("AC not cooling")] == ["A", "B", "C"]
    assert [v["name"] for v in m.vendors_for("plumber")] == ["C"]


def test_agreed_is_decided_by_price_not_by_the_agent():
    t = task()
    quote(t, "A", "900", agreed=True)
    assert m.TASKS[t]["quotes"]["A"]["agreed"] is False


def test_cheapest_agreed_wins_and_ties_go_to_first():
    t = task()
    quote(t, "A", 800)
    quote(t, "B", 800)
    d = m.decide(m.TASKS[t])
    assert d["mode"] == "agreed" and d["best"]["vendor"] == "A" and d["backup"]["vendor"] == "B"
    quote(t, "B", 750)
    assert m.decide(m.TASKS[t])["best"]["vendor"] == "B"


def test_nobody_agrees_offers_closest_then_nothing():
    t = task()
    quote(t, "A", 1200)
    quote(t, "B", 0)
    d = m.decide(m.TASKS[t])
    assert d["mode"] == "over_budget" and d["best"]["price"] == 1200
    t2 = task()
    quote(t2, "A", 0)
    assert m.decide(m.TASKS[t2])["mode"] == "none"


def test_booking_only_a_real_option_and_only_once():
    t = task()
    assert not c.post("/tools/book-vendor", json={"task_id": t, "vendor": "A"}, headers=H).json()["ok"]
    quote(t, "A", 700)
    r = c.post("/tools/book-vendor", json={"task_id": t, "vendor": "A"}, headers=H).json()
    assert r["ok"] and r["vendor_number"] == "9 0 0 0 0 0 0 0 0 1"
    again = c.post("/tools/book-vendor", json={"task_id": t, "vendor": "B"}, headers=H).json()
    assert "Already booked with A" in again["next_step"]


def test_status_found_by_phone_in_any_format():
    task()
    r = c.post("/tools/task-status", json={"phone": "+91-98765-43210"}, headers=H).json()
    assert r["status"] == "found"
    assert c.post("/tools/task-status", json={"phone": "11111"}, headers=H).json()["status"] == "none"
