<div align="center">

# 🧩 LLM & RAG Debugger — WFGY 16 Problem Map

### Your RAG bug already has a number. Stop guessing which one.

A **16-mode, map-based debugger** that turns messy LLM / RAG bugs into *reproducible failure modes*, each linked to a concrete fix in the open-source [WFGY Problem Map](https://github.com/onestardao/WFGY/tree/main/ProblemMap).

Paste a trace, a log, or a prompt / answer pair — get back the closest Problem Map number (**No.1 – No.16**), the exact document to open first, and a patch you can apply at the prompt layer without touching your infrastructure.

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Try_it_now-5eead4?style=for-the-badge)](https://tirth1263.github.io/LLM-and-RAG-Debugger-WFGY-16-Problem-Map/)
[![Open in Colab](https://img.shields.io/badge/Open_in-Colab-F9AB00?style=for-the-badge&logo=googlecolab&logoColor=white)](https://colab.research.google.com/github/tirth1263/LLM-and-RAG-Debugger-WFGY-16-Problem-Map/blob/main/notebooks/wfgy_llm_debugger.ipynb)

![Python](https://img.shields.io/badge/Python-3.9%2B-3776AB?logo=python&logoColor=white)
![Nebius](https://img.shields.io/badge/Nebius-Token_Factory-1E40AF)
![OpenAI compatible](https://img.shields.io/badge/API-OpenAI_compatible-412991?logo=openai&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)
![Dependencies](https://img.shields.io/badge/Dependencies-2-lightgrey)

**🌐 Live app → [tirth1263.github.io/LLM-and-RAG-Debugger-WFGY-16-Problem-Map](https://tirth1263.github.io/LLM-and-RAG-Debugger-WFGY-16-Problem-Map/)**

</div>

---

## 🤔 The problem this solves

Debugging an LLM or RAG pipeline is mostly *vibes*.

The answer is wrong. So you swap the embedding model. Then you re-chunk. Then you add three lines to the system prompt. Something changes, the bug seems to go away, and two weeks later it comes back wearing a different hat — because you never actually found out **which layer broke**.

The trouble is that "the model gave a bad answer" is not one bug. It is at least sixteen, and they have almost nothing in common:

| You see | It might be | The fix is nowhere near the other |
|---|---|---|
| Wrong answer, wrong source retrieved | **No.1** — retrieval handed it the wrong text | Fix the index |
| Wrong answer, *right* source retrieved | **No.2** — reasoning collapsed on correct context | Fix the reasoning step |
| Wrong answer only after a deploy | **No.16** — version skew or a stale secret | Fix the environment |

Those three look identical in a bug report. They share zero fixes. Guess wrong and you spend a day tuning a retriever that was never broken.

**This debugger removes the guess.** It routes the symptom to exactly one number, tells you what you should see in the trace if that number is right, and points you at one document.

> A number is falsifiable. "Try improving your chunking" is a mood.

---

## ✨ What you get

| | |
|---|---|
| 🗺️ **16-mode failure map** | Every bug maps to one primary `No.1–No.16` plus an optional secondary candidate — never a vague category. |
| 🧠 **Semantic firewall prompt** | Uses `TXTOS.txt` as a reasoning OS plus the live WFGY Problem Map README, so it *diagnoses before it prescribes*. |
| 🔌 **Provider agnostic** | Plain Python + the official OpenAI client. Point it at Nebius Token Factory, OpenAI, Groq, Together, or your own gateway. |
| 📓 **One-cell notebook** | Paste the whole of `main.py` into a single Colab / Nebius / Jupyter cell and run. |
| 💻 **CLI friendly** | `python main.py`. Multi-line paste, blank line submits, loop for as many bugs as you want. |
| 🌐 **Zero-install web app** | A static site with an **offline engine** that classifies in your browser with no API key at all. |
| 🔍 **Transparent scoring** | The offline engine shows every phrase it matched and what it scored, so you can argue with the verdict. |
| 🚫 **No infra changes** | Every suggested patch lives at the prompt / call-pattern layer. Your stack does not move. |

---

## 🚀 Three ways to run it

### 1. Web app — nothing to install

**→ [Open the live debugger](https://tirth1263.github.io/LLM-and-RAG-Debugger-WFGY-16-Problem-Map/)**

Paste a bug, hit **Diagnose**. The **offline engine** works instantly with no key and no network call. Switch to the **live engine** to route the same structured prompt through your own OpenAI-compatible endpoint.

> 🔒 **On keys:** the site is fully static — there is no backend. If you use the live engine, the key stays in a JavaScript variable in your tab, is never written to storage, and goes only to the endpoint URL you typed. Because it is a direct browser call, the endpoint must return CORS headers; if yours does not, use the offline engine or the **Copy full prompt** button and run it from the CLI.

### 2. CLI

```bash
git clone https://github.com/tirth1263/LLM-and-RAG-Debugger-WFGY-16-Problem-Map.git
cd LLM-and-RAG-Debugger-WFGY-16-Problem-Map

python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

pip install -r requirements.txt
python main.py
```

The script walks you through it:

1. **API key** — hidden input via `getpass`
2. **Base URL** — press Enter for Nebius Token Factory, or type `openai`
3. **Model id** — press Enter for the default, or type any model your provider exposes

Then paste your bug over as many lines as you like and press **Enter on an empty line** to submit. Type `map` to reprint the 16 modes, `quit` to exit. After each diagnosis it asks whether you want to debug another.

### 3. Notebook (Colab / Nebius / Jupyter)

Open [`notebooks/wfgy_llm_debugger.ipynb`](notebooks/wfgy_llm_debugger.ipynb), or paste the whole of `main.py` into **one cell** and run it. Same interactive flow.

```python
%pip install -q openai requests
# then paste main.py below and run
```

---

## ⚙️ Configuration

Everything is optional. Set nothing and the script asks you at runtime.

```bash
# --- Nebius Token Factory ---
NEBIUS_API_KEY="your_nebius_api_key"

# The script reads OPENAI_API_KEY, so export the same value here
OPENAI_API_KEY="$NEBIUS_API_KEY"

# Nebius Token Factory OpenAI compatible endpoint
OPENAI_BASE_URL="https://api.tokenfactory.nebius.com/v1/"

# Any Nebius model id, for example a Llama instruction model
OPENAI_MODEL="meta-llama/Meta-Llama-3.1-70B-Instruct"
```

<details>
<summary><b>Other OpenAI-compatible providers</b></summary>

| Provider | `OPENAI_BASE_URL` |
|---|---|
| Nebius Token Factory | `https://api.tokenfactory.nebius.com/v1/` |
| OpenAI | `https://api.openai.com/v1/` |
| Groq | `https://api.groq.com/openai/v1/` |
| Together | `https://api.together.xyz/v1/` |
| Local Ollama | `http://localhost:11434/v1/` |

Use whatever model id that provider exposes. A `404` from the endpoint almost always means the model id is wrong, not the key.

</details>

See [`.env.example`](.env.example) for the full annotated file.

---

## 🗺️ The 16 modes

Powered by the public [WFGY Problem Map 1.0](https://github.com/onestardao/WFGY/tree/main/ProblemMap). Numbers are **stable identifiers** — never renumbered, never merged.

Layers: `IN` input & retrieval · `RE` reasoning · `ST` state & memory · `OP` ops & deploy

| No. | Layer | Problem domain | What breaks in practice | Doc |
|:--:|:--:|---|---|---|
| 1 | `IN` | Hallucination and chunk drift | Retrieval returns wrong or irrelevant content | [hallucination](https://github.com/onestardao/WFGY/blob/main/ProblemMap/hallucination.md) |
| 2 | `RE` | Interpretation collapse | Chunk is correct, reasoning is wrong | [retrieval collapse](https://github.com/onestardao/WFGY/blob/main/ProblemMap/retrieval-collapse.md) |
| 3 | `RE` | Long reasoning chains | Multi-step tasks drift and never converge | [context drift](https://github.com/onestardao/WFGY/blob/main/ProblemMap/context-drift.md) |
| 4 | `RE` | Bluffing and overconfidence | Confident answers with no real support | [bluffing](https://github.com/onestardao/WFGY/blob/main/ProblemMap/bluffing.md) |
| 5 | `IN` | Semantic ≠ embedding | Cosine similarity does not match true meaning | [embedding vs semantic](https://github.com/onestardao/WFGY/blob/main/ProblemMap/embedding-vs-semantic.md) |
| 6 | `RE` | Logic collapse and recovery | Chains hit dead ends and need controlled reset | [logic collapse](https://github.com/onestardao/WFGY/blob/main/ProblemMap/logic-collapse.md) |
| 7 | `ST` | Memory breaks across sessions | Lost threads and no continuity | [memory coherence](https://github.com/onestardao/WFGY/blob/main/ProblemMap/memory-coherence.md) |
| 8 | `IN` | Debugging as a black box | No visibility into retrieval and failure paths | [retrieval traceability](https://github.com/onestardao/WFGY/blob/main/ProblemMap/retrieval-traceability.md) |
| 9 | `ST` | Entropy collapse | Attention melts into incoherent output | [entropy collapse](https://github.com/onestardao/WFGY/blob/main/ProblemMap/entropy-collapse.md) |
| 10 | `RE` | Creative freeze | Flat and literal outputs when you needed structure | [creative freeze](https://github.com/onestardao/WFGY/blob/main/ProblemMap/creative-freeze.md) |
| 11 | `RE` | Symbolic collapse | Abstract or logical prompts stop working | [symbolic collapse](https://github.com/onestardao/WFGY/blob/main/ProblemMap/symbolic-collapse.md) |
| 12 | `RE` | Philosophical recursion | Self-reference loops and paradox traps | [philosophical recursion](https://github.com/onestardao/WFGY/blob/main/ProblemMap/philosophical-recursion.md) |
| 13 | `ST` | Multi agent chaos | Agents overwrite or misalign each other | [multi agent problems](https://github.com/onestardao/WFGY/blob/main/ProblemMap/Multi-Agent_Problems.md) |
| 14 | `OP` | Bootstrap ordering | Services start before dependencies and quietly fail | [bootstrap ordering](https://github.com/onestardao/WFGY/blob/main/ProblemMap/bootstrap-ordering.md) |
| 15 | `OP` | Deployment deadlock | Circular waits in infra and pipelines | [deployment deadlock](https://github.com/onestardao/WFGY/blob/main/ProblemMap/deployment-deadlock.md) |
| 16 | `OP` | Pre deploy collapse | Version skew or missing secrets on first call | [pre deploy collapse](https://github.com/onestardao/WFGY/blob/main/ProblemMap/predeploy-collapse.md) |

> Once a bug is mapped to a number, you can apply the fix and expect it **not to quietly reappear in the same way**.

---

## 🔄 How it works

```
                ┌─────────────────────────────────────────────┐
   your bug ───▶│  1. paste                                   │
  (prompt +     │     prompt · answer · retrieval trace · log  │
   answer +     └──────────────────────┬──────────────────────┘
   logs)                               │
                ┌──────────────────────▼──────────────────────┐
                │  2. load references (live, from upstream)    │
                │     OS/TXTOS.txt         ← reasoning OS      │
                │     ProblemMap/README.md ← 16-mode taxonomy  │
                └──────────────────────┬──────────────────────┘
                                       │
                ┌──────────────────────▼──────────────────────┐
                │  3. semantic firewall                       │
                │     diagnose ▸ quote evidence ▸ then route   │
                │     (any OpenAI-compatible endpoint)         │
                └──────────────────────┬──────────────────────┘
                                       │
                ┌──────────────────────▼──────────────────────┐
                │  4. structured diagnosis                    │
                │     PRIMARY   No.X · <mode>                  │
                │     SECONDARY No.Y · <mode>                  │
                │     CONFIDENCE high | medium | low           │
                │     WHY · EVIDENCE · READ FIRST · PATCH      │
                └─────────────────────────────────────────────┘
```

The references are downloaded **at runtime from the upstream repo**, so the taxonomy is never a stale local copy. If the download fails, the script falls back to the built-in 16-mode table and keeps working.

### Two engines, one map

|  | Offline engine | Live engine |
|---|---|---|
| **Where it runs** | Your browser, locally | Your OpenAI-compatible endpoint |
| **Needs a key** | No | Yes |
| **How it decides** | Weighted regex signals per mode, breadth-of-evidence bonus | An LLM reasoning over the full taxonomy |
| **Deterministic** | Yes | No |
| **Shows its work** | Every matched phrase + its score | Quoted evidence in prose |
| **Best for** | First pass, demos, air-gapped work | Ambiguous reports, close calls, nuanced traces |

Start offline. If the confidence comes back **low** or the top two modes are within a hair of each other, that ambiguity is real — escalate that same bug to the live engine.

---

## 📤 Example

**Input:**

```
Retrieval is correct. I logged the chunks and the exact clause the user asked
about is chunk #2. But the model still answers "there is no cancellation window"
when the clause plainly says 14 days. Swapping the embedding model changed
nothing because the chunk was already right.
```

**Output** *(illustrative — the structure is fixed by the prompt template, the exact wording varies by model)*:

```
PRIMARY: No.2 - Interpretation collapse
SECONDARY: none
CONFIDENCE: high

WHY:
Retrieval already succeeded — you verified the governing clause is chunk #2 and
that swapping the embedding model "changed nothing". The failure is entirely in
the step that reads the correct context and draws the opposite conclusion, which
is the definition of interpretation collapse rather than chunk drift.

EVIDENCE:
- "Retrieval is correct" plus a verified chunk id rules out No.1 and No.5.
- The answer directly contradicts a clause that is present in the context.

READ FIRST:
ProblemMap/retrieval-collapse.md

FIRST PATCH:
1. Split extract-then-answer: make the model quote the governing sentence first,
   then reason only from that quote.
2. Require it to name the chunk id it relied on before concluding.
3. Re-run the identical context with reasoning isolated to confirm retrieval was
   never the variable.
```

Note what the debugger **refused** to do: it did not tell you to improve your chunking. Retrieval was already correct, and it said so.

Twelve more ready-to-paste reports covering the other modes live in [`examples/sample_bugs.md`](examples/sample_bugs.md) — they are the same samples wired into the web app's chips.

---

## 📁 Project structure

```
LLM-and-RAG-Debugger-WFGY-16-Problem-Map/
├── main.py                       # The debugger. Single-cell script and CLI in one file.
├── requirements.txt              # openai, requests. That is the whole dependency list.
├── .env.example                  # Annotated environment variables (all optional)
│
├── notebooks/
│   └── wfgy_llm_debugger.ipynb   # Colab / Nebius / Jupyter notebook
│
├── examples/
│   └── sample_bugs.md            # 16 realistic bug reports, one per mode
│
├── docs/                         # The deployed web app (GitHub Pages)
│   ├── index.html
│   └── assets/
│       ├── styles.css
│       ├── problem-map.js        # The 16 modes + classifier signal weights
│       └── app.js                # Offline engine, live engine, UI
│
├── LICENSE                       # MIT
├── NOTICE.md                     # Upstream WFGY attribution
└── README.md
```

---

## 🛠️ Tech stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | **Python 3.9+** | Nothing exotic. Runs anywhere a notebook does. |
| LLM client | **`openai`** | The official client speaks to any OpenAI-compatible endpoint via `base_url`. |
| Fetching | **`requests`** | Pulls the WFGY references at runtime so the taxonomy stays current. |
| Provider | **Nebius Token Factory** *(or any compatible API)* | Swap the base URL and the model id; nothing else changes. |
| Web app | **Vanilla HTML / CSS / JS** | No build step, no framework, no external requests. Deploys as static files. |
| Hosting | **GitHub Pages** | Static and free. The offline engine means the demo works with no backend at all. |

---

## ❓ FAQ

<details>
<summary><b>Do I need an API key to try this?</b></summary>

No. The web app's offline engine classifies entirely in your browser using weighted signal matching. A key is only needed for the live LLM engine and for `main.py`.
</details>

<details>
<summary><b>Is my API key safe in the web app?</b></summary>

The site is static — there is no server to send it to. The key lives in a JavaScript variable for the lifetime of the tab, is never written to `localStorage` or a cookie, and is sent only to the base URL you type. You can verify all of this in [`docs/assets/app.js`](docs/assets/app.js); it is about 400 readable lines. If you would rather not paste a key into a browser at all, use `main.py`.
</details>

<details>
<summary><b>The live engine says the browser could not reach my endpoint.</b></summary>

That is almost always CORS, not your key. Many inference providers do not send the headers that permit a direct browser call. Nothing is wrong on your side — use the offline engine, or hit **Copy full prompt** and run it through `main.py` or any chat interface.
</details>

<details>
<summary><b>Why did I get a 404 from my provider?</b></summary>

A `404` on `/chat/completions` nearly always means the **model id** does not exist on that endpoint. Check the exact id in your provider's model list — they are case- and prefix-sensitive.
</details>

<details>
<summary><b>What if the number it returns is wrong?</b></summary>

Then you have learned something cheaply. Each mode comes with a **tell** — what you should see in the trace if that number is correct. If the tell does not match, the runner-up is usually the answer, and the web app shows you the runners-up with their scores.
</details>

<details>
<summary><b>Can I add a 17th mode?</b></summary>

Not to this taxonomy — the numbers are stable identifiers shared with the upstream project, and renumbering them breaks the whole point. If you have a failure that genuinely does not fit, that is a great issue to open upstream.
</details>

---

## 🤝 Contributing

Contributions and feedback are welcome — tweak the prompt, add sample bugs, sharpen the classifier signals, or extend the debugger to another provider.

1. Fork the repo and create a branch
2. Make your change
3. If you touched the classifier, check the samples in `examples/sample_bugs.md` still route to their expected numbers
4. Open a PR describing what you changed and why

Found a bug the map cannot route? Open an issue with the report — those are the most useful contributions here.

---

## 🙏 Credits

Built on the open-source [**WFGY**](https://github.com/onestardao/WFGY) project by **onestardao**. The 16-mode taxonomy, the numbering, and the `TXTOS.txt` reasoning layer are theirs, and they are MIT licensed upstream. This repository is an independent client for that map — it is **not affiliated with or endorsed by** the WFGY project.

Inspired by the `wfgy_llm_debugger` example in [Arindam200/awesome-ai-apps](https://github.com/Arindam200/awesome-ai-apps/tree/main/rag_apps/wfgy_llm_debugger).

---

## 📄 License

[MIT](LICENSE) © 2026 Tirth Rank. WFGY / Problem Map content is MIT licensed in its original repository — see [NOTICE.md](NOTICE.md) for full third-party attribution.

---

<div align="center">

**Fix the mode, not the symptom.**

[🌐 Live app](https://tirth1263.github.io/LLM-and-RAG-Debugger-WFGY-16-Problem-Map/) · [🗺️ WFGY Problem Map](https://github.com/onestardao/WFGY/tree/main/ProblemMap) · [⭐ Star this repo](https://github.com/tirth1263/LLM-and-RAG-Debugger-WFGY-16-Problem-Map)

</div>
