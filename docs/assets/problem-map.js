/* ---------------------------------------------------------------------------
 * WFGY Problem Map - 16 reproducible failure modes.
 *
 * This single dataset drives three things on the page:
 *   1. the browsable 16 mode map
 *   2. the offline heuristic classifier (the `signals` weights)
 *   3. the prompt that gets sent to a live OpenAI compatible endpoint
 *
 * Numbering and doc filenames mirror the upstream repo exactly. Do not renumber.
 * https://github.com/onestardao/WFGY/tree/main/ProblemMap
 * ------------------------------------------------------------------------- */

const DOC_BASE = 'https://github.com/onestardao/WFGY/blob/main/ProblemMap/';
const MAP_HOME = 'https://github.com/onestardao/WFGY/tree/main/ProblemMap';

/* Layer tags used upstream: IN = input/retrieval, RE = reasoning,
   ST = state/memory, OP = ops/deploy. */
const LAYERS = {
  IN: { name: 'Input & retrieval', hue: 'in' },
  RE: { name: 'Reasoning', hue: 're' },
  ST: { name: 'State & memory', hue: 'st' },
  OP: { name: 'Ops & deploy', hue: 'op' },
};

const PROBLEM_MAP = [
  {
    no: 1,
    layer: 'IN',
    name: 'Hallucination and chunk drift',
    symptom: 'Retrieval returns wrong or irrelevant content',
    doc: 'hallucination.md',
    blurb:
      'The generator is doing its job. The context it was handed is simply the wrong text. The answer looks fluent because the model faithfully summarised material that should never have been retrieved.',
    tell: 'Inspect the retrieved chunks. If a human would not have used them to answer, the bug is here and not in the prompt.',
    patch: [
      'Log the retrieved chunk ids, scores and source documents for one failing query.',
      'Check for stale or duplicated documents in the index before touching the prompt.',
      'Require the answer to quote the exact chunk it used, then reject answers with no quote.',
    ],
    signals: [
      { re: 'wrong (chunk|document|doc|source|page)', w: 5, label: 'retrieval returned the wrong source' },
      { re: 'irrelevant (chunk|content|result|context)', w: 5, label: 'irrelevant content retrieved' },
      { re: 'hallucinat', w: 4, label: 'hallucination reported' },
      { re: '(stale|outdated|archived|old) (doc|document|handbook|policy|version|index)', w: 5, label: 'stale documents in the index' },
      { re: 'cit(es|ing|ed) (chunks?|the wrong|from)', w: 4, label: 'citing the wrong material' },
      { re: 'reindex', w: 3, label: 'reindexing did not help' },
      { re: 'made up|fabricat|invent(ed|s)? (facts|content|details)', w: 3, label: 'fabricated content' },
      { re: 'chunk drift', w: 6, label: 'explicit chunk drift' },
    ],
  },
  {
    no: 2,
    layer: 'RE',
    name: 'Interpretation collapse',
    symptom: 'Chunk is correct, reasoning is wrong',
    doc: 'retrieval-collapse.md',
    blurb:
      'Retrieval already won. The right passage is sitting in the context window and the model still draws the opposite conclusion. Swapping embedding models here is wasted work.',
    tell: 'You can point at the exact line in the context that contradicts the answer.',
    patch: [
      'Force an extract-then-answer split: first quote the governing sentence, then reason from the quote only.',
      'Ask the model to state which retrieved chunk it is relying on, by id, before it concludes.',
      'Re-run the same context with the reasoning step isolated to confirm retrieval was never the problem.',
    ],
    signals: [
      { re: '(chunk|context|passage|clause|document) is (right|correct)', w: 7, label: 'correct chunk, wrong answer' },
      { re: 'retrieval (is|was|looks) (fine|correct|right|good)', w: 7, label: 'retrieval verified good' },
      { re: 'right (chunk|context|passage|doc)', w: 6, label: 'right context retrieved' },
      { re: 'still (answers|says|claims|concludes|gets it wrong)', w: 4, label: 'still wrong despite good context' },
      { re: 'misread|misinterpret|opposite conclusion|contradicts the (clause|text|doc)', w: 5, label: 'text misread' },
      { re: 'logic is wrong|reasoning is wrong', w: 6, label: 'reasoning identified as the fault' },
      { re: 'changed nothing|no difference|same result', w: 2, label: 'retrieval changes had no effect' },
    ],
  },
  {
    no: 3,
    layer: 'RE',
    name: 'Long reasoning chains',
    symptom: 'Multi step tasks drift and never converge',
    doc: 'context-drift.md',
    blurb:
      'Every individual step looks defensible. The trajectory does not. The original objective decays a little at each hop until the agent is solving a different problem.',
    tell: 'Step 1 matches the ticket. Step 9 does not, and no single step is where it went wrong.',
    patch: [
      'Restate the original objective verbatim at the top of every step, not just the first.',
      'Add a cheap convergence check: after each step, ask whether this moved closer to the stated goal.',
      'Cap the chain and force an explicit "I am off track, resetting to step N" branch.',
    ],
    signals: [
      { re: 'multi[- ]?step|many steps|\\d+ (tool calls|steps|iterations)', w: 5, label: 'long multi step run' },
      { re: 'drift', w: 4, label: 'drift reported' },
      { re: 'never converge|does not converge|runs until|step cap|loops? (forever|until)', w: 5, label: 'never converges' },
      { re: 'forgot(ten)? the (original|goal|ticket|task|objective|request)', w: 6, label: 'original goal lost' },
      { re: 'by step \\d+|halfway|midway', w: 4, label: 'degrades partway through the chain' },
      { re: 'each step (looks|seems) (fine|reasonable|ok)', w: 6, label: 'locally fine, globally wrong' },
      { re: 'long (chain|conversation|context|task)', w: 3, label: 'long chain' },
    ],
  },
  {
    no: 4,
    layer: 'RE',
    name: 'Bluffing and overconfidence',
    symptom: 'Confident answers with no real support',
    doc: 'bluffing.md',
    blurb:
      'The failure is not the wrong fact, it is the missing uncertainty. The model presents an unsupported claim with the same tone it uses for a sourced one, so reviewers stop checking.',
    tell: 'Ask it to double check and it doubles down instead of hedging.',
    patch: [
      'Require a support field on every claim: quoted evidence, or the literal string "no support in context".',
      'Make "I could not find this in the provided material" an explicitly rewarded answer in the prompt.',
      'Reject any citation whose section or id does not exist in the supplied context.',
    ],
    signals: [
      { re: 'confident|confidently|certainty|no hedg', w: 5, label: 'unwarranted confidence' },
      { re: 'invent(ed|s)? (citation|source|section|reference)|fake (citation|source)', w: 6, label: 'invented citations' },
      { re: 'cited? .{0,20}(section|clause|page) .{0,12}(that )?(does ?n.t exist|not exist)', w: 7, label: 'cited a nonexistent section' },
      { re: 'doubles? down|insists|refuses to admit', w: 6, label: 'doubles down when challenged' },
      { re: 'no (real )?(support|evidence|basis|grounding)', w: 5, label: 'claims without support' },
      { re: 'bluff', w: 6, label: 'bluffing' },
      { re: 'never says (i don.t know|it does ?n.t know)', w: 4, label: 'never admits uncertainty' },
    ],
  },
  {
    no: 5,
    layer: 'IN',
    name: 'Semantic is not embedding',
    symptom: 'Cosine similarity does not match true meaning',
    doc: 'embedding-vs-semantic.md',
    blurb:
      'Vector distance is measuring surface form, not intent. Two passages that share vocabulary can mean opposite things, and the retriever cheerfully ranks the opposite one first.',
    tell: 'The wrong chunk scores higher than the right one, and you can see why lexically.',
    patch: [
      'Print the top-k with scores and eyeball where the correct chunk actually ranks.',
      'Add a rerank or a metadata filter so intent, not vocabulary overlap, decides the order.',
      'Test with query pairs that are lexically close but semantically opposite, such as cancel versus renew.',
    ],
    signals: [
      // A bare "vector store" mention is generic RAG vocabulary, not evidence of
      // a semantic/embedding mismatch, so it does not earn a signal on its own.
      { re: 'cosine|embedding|similarity score|vector (search|similarity|distance)', w: 5, label: 'embedding similarity involved' },
      { re: '0\\.\\d{2}', w: 2, label: 'similarity scores in the report' },
      { re: 'semantically opposite|opposite meaning|means the opposite', w: 7, label: 'lexically close but opposite meaning' },
      { re: 'top[- ]?k|rank(s|ed|ing)? \\d+|reranker?', w: 4, label: 'ranking problem' },
      { re: 'near[- ]?duplicate|almost identical|lexically', w: 5, label: 'near duplicate text dominates' },
      { re: 'similar but|scores? higher than', w: 4, label: 'wrong chunk outranks the right one' },
    ],
  },
  {
    no: 6,
    layer: 'RE',
    name: 'Logic collapse and recovery',
    symptom: 'Chains hit dead ends and need controlled reset',
    doc: 'logic-collapse.md',
    blurb:
      'The chain reached a contradiction and, instead of backing out, started defending it. Without a reset path the model burns the rest of its budget rationalising a broken intermediate result.',
    tell: 'It contradicts itself, then justifies the contradiction rather than abandoning it.',
    patch: [
      'Checkpoint intermediate conclusions so you have a known-good step to roll back to.',
      'Add an explicit abort clause: on contradiction, discard the branch and restate the last verified fact.',
      'Detect repeated restatements of the same intermediate result and cut the chain there.',
    ],
    signals: [
      { re: 'contradict', w: 6, label: 'self contradiction' },
      { re: 'dead[- ]?end', w: 6, label: 'dead end reached' },
      { re: 'stuck|spins?|repeat(s|ing) the same', w: 5, label: 'stuck repeating itself' },
      { re: 'reset|roll ?back|recover|back out', w: 5, label: 'needs a controlled reset' },
      { re: 'justif(y|ies|ying) (the|its)|defends? (the|its) (mistake|error|contradiction)', w: 6, label: 'defends the broken step' },
      { re: 'wrong intermediate|bad (step|branch)', w: 5, label: 'broken intermediate result' },
    ],
  },
  {
    no: 7,
    layer: 'ST',
    name: 'Memory breaks across sessions',
    symptom: 'Lost threads and no continuity',
    doc: 'memory-coherence.md',
    blurb:
      'Inside one session everything holds. Across the boundary the thread is gone, because the transcript is stored but the part that actually mattered never makes it back into the context.',
    tell: 'Fine today, amnesiac tomorrow, with the history sitting in a database nobody reads back.',
    patch: [
      'Separate raw transcript storage from the decisions and commitments worth replaying.',
      'Write a compact state summary at session end and inject it at session start.',
      'Verify by asking, in a fresh session, about a decision made in the previous one.',
    ],
    signals: [
      { re: 'across sessions?|new session|next (day|session)|come back (tomorrow|later)', w: 7, label: 'breaks at the session boundary' },
      { re: 'forgets everything|no (memory|continuity)|loses? (context|the thread|history)', w: 6, label: 'no continuity' },
      { re: 'within one session (it is|its|it.s) fine|fine in (one|a single) session', w: 7, label: 'fine within a session' },
      { re: 'remember(s|ed)? (nothing|the account|yesterday)', w: 4, label: 'cross session recall failure' },
      { re: 'store the transcript|we log the (chat|conversation)', w: 4, label: 'history stored but unused' },
    ],
  },
  {
    no: 8,
    layer: 'IN',
    name: 'Debugging as a black box',
    symptom: 'No visibility into retrieval and failure paths',
    doc: 'retrieval-traceability.md',
    blurb:
      'You cannot fix what you cannot reproduce. With only the final answer logged, every proposed fix is a guess and every regression is invisible until a user complains again.',
    tell: 'A user reports a bad answer and you cannot reconstruct what the model saw.',
    patch: [
      'Log a trace id, the prompt snapshot, chunk ids and scores for every request.',
      'Make one failing case reproducible end to end before changing anything else.',
      'Keep a small regression set of real failures and replay it on every prompt change.',
    ],
    signals: [
      { re: 'cannot (tell|reproduce|debug|see) why|no idea why|can.?t reproduce', w: 7, label: 'failures are not reproducible' },
      { re: 'black box', w: 7, label: 'black box debugging' },
      { re: 'no (visibility|logs|logging|trace|tracing|observability)', w: 6, label: 'no observability' },
      { re: 'log (the )?(final )?answer only|only log', w: 6, label: 'only the final answer is logged' },
      { re: 'every fix is a guess|guessing|trial and error', w: 5, label: 'fixes are guesswork' },
      { re: '1 in \\d+|intermittent|sometimes wrong|flaky', w: 3, label: 'intermittent failures' },
    ],
  },
  {
    no: 9,
    layer: 'ST',
    name: 'Entropy collapse',
    symptom: 'Attention melts into incoherent output',
    doc: 'entropy-collapse.md',
    blurb:
      'Output quality decays as a function of length. The opening is clean, the middle repeats, and the tail degenerates into fragments. Short inputs never show it.',
    tell: 'Coherence is a function of position in the output, not of the question.',
    patch: [
      'Reproduce with the same prompt at two input lengths to confirm length is the variable.',
      'Chunk the task and generate in bounded sections with a fixed schema per section.',
      'Cut the input to what is actually needed rather than stuffing the window.',
    ],
    signals: [
      { re: 'repeat(s|ing)? (phrases|itself|the same (words|phrase))', w: 6, label: 'repetition loops' },
      { re: 'incoherent|gibberish|barely grammatical|garbled|degenerat', w: 6, label: 'incoherent output' },
      { re: 'long (document|input|context|prompt)s?', w: 4, label: 'triggered by long input' },
      { re: 'degrade|falls apart|gets worse (as|the longer)', w: 5, label: 'quality decays with length' },
      { re: 'last (third|part|paragraphs?)|towards? the end', w: 5, label: 'the tail of the output breaks' },
      { re: 'shorter inputs? (are|is) fine', w: 6, label: 'short inputs are fine' },
    ],
  },
  {
    no: 10,
    layer: 'RE',
    name: 'Creative freeze',
    symptom: 'Flat and literal outputs when you needed structure',
    doc: 'creative-freeze.md',
    blurb:
      'You asked for range and got the input restated three times. Turning temperature up adds noise, not ideas, because the constraint is structural rather than stochastic.',
    tell: 'The variants differ in wording and not in direction.',
    patch: [
      'Name the axes of variation explicitly: tone, audience, form, risk level.',
      'Require each option to state how it differs from the previous one before writing it.',
      'Give one concrete worked example of the range you want instead of asking for creativity.',
    ],
    signals: [
      { re: '\\bflat\\b|bland|generic|boring|literal', w: 5, label: 'flat output' },
      { re: 'near[- ]?identical|basically the same|all (three|the options) (are|look) the same', w: 6, label: 'variants are not distinct' },
      { re: 'temperature', w: 4, label: 'temperature tuning tried' },
      { re: 'restat(es|ing|ed) the (input|prompt|question)', w: 6, label: 'restates the input' },
      { re: 'creativ|brainstorm|naming|distinct (options|directions|ideas)', w: 4, label: 'creative task' },
      { re: 'no structure|refuses to commit', w: 4, label: 'no structural commitment' },
    ],
  },
  {
    no: 11,
    layer: 'RE',
    name: 'Symbolic collapse',
    symptom: 'Abstract or logical prompts stop working',
    doc: 'symbolic-collapse.md',
    blurb:
      'Concrete questions land, formal ones do not. The moment a prompt carries nested conditions or symbolic notation, terms start dropping out between steps.',
    tell: 'It cannot carry a two step formal implication without losing a variable.',
    patch: [
      'Force the model to restate every symbol and its binding before applying any rule.',
      'Convert the formal statement into a small table of concrete cases and reason over the table.',
      'Check each step for dropped terms rather than only checking the final answer.',
    ],
    signals: [
      { re: 'abstract|symbolic|formal (rule|logic|notation)|notation', w: 6, label: 'symbolic or abstract prompt' },
      { re: 'nested (condition|rule|if)|if [a-z] (implies|then)|implies', w: 6, label: 'nested logical conditions' },
      { re: 'drops? (a )?(term|variable|condition)', w: 6, label: 'terms dropped between steps' },
      { re: 'concrete (questions?|prompts?) works?', w: 6, label: 'concrete works, abstract does not' },
      { re: 'vague prose|collapses into', w: 4, label: 'formal prompt degrades to prose' },
      { re: 'math|proof|theorem|constraint solving', w: 3, label: 'formal reasoning task' },
    ],
  },
  {
    no: 12,
    layer: 'RE',
    name: 'Philosophical recursion',
    symptom: 'Self reference loops and paradox traps',
    doc: 'philosophical-recursion.md',
    blurb:
      'Asked to reason about its own reasoning, the model adds a meta layer per pass instead of resolving anything, and there is no natural stopping condition.',
    tell: 'Each pass is about the previous pass. Nothing bottoms out.',
    patch: [
      'Bound the meta depth explicitly: one critique pass, then a decision, no further layers.',
      'Force the final pass to output a concrete artifact rather than another evaluation.',
      'Add a termination rule the model must check before starting another round.',
    ],
    signals: [
      { re: 'self[- ]?refer|recursi|meta[- ]?(layer|level|critique)', w: 7, label: 'self reference or recursion' },
      { re: 'critique of (its|the) (own )?critique|reasoning about (its|whether it is) reasoning', w: 7, label: 'reasoning about its own reasoning' },
      { re: 'paradox|infinite (loop|regress)|spirals?', w: 6, label: 'paradox or infinite regress' },
      { re: 'never terminates|does ?n.t (stop|terminate)|no stopping', w: 5, label: 'no termination condition' },
      { re: 'philosoph', w: 4, label: 'philosophical framing' },
    ],
  },
  {
    no: 13,
    layer: 'ST',
    name: 'Multi agent chaos',
    symptom: 'Agents overwrite or misalign each other',
    doc: 'Multi-Agent_Problems.md',
    blurb:
      'Shared mutable state with no ownership. Two agents write the same key, a third reads it half updated, and the final output blends two incompatible plans.',
    tell: 'Completion order changes the result. Run it twice and get two answers.',
    patch: [
      'Give every shared key exactly one writer and make the rest read only.',
      'Version the shared state so a stale read is detectable instead of silent.',
      'Have each agent declare what it read and what it wrote in its output.',
    ],
    signals: [
      { re: 'multi[- ]?agent|agents? (overwrite|conflict|disagree)|several agents', w: 7, label: 'multiple agents involved' },
      { re: 'shared (state|scratchpad|memory|key|blackboard)', w: 6, label: 'shared mutable state' },
      { re: 'overwrit', w: 6, label: 'state overwritten' },
      { re: 'order of (completion|execution)|race condition|non[- ]?deterministic|different (result|answer) every run', w: 6, label: 'order dependent results' },
      { re: '(researcher|planner|writer|supervisor|worker) agent|handoff', w: 4, label: 'agent roles described' },
      { re: 'incompatible|mixes two|misalign', w: 4, label: 'incompatible outputs merged' },
    ],
  },
  {
    no: 14,
    layer: 'OP',
    name: 'Bootstrap ordering',
    symptom: 'Services start before dependencies and quietly fail',
    doc: 'bootstrap-ordering.md',
    blurb:
      'A cold start race. The API accepts traffic before the index or store is ready, so the first requests are answered from nothing and nobody raises an error.',
    tell: 'Broken for the first N seconds after start, healthy forever after, invisible in tests.',
    patch: [
      'Add a real readiness probe that fails until the dependency is genuinely loaded.',
      'Make empty retrieval a hard error at startup instead of a silently empty context.',
      'Reproduce by hitting the service immediately on cold start, not after warm up.',
    ],
    signals: [
      { re: 'cold start|on (startup|boot)|first requests?|startup', w: 6, label: 'cold start behaviour' },
      { re: 'before (the )?(dependency|dependencies|index|store|db|database) (is|are|finish)', w: 7, label: 'starts before dependencies are ready' },
      { re: 'empty (retrieval|index|result|context)', w: 5, label: 'empty retrieval at boot' },
      { re: 'nobody errors|no error|quietly|silently', w: 5, label: 'fails silently' },
      { re: '(thirty|30|a few) seconds later|then everything is fine|works after', w: 5, label: 'self heals after warm up' },
      { re: 'readiness|health check|liveness', w: 5, label: 'readiness probe concern' },
    ],
  },
  {
    no: 15,
    layer: 'OP',
    name: 'Deployment deadlock',
    symptom: 'Circular waits in infra and pipelines',
    doc: 'deployment-deadlock.md',
    blurb:
      'Two jobs each waiting for the other to publish a signal. No timeout, no error, just a pipeline that hangs until somebody restarts it by hand.',
    tell: 'A waits for B, B waits for A, and neither ever times out.',
    patch: [
      'Draw the actual wait graph and find the cycle before changing any config.',
      'Break the cycle with a one directional dependency or a bootstrap seed artifact.',
      'Give every wait a timeout that fails loudly rather than hanging forever.',
    ],
    signals: [
      { re: 'deadlock|circular (wait|dependency)|waits? for .{0,30} waits? for', w: 8, label: 'circular wait' },
      // \b matters here: an unanchored "hang" also matches inside "changed".
      { re: '\\bhangs?\\b|never (finishes|completes|times out)|no timeout', w: 6, label: 'pipeline hangs with no timeout' },
      { re: 'restart it by hand|manual restart|we restart', w: 5, label: 'manual restart required' },
      { re: 'pipeline|ci/?cd|deploy(ment)? job|ingestion job', w: 4, label: 'pipeline or deploy job' },
      { re: 'each other|mutual', w: 3, label: 'mutual dependency' },
    ],
  },
  {
    no: 16,
    layer: 'OP',
    name: 'Pre deploy collapse',
    symptom: 'Version skew or missing secrets on first call',
    doc: 'predeploy-collapse.md',
    blurb:
      'The environment, not the code, is the bug. A stale cached secret or a client one minor version behind the endpoint kills the very first production request while local stays green.',
    tell: 'Works locally, fails on the first real call, and the diff contains nothing relevant.',
    patch: [
      'Print the resolved config fingerprint at boot: endpoint, model id, key prefix, client version.',
      'Fail fast at startup on a missing or malformed secret rather than at first request.',
      'Pin the client version and assert compatibility with the endpoint before serving traffic.',
    ],
    signals: [
      { re: 'works locally|local is (green|fine)|only (in|on) (prod|production|staging)', w: 7, label: 'local works, deployed does not' },
      { re: '\\b401|\\b403|unauthori[sz]ed|invalid api key|authentication failed', w: 6, label: 'auth failure on deploy' },
      { re: 'secret|env(ironment)? var|credential|api key .{0,20}(missing|wrong|stale|cached)', w: 6, label: 'secret or env var problem' },
      { re: 'version (skew|mismatch)|minor version behind|out of date (client|sdk|library)', w: 7, label: 'client / endpoint version skew' },
      { re: 'cached layer|stale (config|value|image)|old value', w: 5, label: 'stale cached configuration' },
      { re: 'first (request|call) (fails|401)|very first', w: 6, label: 'fails on the very first call' },
    ],
  },
];

/* Sample bugs. Kept in sync with examples/sample_bugs.md in the repo. */
const SAMPLES = [
  {
    label: 'Cites the 2021 handbook',
    expect: 1,
    text: `Our support RAG answers questions about the 2024 refund policy, but it keeps citing chunks from the 2021 handbook. The retriever returns 5 chunks, top score 0.83, and 4 of them are from the archived doc. The answer reads fine and users believe it. We reindexed twice, same result.`,
  },
  {
    label: 'Right chunk, wrong answer',
    expect: 2,
    text: `Retrieval is correct. I logged the chunks and the exact clause the user asked about is chunk #2. But the model still answers "there is no cancellation window" when the clause plainly says 14 days. Swapping the embedding model changed nothing because the chunk was already right.`,
  },
  {
    label: 'Agent forgets the ticket',
    expect: 3,
    text: `Our planning agent runs about 12 tool calls. By step 7 it is refactoring a file nobody asked about, and by step 10 it has forgotten the original ticket. Every individual step looks reasonable in isolation. It never converges, it just runs until the step cap.`,
  },
  {
    label: 'Invented citation',
    expect: 4,
    text: `The model answers with total confidence and invents citations. It quoted "Section 4.2 of the SLA" in a doc that only has 3 sections. No hedging, no "I am not sure". When I ask it to double check, it doubles down.`,
  },
  {
    label: 'Cancel vs renew',
    expect: 5,
    text: `Query "how do I cancel my plan" pulls the chunk about "how to renew your plan" at 0.91 cosine. They are lexically almost identical and semantically opposite. Our top-k is full of near-duplicate marketing copy while the actual cancellation page sits at rank 14.`,
  },
  {
    label: 'Amnesia overnight',
    expect: 7,
    text: `Users say the assistant "forgets everything". Within one session it is fine. Come back tomorrow and it has no idea about the account, the plan, or the decision we made yesterday. We store the transcript but the model never sees the part that mattered.`,
  },
  {
    label: 'Cannot reproduce it',
    expect: 8,
    text: `Roughly 1 in 10 answers is wrong and we cannot tell why. We log the final answer only. No chunk ids, no scores, no prompt snapshot. When a user reports a bad answer we cannot reproduce it, so every fix is a guess.`,
  },
  {
    label: 'Output melts on long docs',
    expect: 9,
    text: `Long documents make the output degrade. First two paragraphs are coherent, then it starts repeating phrases, drops into fragments, and the last third is barely grammatical. Shorter inputs are fine. Same prompt, same model.`,
  },
  {
    label: 'Agents overwrite state',
    expect: 13,
    text: `Three agents share a scratchpad. The researcher writes findings, the planner overwrites the same key, and the writer reads a half-updated state. Final output mixes two incompatible plans. Order of completion changes the result every run.`,
  },
  {
    label: 'Empty index on cold start',
    expect: 14,
    text: `On cold start the API comes up before the vector store finishes loading. First requests return empty retrieval and the model answers from nothing. Nobody errors. Thirty seconds later everything is fine, so it never shows in tests.`,
  },
  {
    label: 'Pipeline hangs forever',
    expect: 15,
    text: `The ingestion job waits for the index job to report ready, and the index job waits for ingestion to publish a manifest. Neither times out. The deploy just hangs and we restart it by hand every time.`,
  },
  {
    label: '401 on the first prod call',
    expect: 16,
    text: `Deployed to staging and the very first request 401s. The secret is set but the container picked up the old value from a cached layer, and the client library is a minor version behind what the endpoint expects. Local is green, prod is red.`,
  },
];
