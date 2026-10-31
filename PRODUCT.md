# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **The family** (adult child or grandchild, often in another city) of an elderly parent in India. They keep the console open or get pushed alerts, and want to know, as it happens, who is calling their parent and whether anyone is trying to take money.
- **The elder** never uses the web page. She only ever talks to Doorman on the phone, in Hindi, English or Hinglish.
- **Hackathon judges** (Vaani founders) see the page on a laptop beside a live speakerphone call, and in a 1–2 minute recorded demo.

## Product Purpose
Doorman is a voice agent on Vaani that answers an elderly person's phone before she does (via call forwarding). It works out who is calling, blocks scammers without sharing anything, takes messages from genuine callers, verifies family with a code word checked on the server, and tells the family the moment a scam is attempted. Success: no OTP, money or personal detail ever leaves the call, and the family knows within seconds.

## Positioning
A phone-first guard that sits in front of the elder rather than an app she must learn. The family code word is verified server-side, so the agent can't leak it and a cloned voice can't pass. Every action the agent takes shows up live for the family.

## Operating Context
- Live judging: a judge calls the agent's number on speaker with an unseen scenario (fake CBI officer, grandson in trouble, bank KYC, real pharmacy). The console is on screen at the same moment.
- Events stream from a FastAPI backend (tools called mid-call, Vaani post-call webhook) over SSE.
- Built today, 31 Oct 2026, for the Vaani Agent Buildathon (Care and Safety track), submissions due 3:15 pm IST.

## Capabilities and Constraints
- Agent actions: `check_caller`, `alert_family` (ntfy push), `take_message`; post-call report with extracted fields and an outcome tag.
- Next.js 16, Tailwind 4, Lenis, anime.js; Python FastAPI backend.
- Undecided: the real person's name to use as the persona (placeholder "Kamla ji").

## Brand Commitments
- Name: Doorman. Line: "Every call meets the doorman first."

## Evidence on Hand
- No users, testimonials, statistics or press. Do not invent counts of scams, money saved or customers. Only the live event feed is real data.

## Product Principles
1. Nothing about the elder leaves the call. Safety beats helpfulness.
2. Show what the agent did, not what it promises: the live log is the proof.
3. Calm, not alarm. The family should feel informed, not frightened.
4. Language follows the caller.

## Accessibility & Inclusion
Family members may be older themselves: large readable type, strong contrast, no meaning carried by colour alone, reduced-motion respected.
