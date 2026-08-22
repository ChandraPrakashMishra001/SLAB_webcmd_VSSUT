# Google Antigravity Agent Guide

Integrate **Webcmd** with the **Google Antigravity** agentic IDE and CLI to empower AI agents with self-learning, deterministic browser automation and structured outputs.

---

## 1. Quick Setup

Install Webcmd globally or in your project:

```bash
npm install -g @agentrhq/webcmd
webcmd doctor
```

Install Webcmd skills directly into Antigravity's skill registry:

```bash
webcmd skills add --provider antigravity
```

This symlinks the core Webcmd skills (`webcmd-usage`, `webcmd-browser`, `smart-search`, `webcmd-sitemap-author`, `webcmd-adapter-author`, `webcmd-autofix`) into:
- **User scope (default):** `~/.gemini/antigravity/skills/`
- **Project scope:** `.antigravity/skills/`

Verify installed skills:

```bash
webcmd skills list -f json
```

---

## 2. Why Use Webcmd in Antigravity?

| Feature | Standard Browser Agents | Webcmd + Antigravity |
|---|---|---|
| **Token Consumption** | 5,000–50,000 tokens per action (raw DOM / full screenshot) | **50–300 tokens** via structured JSON output |
| **Execution Latency** | 5–15 seconds per multi-step browser turn | **Sub-second** deterministic CLI adapter execution |
| **Self-Learning (SLAB)** | Redis雰囲res websites from scratch every run | **Learns once**, saves sitemap/adapter, reuses forever |
| **Authentication & Cookie Jars** | Unsafe password typing, frequent auth dropouts | **Isolated Chrome profiles** (`--profile work`) |
| **Anti-Bot / Cloudflare** | Blocked by basic WAFs | **Stealth CDP + CloakBrowser** engine |

---

## 3. Recommended Workflow for Antigravity Agents

### Step 1: Optimize Prompts & Check Available Adapters

Before opening raw browsers, Antigravity agents optimize tasks and auto-route to pre-compiled CLI adapters:

```bash
# Auto-suggest pre-built adapters
webcmd suggest "track Amazon prices for mechanical keyboards" -f json

# Optimize a verbose prompt to minimal tokens
webcmd prompt optimize "Please search pubmed for quantum biology papers and pull top 5" -f json
```

### Step 2: Deterministic Command Execution

If an adapter exists in the 120+ catalog:

```bash
# Install if not yet present
webcmd plugin install github:agentrhq/webcmd/plugins/pubmed

# Run directly with structured JSON output
webcmd pubmed search --query "quantum biology" --limit 5 -f json
```

### Step 3: Raw Browser Exploration (When Site is Unfamiliar)

For unmapped websites, Antigravity creates an isolated session:

```bash
# 1. Create session
webcmd session create -f json

# 2. Inspect page via accessibility tree snapshot (cleaner and smaller than full DOM)
webcmd --session <session-id> browser snapshot --snapshot-mode act

# 3. Execute Playwright program
printf "await page.goto('https://example.com'); return await page.title();" \
  | webcmd --session <session-id> browser run --stdin

# 4. List active sessions
webcmd session list -f json

# 5. Clean up session
webcmd session close <session-id>
```

### Step 4: Self-Learning & Adapter Synthesis (The SLAB Loop)

1. Save discovered endpoints & state signatures:
   ```bash
   webcmd site note example.com "Search endpoint is at /api/v2/items"
   ```
2. Scaffold a reusable adapter:
   ```bash
   webcmd plugin scaffold example.com
   ```
3. Future agent turns execute `webcmd example.com search` with zero token waste!

---

## 4. Tool Overrides in Antigravity

When running Antigravity with Webcmd, we recommend disabling external browser scraping tools in your environment configuration and directing tasks to `webcmd-usage` and `webcmd-browser`:

- Disable generic unstealthed `web_fetch` or generic scraping MCPs.
- Keep specialized web search tools (`web_search`) enabled for query discovery.

