# Sample bug reports

Paste any of these into the debugger to see how routing works. Each one is written
the way a real bug lands in a channel: a symptom, a bit of trace, no diagnosis.

The expected number is the mode a well behaved model should land on. Treat it as a
sanity check for your prompt and model choice, not as a hard test.

---

### 1. Confident answer, wrong source — expect No.1

```
Our support RAG answers questions about the 2024 refund policy, but it keeps
citing chunks from the 2021 handbook. The retriever returns 5 chunks, top score
0.83, and 4 of them are from the archived doc. The answer reads fine and users
believe it. We reindexed twice, same result.
```

---

### 2. Right chunk, wrong conclusion — expect No.2

```
Retrieval is correct. I logged the chunks and the exact clause the user asked
about is chunk #2. But the model still answers "there is no cancellation window"
when the clause plainly says 14 days. Swapping the embedding model changed
nothing because the chunk was already right.
```

---

### 3. Agent forgets the goal halfway — expect No.3

```
Our planning agent runs about 12 tool calls. By step 7 it is refactoring a file
nobody asked about, and by step 10 it has forgotten the original ticket. Every
individual step looks reasonable in isolation. It never converges, it just runs
until the step cap.
```

---

### 4. Cites a section that does not exist — expect No.4

```
The model answers with total confidence and invents citations. It quoted
"Section 4.2 of the SLA" in a doc that only has 3 sections. No hedging, no
"I am not sure". When I ask it to double check, it doubles down.
```

---

### 5. Cosine says similar, meaning says opposite — expect No.5

```
Query "how do I cancel my plan" pulls the chunk about "how to renew your plan"
at 0.91 cosine. They are lexically almost identical and semantically opposite.
Our top-k is full of near-duplicate marketing copy while the actual cancellation
page sits at rank 14.
```

---

### 6. Chain hits a dead end and loops — expect No.6

```
Mid chain the model contradicts itself, then tries to justify the contradiction
instead of backing out. It gets stuck restating the same wrong intermediate
result three times. There is no clean way to reset it to the last good step.
```

---

### 7. Nothing survives the session boundary — expect No.7

```
Users say the assistant "forgets everything". Within one session it is fine.
Come back tomorrow and it has no idea about the account, the plan, or the
decision we made yesterday. We store the transcript but the model never sees the
part that mattered.
```

---

### 8. No idea why it failed — expect No.8

```
Roughly 1 in 10 answers is wrong and we cannot tell why. We log the final answer
only. No chunk ids, no scores, no prompt snapshot. When a user reports a bad
answer we cannot reproduce it, so every fix is a guess.
```

---

### 9. Output melts into mush — expect No.9

```
Long documents make the output degrade. First two paragraphs are coherent, then
it starts repeating phrases, drops into fragments, and the last third is barely
grammatical. Shorter inputs are fine. Same prompt, same model.
```

---

### 10. Flat, literal, useless — expect No.10

```
I asked for three distinct product naming directions with different tones. I got
three near-identical bland options that are basically the input restated. Raising
temperature just added typos, not ideas. It refuses to commit to a structure.
```

---

### 11. Abstract prompts stop working — expect No.11

```
Concrete questions work. The moment the prompt involves a formal rule, a nested
condition, or symbolic notation, the answer collapses into vague prose. It cannot
carry "if A implies B, and not B" through two steps without dropping a term.
```

---

### 12. Self reference loop — expect No.12

```
When the agent is asked to critique its own critique, it spirals. Each pass adds
a meta layer instead of resolving anything, and it ends up reasoning about
whether it is reasoning correctly. It never terminates on its own.
```

---

### 13. Agents overwrite each other — expect No.13

```
Three agents share a scratchpad. The researcher writes findings, the planner
overwrites the same key, and the writer reads a half-updated state. Final output
mixes two incompatible plans. Order of completion changes the result every run.
```

---

### 14. Service starts before its dependency — expect No.14

```
On cold start the API comes up before the vector store finishes loading. First
requests return empty retrieval and the model answers from nothing. Nobody
errors. Thirty seconds later everything is fine, so it never shows in tests.
```

---

### 15. Circular wait in the pipeline — expect No.15

```
The ingestion job waits for the index job to report ready, and the index job
waits for ingestion to publish a manifest. Neither times out. The deploy just
hangs and we restart it by hand every time.
```

---

### 16. Works locally, dies on first prod call — expect No.16

```
Deployed to staging and the very first request 401s. The secret is set but the
container picked up the old value from a cached layer, and the client library is
a minor version behind what the endpoint expects. Local is green, prod is red.
```
