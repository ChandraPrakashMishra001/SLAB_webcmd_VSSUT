# Webcmd: Complete Agent & Hackathon Guide

> **Make any website your CLI. Zero setup. AI-powered.**
> SLAB (Self-Learning Agent Browser) Hackathon — hosted by Webcmd @ VSSUT Odisha.

---

## Table of Contents

1. [Quick Start & Installation](#1-quick-start--installation)
2. [The 4-Layer SLAB Architecture](#2-the-4-layer-slab-architecture)
3. [Token Optimization — `webcmd prompt`](#3-token-optimization--webcmd-prompt)
4. [Smart Auto-Suggestion — `webcmd suggest`](#4-smart-auto-suggestion--webcmd-suggest)
5. [Hackathon Idea Generator — `webcmd idea`](#5-hackathon-idea-generator--webcmd-idea)
6. [Google Antigravity Integration](#6-google-antigravity-integration)
7. [Chrome & Browser Session Control](#7-chrome--browser-session-control)
8. [Real-World Hackathon Recipes](#8-real-world-hackathon-recipes)
9. [Judging Rubric](#9-judging-rubric)
10. [Supported Agent Stacks](#10-supported-agent-stacks)

---

## 1. Quick Start & Installation

```bash
# Install globally
npm install -g @agentrhq/webcmd

# Verify connectivity
webcmd doctor

# Install skills for your agent harness
webcmd skills add --provider antigravity   # Google Antigravity
webcmd skills add --provider claude        # Claude Code
webcmd skills add --provider codex         # Codex CLI
webcmd skills add --provider agents        # Cursor / OpenCode / Hermes / OpenClaw

# Explore 120+ ready-to-use site adapters
webcmd list -f json
webcmd plugin catalog -f json
```

---

## 2. The 4-Layer SLAB Architecture

Traditional browser agents re-discover websites from scratch on every run — wasting **5,000–50,000 tokens** per action on full HTML DOM dumps and screenshots. Webcmd introduces a **4-layer self-learning pyramid**:

```text
┌────────────────────────────────────────────────────────┐
│  Layer 3: Deterministic CLI Execution                  │
│  webcmd <site> <command> -f json  (0 token overhead)  │
├────────────────────────────────────────────────────────┤
│  Layer 2: CLI Adapter Authoring                        │
│  Synthesize reusable adapter with structured output   │
├────────────────────────────────────────────────────────┤
│  Layer 1: Sitemap Memory & Endpoint Graph             │
│  Preserve state signatures, endpoints, and pitfalls   │
├────────────────────────────────────────────────────────┤
│  Layer 0: Live Browser Exploration                    │
│  Sandboxed Playwright session, AX snapshots, CDP      │
└────────────────────────────────────────────────────────┘
```

> **The SLAB Rule:** *Explore once. Learn the workflow. Reuse the command.*

| Layer | Tools | Output |
|---|---|---|
| **0 – Explore** | `webcmd session create`, `browser snapshot`, `browser run` | Page structure, network endpoints |
| **1 – Learn** | `webcmd site note`, `webcmd site memory` | Saved endpoint graph & site notes |
| **2 – Synthesize** | `webcmd plugin scaffold`, `webcmd adapter create` | Reusable YAML/JS adapter |
| **3 – Execute** | `webcmd <site> <command> -f json` | Deterministic structured JSON |

---

## 3. Token Optimization — `webcmd prompt`

Minimize LLM token consumption by converting verbose natural language into compact, deterministic Webcmd CLI commands.

### Optimize a Prompt

```bash
webcmd prompt optimize "Please go to Hacker News and find the top 5 AI stories with titles and links" -f json
```

**Output (JSON):**
```json
{
  "originalEstimatedTokens": 19,
  "optimizedCommand": "webcmd hackernews top --limit 5 -f json",
  "tokensSaved": 1179,
  "percentReduction": 98,
  "matchedSite": "hackernews",
  "matchedCommand": "top"
}
```

### Generate a Compact Schema for LLM System Prompts

Inject ultra-dense command signatures into agent system prompts to slash context overhead:

```bash
webcmd prompt schema hackernews top -f json
```

**Output:**
```json
{
  "compactSchema": "hackernews.top(limit?:int)->[rank,title,score,author,comments,url]",
  "estimatedTokens": 12
}
```

### Key Benefits

- **70%–98% token reduction** per browser action turn
- Zero hallucination: outputs exact, runnable CLI invocations
- Works with any LLM (Gemini, Claude, GPT, Codex, Llama)

---

## 4. Smart Auto-Suggestion — `webcmd suggest`

Evaluates natural language goals against the live adapter registry and 120+ plugin catalog to suggest the best pre-built command.

### Usage

```bash
# Find the best adapter for any goal
webcmd suggest "compare flight prices from Delhi to London" -f json
webcmd suggest "track cryptocurrency prices on CoinGecko" -f json
webcmd suggest "pull top AI research papers from arXiv" -f json
webcmd suggest "scrape product reviews from Amazon" -f json

# Limit results
webcmd suggest "news about AI" --limit 3 -f json
```

### Example Output

```json
{
  "intent": "track cryptocurrency prices on coingecko",
  "suggestions": [
    {
      "site": "coingecko",
      "command": "coin",
      "score": 100,
      "confidence": "HIGH",
      "exampleInvocation": "webcmd plugin install github:agentrhq/webcmd/plugins/coingecko && webcmd coingecko coin bitcoin -f json"
    }
  ],
  "recommendedAction": "Install plugin: `webcmd plugin install github:agentrhq/webcmd/plugins/coingecko` then run `webcmd coingecko coin -f json`"
}
```

### How It Works

- Tokenizes the natural language intent and removes stop-words
- Scores all 842 catalog commands by site name match, command name match, description relevance, and tag overlap
- Returns ranked suggestions with exact invocations, argument schemas, and install sources

---

## 5. Hackathon Idea Generator — `webcmd idea`

Generates production-grade browser agent concepts with complete 4-layer SLAB architectural blueprints across 7 verticals.

### List All Verticals

```bash
webcmd idea --verticals -f json
```

**Verticals:** `research` · `ecommerce` · `travel` · `career` · `social` · `devtools` · `finance`

### Generate Ideas by Vertical

```bash
webcmd idea ecommerce -f json    # Price arbitrage, stock monitoring
webcmd idea research -f json     # Academic literature synthesis
webcmd idea travel -f json       # Flight & hotel deal monitoring
webcmd idea career -f json       # Job & recruiter radar
webcmd idea social -f json       # Social media analytics
webcmd idea devtools -f json     # CVE & dependency vulnerability scanner
webcmd idea finance -f json      # Earnings calendar, crypto tracking
webcmd idea all -f json          # All 7 verticals at once
```

### Example Blueprint Output

```json
{
  "id": "ecommerce-price-arbitrage",
  "title": "Multi-Store Quick-Commerce Price & Stock Arbitrage Monitor",
  "vertical": "ecommerce",
  "blueprint": {
    "layer0Explore": "Explore local storefronts via `webcmd browser snapshot` to isolate pincode and inventory grids.",
    "layer1Sitemap": "Record location header signatures in `sitemap/pages/_product-card.md`.",
    "layer2Adapter": "Author `webcmd blinkit search` returning [item, brand, price, unit, discount, inStock, url].",
    "layer3Cli": "Run `webcmd blinkit search --query \"milk\" -f json` in a recurring agent heartbeat."
  },
  "sampleCommand": "webcmd blinkit search --query \"organic oats\" -f json"
}
```

---

## 6. Google Antigravity Integration

### Install Webcmd Skills into Antigravity

```bash
# User scope (recommended) — works across all projects
webcmd skills add --provider antigravity

# Project scope — keeps skills inside this repo for teammates
webcmd skills add --provider antigravity --scope project
```

This links 6 core skills directly into Antigravity's skill registry:

| Skill | Purpose |
|---|---|
| `webcmd-usage` | Master agent skill: command discovery, adapter execution, session strategies |
| `webcmd-browser` | Raw Playwright session management and CDP control |
| `smart-search` | Multi-site research with structured JSON output |
| `webcmd-sitemap-author` | Record and persist site endpoint graphs |
| `webcmd-adapter-author` | Synthesize reusable CLI adapters |
| `webcmd-autofix` | Auto-repair broken DOM selectors and failing adapters |

### Why Webcmd + Antigravity?

| Feature | Standard Browser Agent | Webcmd + Antigravity |
|---|---|---|
| Token consumption | 5,000–50,000 per action | **50–300 tokens** via JSON |
| Execution latency | 5–15 seconds per turn | **Sub-second** deterministic |
| Self-learning | Discovers from scratch every run | **Learns once, reuses forever** |
| Authentication | Unsafe password typing | **Isolated Chrome profiles** |
| Anti-bot/Cloudflare | Often blocked | **Stealth CDP + CloakBrowser** |

### Recommended Antigravity Agent Workflow

```bash
# Step 1 — Auto-suggest the best adapter before opening a raw browser
webcmd suggest "track Amazon prices for mechanical keyboards" -f json

# Step 2 — Optimize the prompt to minimal tokens
webcmd prompt optimize "Search pubmed for quantum biology papers, limit 5" -f json

# Step 3 — Run deterministically with structured output
webcmd plugin install github:agentrhq/webcmd/plugins/pubmed
webcmd pubmed search --query "quantum biology" --limit 5 -f json

# Step 4 — Only open raw browser if site is unmapped
webcmd session create -f json
webcmd --session <id> browser snapshot --snapshot-mode act
webcmd --session <id> browser run --stdin < script.js
webcmd session close <id>
```

---

## 7. Chrome & Browser Session Control

All browser work runs in **isolated Playwright sessions** — no cross-contamination between agent runs.

```bash
# Create a named Chrome profile (logs in once, reuses cookies forever)
webcmd profile create work

# Run commands in that profile (LinkedIn, Gmail, GitHub with auth)
webcmd --profile work linkedin messages --limit 10 -f json

# Attach to a running Chrome instance via CDP
WEBCMD_CDP_ENDPOINT="http://127.0.0.1:9222" webcmd browser snapshot

# Create an isolated session for a one-off task
webcmd session create -f json
webcmd --session <session-id> browser snapshot
webcmd session close <session-id>

# List all active sessions
webcmd session list -f json
```

---

## 8. Real-World Hackathon Recipes

### Recipe A: E-Commerce & Quick-Commerce Price Radar
**Goal:** Compare real-time prices and stock across Blinkit, Zepto, and Amazon Fresh.

```bash
webcmd suggest "compare grocery prices blinkit zepto" -f json
webcmd plugin install github:agentrhq/webcmd/plugins/zepto
webcmd zepto search --query "organic oats" -f json
```

### Recipe B: Multi-Source Academic Research Synthesizer
**Goal:** Pull, deduplicate, and synthesize papers from PubMed + arXiv.

```bash
webcmd suggest "research papers on CRISPR gene therapy" -f json
webcmd plugin install github:agentrhq/webcmd/plugins/pubmed
webcmd pubmed search --query "CRISPR gene therapy" --limit 10 -f json
```

### Recipe C: Authenticated Career & Recruiter Radar
**Goal:** Track remote AI job listings and recruiter messages on LinkedIn.

```bash
webcmd profile create work   # Login once
webcmd --profile work linkedin messages --limit 20 -f json
```

### Recipe D: Crypto Price & Trend Monitor
**Goal:** Track top cryptocurrencies and trending tokens in real-time.

```bash
webcmd plugin install github:agentrhq/webcmd/plugins/coingecko
webcmd coingecko top --limit 20 -f json
webcmd coingecko trending -f json
```

### Recipe E: DevTools CVE & Dependency Vulnerability Scanner
**Goal:** Detect newly disclosed CVEs in open-source dependencies.

```bash
webcmd idea devtools -f json   # Get the full 4-layer blueprint
# Implement: webcmd osv query --package express --ecosystem npm -f json
```

---

## 9. Judging Rubric

What makes a **winning** SLAB hackathon browser agent:

| Criterion | Weight | Description |
|---|---|---|
| **Deterministic Output** | ⭐⭐⭐ | Uses `-f json` — no hallucinated, unstructured scraping |
| **Token Efficiency** | ⭐⭐⭐ | Demonstrates measurable token savings vs raw browser |
| **Self-Learning** | ⭐⭐ | Persists site knowledge; reuses adapters across runs |
| **Real-World Impact** | ⭐⭐ | Solves a painful, real-world workflow |
| **Robust Error Recovery** | ⭐ | Uses `webcmd-autofix` / `--trace retain-on-failure` |

---

## 10. Supported Agent Stacks

Bring any agent harness and plug in Webcmd:

```bash
webcmd skills add --provider antigravity   # Google Antigravity (AGY)
webcmd skills add --provider claude        # Claude Code
webcmd skills add --provider codex         # Codex CLI
webcmd skills add --provider agents        # Cursor / OpenCode / Hermes / OpenClaw / Pi
```

Direct programmatic integration also works with **Playwright**, **Browser-Use**, **LangGraph**, and any harness that can run shell commands.

---

*Made with ❤️ by the Webcmd team for the SLAB Hackathon @ VSSUT Odisha.*