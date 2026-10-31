import json
import os

os.environ.update(
    DOORMAN_KEY="k",
    FAMILY_CODE_WORD="Gulab Jamun",
    TRUSTED_CONTACTS=json.dumps([{"name": "Rahul", "relation": "grandson", "phone": "+91 98765 43210"}]),
    REPORTED_NUMBERS=json.dumps(["+911140000000"]),
)

from fastapi.testclient import TestClient  # noqa: E402

from app import app  # noqa: E402

c = TestClient(app)
H = {"X-Doorman-Key": "k"}


def check(**body):
    return c.post("/tools/check-caller", json=body, headers=H).json()["status"]


def test_rejects_without_key():
    assert c.post("/tools/check-caller", json={}).status_code == 401
    assert c.post("/tools/check-caller", json={}, headers={"X-Doorman-Key": "x"}).status_code == 401


def test_caller_status():
    assert check(phone_number="09876543210") == "trusted"
    assert check(phone_number="1140000000") == "reported_scam"
    assert check(claimed_name="Rahul") == "family_unverified"
    assert check(claimed_relation="her grandson", code_word="gulab-jamun") == "family_verified"
    assert check(claimed_name="Rahul", code_word="rasgulla") == "family_code_wrong"
    assert check(claimed_name="CBI officer Sharma") == "unknown"


def test_code_word_never_returned():
    for cw in ("", "rasgulla"):
        r = c.post("/tools/check-caller", json={"claimed_name": "Rahul", "code_word": cw}, headers=H)
        assert "gulab" not in r.text.lower()


def test_feed_never_carries_code_word():
    from app import EVENTS
    c.post("/tools/check-caller", json={"claimed_name": "Rahul", "code_word": "gulab jamun"}, headers=H)
    assert EVENTS[-1]["status"] == "family_verified"
    assert "gulab" not in json.dumps(EVENTS).lower()
