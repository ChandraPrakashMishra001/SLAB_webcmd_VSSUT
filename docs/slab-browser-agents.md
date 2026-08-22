# SLAB: Self-Learning Agent Browser Hackathon Guide

**Hosted by Webcmd @ Veer Surendra Sai University of Technology (VSSUT), Odisha.**

Build autonomous **Browser Agents** that research, monitor, book, shop, and complete real-world work across the web — with **zero prompt bloat**, **90% token reduction**, and **deterministic execution**.

---

## 1. The Core Philosophy: The 4-Layer Self-Learning Architecture

Traditional browser agents re-discover the web from scratch on every run, wasting millions of tokens on full HTML DOM dumps and screenshots. **Webcmd** introduces a 4-layer self-learning pyramid:

```text
┌────────────────────────────────────────────────────────┐
│  Layer 3: Deterministic CLI Execution                   │
│  webcmd <site> <command> -f json (0 token overhead)    │
├────────────────────────────────────────────────────────┤
│  Layer 2: CLI Adapter Authoring                         │
│  Synthesize reusable adapter with structured output    │
├────────────────────────────────────────────────────────┤
│  Layer 1: Sitemap Memory & Endpoint Graph              │
│  Preserve state signatures, endpoints, and pitfalls    │
├────────────────────────────────────────────────────────┤
│  Layer 0: Live Browser Exploration                     │
│  Sandboxed Playwright session, AX snapshots, CDP       │
└────────────────────────────────────────────────────────┘
```

> **The SLAB Rule:** *Explore once. Learn the workflow. Reuse the command.*

---

## 2. Fast-Start Hackathon Toolkit

Webcmd includes built-in commands tailored for hackathon teams and agent developers:

### 1. Generate Hackathon Ideas & 4-Layer Blueprints
```bash
# Brainstorm ideas across verticals (ecommerce, research, travel, career, social, devtools, finance)
webcmd idea ecommerce -f json
webcmd idea research -f json
webcmd idea --verticals -f json
```

### 2. Auto-Suggest Commands from Natural Language
```bash
webcmd suggest "compare flight prices from Delhi to London" -f json
webcmd suggest "pull top AI papers from arXiv" -f json
```

### 3. Prompt Optimization & Token Minimization
```bash
webcmd prompt optimize "Please go to Hacker News and pull the top 10 AI stories with title and URL" -f json
```

---

## 3. Real-World Hackathon Blueprint Recipes

### Recipe A: E-Commerce & Quick-Commerce Price Radar (Blinkit / Zepto / Amazon)
- **Goal:** Compare real-time grocery prices and stock across quick-commerce stores.
- **Layer 0 Explore:** Launch `webcmd session create`, visit store location selector, inspect network requests.
- **Layer 1 Learn:** Record store pincode endpoints in `~/.webcmd/sites/blinkit/endpoints.json`.
- **Layer 2 Adapter:** Author `webcmd blinkit search --query <item>` returning `[item, price, discount, stock, url]`.
- **Layer 3 Reusable:** Future agents run `webcmd blinkit search --query "milk" -f json` for sub-second price alerts.

### Recipe B: Multi-Source Academic Research Synthesizer (PubMed + arXiv + Scholar)
- **Goal:** Auto-generate clinical trial summaries from scientific literature.
- **Commands:** `webcmd pubmed search` + `webcmd arxiv search`.
- **Outcome:** Clean JSON streaming directly into LLM synthesis without web scraping errors.

### Recipe C: Authenticated Career & Recruiter Radar (LinkedIn / YC)
- **Goal:** Find remote AI roles and track recruiter activity.
- **Setup:** Log into Chrome profile once: `webcmd profile create work`.
- **Execution:** `webcmd --profile work linkedin messages --limit 10 -f json`.

---

## 4. Judging Rubric: What Makes a Winning Browser Agent?

1. **Deterministic Structured Output (`-f json`)**: No hallucinations or unstructured markdown scraping.
2. **Token Efficiency**: Up to 90% savings compared to standard raw browser screenshot loops.
3. **Robust Error Recovery**: Utilizes `webcmd-autofix` and `--trace retain-on-failure` to auto-repair broken DOM selectors.
4. **Clean Session & Profile Isolation**: Named profiles for cookie jars and isolated sessions for parallel agents.
5. **Real-World Impact**: Automates a painful, multi-step workflow (e.g. flight booking, price tracking, security monitoring).

---

## 5. Supported Agent Stacks

Bring your preferred agent harness to the hackathon:
- **Google Antigravity**: `webcmd skills add --provider antigravity`
- **Claude Code**: `webcmd skills add --provider claude`
- **Codex CLI**: `webcmd skills add --provider codex`
- **Cursor / OpenCode / Hermes / OpenClaw**: `webcmd skills add --provider agents`
- **Playwright / Browser-Use / LangGraph**: Direct programmatic integration.

