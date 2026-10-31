# Vaani quickstart

What we build against, checked against the live API on 2026-10-31. Where the
docs or `openapi.json` disagree with the API, this file follows the API.

Full docs are mirrored locally in `docs/vaani/` (run `docs/vaani/sync.sh`
after cloning). The feature map is in [FEATURES.md](FEATURES.md).

## Links

| What | Where |
| - | - |
| Docs | https://docs.vaani.dev (local: `docs/vaani/INDEX.md`) |
| API base URL | `https://api.vaanivoice.ai` |
| Dashboard | https://platform.vaani.dev |
| Quickstart | https://docs.vaani.dev/getting-started/quickstart |
| Create an agent | https://docs.vaani.dev/getting-started/create-agent |
| Telephony | https://docs.vaani.dev/getting-started/setup-telephony |
| Campaigns | https://docs.vaani.dev/guides/start-a-campaign |
| Webhooks | https://docs.vaani.dev/guides/webhook-setup |
| Python SDK | https://docs.vaani.dev/sdk |

## Auth

Every request sends the key in `X-API-Key`. Ours lives in `.env` as
`VAANI_API_KEY` (gitignored), never in browser code.

```http
X-API-Key: vaani_<your_api_key>
```

Get a key from the dashboard under **Settings → API Keys** (the developers
page calls it **Developers → API Keys**). Keys are shown once.

## Agents

**Create** — `POST /api/create-agent` · [doc](vaani/api-reference/create-agent.md)

```bash
curl -X POST https://api.vaanivoice.ai/api/create-agent \
  -H "X-API-Key: $VAANI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_display_name": "Sales Support Bot",
    "config": {
      "persona": {
        "identity": {
          "system_prompt": "You are an AI sales assistant for Vaani Voice. Be polite, concise, and helpful."
        }
      }
    }
  }'
```

`config` is optional and takes any subset of `persona`, `training`,
`experience`, `analysis`, `deployment_config`.

**List / delete** — `GET /api/agents?search=&page=&page_size=`,
`DELETE /api/agents/{agent_id}` (plural `agents`).

**Update one section** — `PATCH /api/agent/{agent_id}/{section}`, singular
`agent`. Only the fields sent are merged; the next call picks them up.

| Section | Covers | Doc |
| - | - | - |
| `persona` | identity, system prompt, STT/LLM/TTS | [doc](vaani/api-reference/update-persona.md) |
| `training` | knowledge base, FAQ, guardrails, tools | [doc](vaani/api-reference/update-training.md) |
| `experience` | background noise, filler words, idle/hang-up, max duration | [doc](vaani/api-reference/update-experience.md) |
| `analysis` | dispositions, extraction, evaluations | [doc](vaani/api-reference/update-analysis.md) |
| `deployment` | numbers, widget, webhooks | [doc](vaani/api-reference/update-deployment.md) |

## Calls

`POST /api/trigger-call/` (keep the trailing slash) · [doc](vaani/api-reference/trigger-call.md)

**Phone call** — `name` and `contact_number` (E.164) are required for
`telephony`, which is the default `medium`.

```bash
curl -X POST https://api.vaanivoice.ai/api/trigger-call/ \
  -H "X-API-Key: $VAANI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "<AGENT_UUID>",
    "name": "Jane Doe",
    "contact_number": "+1234567890",
    "medium": "telephony",
    "metadata": { "customer_name": "Jane Doe", "account_id": "ACC-12345" }
  }'
```

The response carries `output.call_id`. Accepted means dispatched, not answered.

**Browser call (WebRTC)**

```bash
curl -X POST https://api.vaanivoice.ai/api/trigger-call/ \
  -H "X-API-Key: $VAANI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "agent_id": "<AGENT_UUID>", "medium": "webrtc" }'
```

Returns a LiveKit `token`, a `connection_url` and a `live_captions_url` for
the frontend to join with.

**Per-call overrides** — `modify_agent` accepts only `persona`, `training`,
`experience`, `analysis`, and is deep-merged over the agent's config for that
call alone. Works for both mediums.

```json
{
  "agent_id": "<AGENT_UUID>",
  "name": "Jane Doe",
  "contact_number": "+1234567890",
  "modify_agent": {
    "persona": {
      "identity": { "system_prompt": "Special dynamic prompt for this VIP customer." }
    }
  }
}
```

`metadata` keys fill the template variables defined on the agent.

## After the call

| What | Endpoint | Doc |
| - | - | - |
| History | `GET /api/call-history?page=1&page_size=50` — whole account; filter by `agent_id` ourselves | [doc](vaani/api-reference/call-history.md) |
| Details | `GET /api/call_details/{call_id}` — underscore; transcript, `entity`, `summary`, `conversation_eval` | [doc](vaani/api-reference/call-details.md) |
| Transcript | `GET /api/transcript/{call_id}` | [doc](vaani/api-reference/transcript.md) |
| Audio | `GET /api/stream/{call_id}` | [doc](vaani/api-reference/stream.md) |

Results land after the call ends: the `call_postprocessing` webhook says the
transcript, summary and extracted details are ready
([doc](vaani/guides/webhook-setup.md)).

## Campaigns

| What | Endpoint |
| - | - |
| Create (multipart, CSV of contacts) | `POST /api/campaigns/create` |
| List | `GET /api/campaigns/` |
| Status / results CSV | `GET /api/campaigns/{id}/status`, `GET /api/campaigns/{id}/results` |
| Update (auto-pauses) | `PUT /api/campaigns/{id}` |
| Start / pause / resume | `POST /api/campaigns/{id}/start`, `/pause`, `/resume` |
| Stop at end of day / cancel now | `POST /api/campaigns/{id}/stop`, `/cancel` |

Docs: [create](vaani/api-reference/campaigns/create.md),
[webhooks](vaani/api-reference/campaigns/webhooks.md).

## Python SDK

```bash
pip install vaani-sdk
```

```python
import os
from vaani_sdk import VaaniClient

with VaaniClient(api_key=os.getenv("VAANI_API_KEY")) as client:
    call = client.trigger_call(
        agent_id="<AGENT_UUID>",
        contact_number="+1234567890",
        name="Alice",
        metadata={"customer_name": "Alice"},
    )
    print(call.call_id)

    details = client.get_call_details(call.call_id)
    print(details.raw.get("summary"))
```

WebRTC from Python goes through `client.sessions.create/connect/disconnect`
([doc](vaani/sdk.md)).

## Where the docs are wrong

Checked with read-only requests on 2026-10-31:

- `openapi.json` gives call details as `/api/call_details/{client}/{call_id}`.
  That 404s; the client comes from the key, so it is `/api/call_details/{call_id}`.
- `/api/call-details/{call_id}` (hyphen) 404s.
- `/api/call-history/{agent_id}` 404s; history is account-wide.
- `/api/agents/{id}/persona` 404s; section updates are on singular `/api/agent/`.
