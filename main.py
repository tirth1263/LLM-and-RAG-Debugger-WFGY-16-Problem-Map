#!/usr/bin/env python3
"""
WFGY 16 Problem Map LLM Debugger (Nebius compatible)
====================================================

A 16-mode, map-based debugger that turns messy LLM / RAG bugs into reproducible
failure modes, each linked to a concrete fix in the WFGY Problem Map.

Paste a trace, a log, or a prompt / answer pair. The debugger returns the closest
Problem Map number (No.1 - No.16) plus the exact document to open and a first patch
to try.

The script is plain Python using the official OpenAI client and `requests`, so it
can call ANY OpenAI compatible chat completions API. For Nebius Token Factory you
only need to point the client at the Nebius endpoint and pick a Nebius model id.

Run it two ways
---------------
1. Notebook  : paste this whole file into a single Colab / Nebius / Jupyter cell.
2. Terminal  : `python main.py`

Install
-------
    pip install openai requests

Environment (all optional - the script asks interactively if unset)
-------------------------------------------------------------------
    OPENAI_API_KEY   / NEBIUS_API_KEY
    OPENAI_BASE_URL  e.g. https://api.tokenfactory.nebius.com/v1/
    OPENAI_MODEL     e.g. meta-llama/Meta-Llama-3.1-70B-Instruct

License: MIT. WFGY / Problem Map content is MIT licensed in the upstream repo.
"""

from __future__ import annotations

import os
import sys
from getpass import getpass

try:
    import requests
except ImportError:  # pragma: no cover - dependency guard
    sys.exit("Missing dependency. Run:  pip install openai requests")

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover - dependency guard
    sys.exit("Missing dependency. Run:  pip install openai requests")


# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #

APP_NAME = "WFGY 16 Problem Map LLM Debugger"
APP_VERSION = "1.0.0"

# Upstream WFGY assets. These are the two references the debugger reasons over.
TXTOS_URL = "https://raw.githubusercontent.com/onestardao/WFGY/main/OS/TXTOS.txt"
PROBLEM_MAP_URL = (
    "https://raw.githubusercontent.com/onestardao/WFGY/main/ProblemMap/README.md"
)
PROBLEM_MAP_HTML = "https://github.com/onestardao/WFGY/tree/main/ProblemMap"
PROBLEM_MAP_DOC_BASE = "https://github.com/onestardao/WFGY/blob/main/ProblemMap/"

# Sensible defaults. Nebius Token Factory speaks the OpenAI protocol.
DEFAULT_BASE_URL = "https://api.tokenfactory.nebius.com/v1/"
DEFAULT_MODEL = "meta-llama/Meta-Llama-3.1-70B-Instruct"

# How much of each reference we feed the model. The full TXT OS is large, and most
# models do not need all of it to route a bug to a number.
TXTOS_CHARS = 12000
PROBLEM_MAP_CHARS = 20000

REQUEST_TIMEOUT = 30
MAX_TOKENS = 900
TEMPERATURE = 0.2


# The canonical 16 modes. Kept locally so the tool still prints a usable map even
# if GitHub is unreachable. Doc filenames match the upstream ProblemMap directory.
PROBLEM_MAP = [
    (1, "Hallucination and chunk drift", "Retrieval returns wrong or irrelevant content", "hallucination.md"),
    (2, "Interpretation collapse", "Chunk is correct, reasoning is wrong", "retrieval-collapse.md"),
    (3, "Long reasoning chains", "Multi step tasks drift and never converge", "context-drift.md"),
    (4, "Bluffing and overconfidence", "Confident answers with no real support", "bluffing.md"),
    (5, "Semantic != embedding", "Cosine similarity does not match true meaning", "embedding-vs-semantic.md"),
    (6, "Logic collapse and recovery", "Chains hit dead ends and need controlled reset", "logic-collapse.md"),
    (7, "Memory breaks across sessions", "Lost threads and no continuity", "memory-coherence.md"),
    (8, "Debugging as a black box", "No visibility into retrieval and failure paths", "retrieval-traceability.md"),
    (9, "Entropy collapse", "Attention melts into incoherent output", "entropy-collapse.md"),
    (10, "Creative freeze", "Flat and literal outputs when you needed structure", "creative-freeze.md"),
    (11, "Symbolic collapse", "Abstract or logical prompts stop working", "symbolic-collapse.md"),
    (12, "Philosophical recursion", "Self reference loops and paradox traps", "philosophical-recursion.md"),
    (13, "Multi agent chaos", "Agents overwrite or misalign each other", "Multi-Agent_Problems.md"),
    (14, "Bootstrap ordering", "Services start before dependencies and quietly fail", "bootstrap-ordering.md"),
    (15, "Deployment deadlock", "Circular waits in infra and pipelines", "deployment-deadlock.md"),
    (16, "Pre deploy collapse", "Version skew or missing secrets on first call", "predeploy-collapse.md"),
]


# --------------------------------------------------------------------------- #
# Small console helpers
# --------------------------------------------------------------------------- #

def rule(char: str = "=", width: int = 74) -> str:
    return char * width


def banner() -> None:
    print(rule())
    print(f"  {APP_NAME}  v{APP_VERSION}")
    print("  Map any LLM / RAG bug to one of 16 reproducible failure modes.")
    print(rule())
    print()


def print_map() -> None:
    """Print the 16 mode map as a compact reference table."""
    print("WFGY Problem Map - 16 failure modes")
    print(rule("-"))
    for number, domain, symptom, _doc in PROBLEM_MAP:
        print(f"  No.{number:<3} {domain:<32} {symptom}")
    print(rule("-"))
    print(f"  Full map: {PROBLEM_MAP_HTML}")
    print()


def doc_url(number: int) -> str:
    """Return the upstream document URL for a Problem Map number."""
    for num, _domain, _symptom, doc in PROBLEM_MAP:
        if num == number:
            return PROBLEM_MAP_DOC_BASE + doc
    return PROBLEM_MAP_HTML


# --------------------------------------------------------------------------- #
# Step 1 - credentials
# --------------------------------------------------------------------------- #

def ask_credentials() -> tuple[str, str, str]:
    """Collect API key, base URL and model id from env vars or interactively."""
    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("NEBIUS_API_KEY") or ""
    if api_key:
        print("[ok] API key loaded from environment.")
    else:
        print("Step 1 of 3 - API key")
        print("  Input is hidden. Works with Nebius Token Factory, OpenAI, or any")
        print("  OpenAI compatible gateway.")
        api_key = getpass("  API key: ").strip()
        if not api_key:
            sys.exit("No API key provided. Exiting.")
    print()

    base_url = os.getenv("OPENAI_BASE_URL", "").strip()
    if base_url:
        print(f"[ok] Base URL from environment: {base_url}")
    else:
        print("Step 2 of 3 - Base URL")
        print(f"  Press Enter for Nebius Token Factory: {DEFAULT_BASE_URL}")
        print("  Type 'openai' to use the default OpenAI endpoint.")
        answer = input("  Base URL: ").strip()
        if answer.lower() == "openai":
            base_url = ""
        else:
            base_url = answer or DEFAULT_BASE_URL
    print()

    model = os.getenv("OPENAI_MODEL", "").strip()
    if model:
        print(f"[ok] Model from environment: {model}")
    else:
        print("Step 3 of 3 - Model id")
        print(f"  Press Enter for: {DEFAULT_MODEL}")
        model = input("  Model: ").strip() or DEFAULT_MODEL
    print()

    return api_key, base_url, model


def build_client(api_key: str, base_url: str) -> OpenAI:
    """Create an OpenAI client pointed at whichever endpoint the user chose."""
    if base_url:
        return OpenAI(api_key=api_key, base_url=base_url)
    return OpenAI(api_key=api_key)


# --------------------------------------------------------------------------- #
# Step 2 - download the WFGY references
# --------------------------------------------------------------------------- #

def fetch(url: str, limit: int) -> str:
    """Download a WFGY reference, truncated to `limit` characters.

    A failed download is not fatal. The debugger still works from the local
    16 mode table, it just loses some of the upstream nuance.
    """
    try:
        response = requests.get(url, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        text = response.text
        name = url.rsplit("/", 1)[-1]
        print(f"[ok] {name}  ({len(text):,} chars, using first {min(limit, len(text)):,})")
        return text[:limit]
    except Exception as exc:  # network, DNS, rate limit, anything
        print(f"[warn] Could not download {url}\n       {exc}")
        return ""


def load_references() -> tuple[str, str]:
    print("Downloading WFGY references ...")
    txtos = fetch(TXTOS_URL, TXTOS_CHARS)
    problem_map = fetch(PROBLEM_MAP_URL, PROBLEM_MAP_CHARS)
    if not txtos and not problem_map:
        print("[warn] Running with the built in 16 mode table only.")
    print()
    return txtos, problem_map


# --------------------------------------------------------------------------- #
# Step 3 - the prompts
# --------------------------------------------------------------------------- #

def local_map_text() -> str:
    return "\n".join(
        f"No.{n} | {domain} | {symptom} | doc: {doc}"
        for n, domain, symptom, doc in PROBLEM_MAP
    )


SYSTEM_PROMPT = """\
You are the WFGY Problem Map Debugger, a semantic firewall that sits in front of an
LLM or RAG application.

Your only job is to classify a reported bug into the WFGY Problem Map taxonomy of
16 reproducible failure modes, numbered No.1 through No.16, and then point the
engineer at the exact document and first patch.

Hard rules:
- Always choose exactly ONE primary number in the range No.1 to No.16.
- Never invent numbers outside that range and never merge or renumber modes.
- Add a secondary number only when the evidence genuinely supports a second mode.
- Diagnose before you prescribe. Quote the specific words in the report that drove
  your choice.
- Assume the engineer can only change prompts and call patterns. Do not propose
  infrastructure rewrites unless they explicitly asked for code level changes.
- If the report is too vague to route, say so plainly, pick the closest number, and
  list the exact evidence you would need to raise confidence.
- Be concrete and short. No marketing language. No claim that WFGY solves everything.

Answer using exactly this template and nothing else:

PRIMARY: No.X - <mode name>
SECONDARY: No.Y - <mode name>   (write "none" if there is no strong second)
CONFIDENCE: high | medium | low

WHY:
<2 to 4 sentences in plain language, quoting the evidence from the report.>

EVIDENCE:
- <signal from the report that points at the primary number>
- <second signal, or what is missing if the report is thin>

READ FIRST:
ProblemMap/<file>.md

FIRST PATCH:
1. <smallest concrete change to try, at the prompt or call pattern layer>
2. <second step>
3. <how to verify the bug is actually gone and not just hidden>
"""


def build_user_prompt(bug: str, txtos: str, problem_map: str) -> str:
    parts = [
        "Reference A - the canonical 16 mode table (authoritative numbering and "
        "document filenames):",
        local_map_text(),
    ]
    if problem_map:
        parts += [
            "",
            "Reference B - upstream WFGY Problem Map 1.0 README (excerpt):",
            problem_map,
        ]
    if txtos:
        parts += [
            "",
            "Reference C - WFGY TXT OS reasoning layer (excerpt). Use it to reason "
            "about semantic drift before you answer, do not quote it back:",
            txtos,
        ]
    parts += [
        "",
        rule("="),
        "BUG REPORT FROM THE ENGINEER:",
        rule("="),
        bug,
        rule("="),
        "",
        "Classify this bug now, using the required template.",
    ]
    return "\n".join(parts)


# --------------------------------------------------------------------------- #
# Step 4 - collect the bug and diagnose
# --------------------------------------------------------------------------- #

def read_bug() -> str:
    """Read a multi line bug report. A blank line submits."""
    print(rule("-"))
    print("Paste your bug: the prompt, the answer you got, retrieval traces, logs.")
    print("Type as many lines as you need, then press Enter on an EMPTY line to send.")
    print("Type 'map' on its own line to reprint the 16 modes, or 'quit' to exit.")
    print(rule("-"))

    lines: list[str] = []
    while True:
        try:
            line = input("| ")
        except EOFError:
            break
        stripped = line.strip().lower()
        if stripped == "quit" and not lines:
            return "quit"
        if stripped == "map" and not lines:
            print()
            print_map()
            continue
        if not line.strip():
            if lines:
                break
            print("  (nothing yet - paste your bug, or type 'quit')")
            continue
        lines.append(line)
    return "\n".join(lines).strip()


def diagnose(client: OpenAI, model: str, bug: str, txtos: str, problem_map: str) -> str:
    """Send one bug report to the model and return the raw diagnosis."""
    completion = client.chat.completions.create(
        model=model,
        temperature=TEMPERATURE,
        max_tokens=MAX_TOKENS,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(bug, txtos, problem_map)},
        ],
    )
    return (completion.choices[0].message.content or "").strip()


def extract_primary(diagnosis: str) -> int | None:
    """Pull the primary Problem Map number out of the model's answer."""
    for line in diagnosis.splitlines():
        if line.upper().startswith("PRIMARY"):
            digits = ""
            for char in line.split("No.", 1)[-1]:
                if char.isdigit():
                    digits += char
                elif digits:
                    break
            if digits and 1 <= int(digits) <= 16:
                return int(digits)
    return None


def show_diagnosis(diagnosis: str) -> None:
    print()
    print(rule())
    print("  DIAGNOSIS")
    print(rule())
    print(diagnosis)
    print(rule())

    number = extract_primary(diagnosis)
    if number:
        print(f"  Open next: {doc_url(number)}")
    else:
        print(f"  Open next: {PROBLEM_MAP_HTML}")
    print(rule())
    print()


# --------------------------------------------------------------------------- #
# Main loop
# --------------------------------------------------------------------------- #

def main() -> None:
    banner()
    print_map()

    api_key, base_url, model = ask_credentials()
    client = build_client(api_key, base_url)
    txtos, problem_map = load_references()

    endpoint = base_url or "https://api.openai.com/v1/ (default)"
    print(f"Endpoint : {endpoint}")
    print(f"Model    : {model}")
    print()

    while True:
        bug = read_bug()
        if not bug or bug == "quit":
            break

        print("\nDiagnosing ...")
        try:
            diagnosis = diagnose(client, model, bug, txtos, problem_map)
        except Exception as exc:
            print(f"\n[error] The API call failed: {exc}")
            print("        Check the API key, the base URL, and the model id.")
            print("        A wrong model id is the most common cause.\n")
            diagnosis = ""

        if diagnosis:
            show_diagnosis(diagnosis)

        again = input("Debug another bug? [Y/n]: ").strip().lower()
        print()
        if again in {"n", "no", "q", "quit"}:
            break

    print("Done. Fix the mode, not the symptom.")
    print(f"Full map: {PROBLEM_MAP_HTML}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted. Bye.")
