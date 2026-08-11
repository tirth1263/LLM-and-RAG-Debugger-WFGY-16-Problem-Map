# Notice — third party content and attribution

This project is licensed under the [MIT License](LICENSE).

## Upstream WFGY project

The 16-mode failure taxonomy, its numbering (`No.1` – `No.16`), the document
filenames under `ProblemMap/`, and the `TXTOS.txt` reasoning layer originate
from the open source **WFGY** project:

- Repository: https://github.com/onestardao/WFGY
- Problem Map 1.0: https://github.com/onestardao/WFGY/tree/main/ProblemMap
- Licensed MIT in that repository.

This debugger is an **independent client** for that map. It is not affiliated
with, endorsed by, or sponsored by the WFGY project or its authors.

At runtime the CLI downloads two files directly from the upstream repository:

| File | URL |
|---|---|
| `TXTOS.txt` | `https://raw.githubusercontent.com/onestardao/WFGY/main/OS/TXTOS.txt` |
| `ProblemMap/README.md` | `https://raw.githubusercontent.com/onestardao/WFGY/main/ProblemMap/README.md` |

They are read into memory for the duration of the session and are not
redistributed as part of this repository.

## Inspiration

The structure of the single-cell demo follows the `wfgy_llm_debugger` example in
[Arindam200/awesome-ai-apps](https://github.com/Arindam200/awesome-ai-apps/tree/main/rag_apps/wfgy_llm_debugger),
MIT licensed.

## Trademarks

Nebius, Nebius Token Factory, OpenAI, Groq, Together and Ollama are trademarks
of their respective owners. This project is not affiliated with any of them; it
simply speaks the OpenAI-compatible chat completions protocol.
