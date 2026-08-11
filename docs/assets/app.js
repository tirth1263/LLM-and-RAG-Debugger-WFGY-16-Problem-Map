/* ---------------------------------------------------------------------------
 * WFGY 16 Problem Map — LLM & RAG Debugger (browser client)
 *
 * Two engines share one taxonomy:
 *   offline — a transparent weighted-signal classifier, runs entirely locally
 *   live    — the same structured prompt sent to any OpenAI compatible endpoint
 *
 * The API key is held in a module-scoped variable only. It is never written to
 * localStorage, sessionStorage or a cookie, and there is no backend to leak it to.
 * ------------------------------------------------------------------------- */

(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  let engine = 'offline';

  /* --------------------------------------------------------------------- */
  /* Offline engine                                                         */
  /* --------------------------------------------------------------------- */

  /**
   * Score a bug report against all 16 modes.
   * Each mode carries weighted regex signals. A mode's score is the sum of the
   * weights of the signals it matched — we deliberately do NOT reward the same
   * signal twice, so a report that repeats one phrase cannot inflate its number.
   */
  function classify(text) {
    const hay = text.toLowerCase();

    const scored = PROBLEM_MAP.map((mode) => {
      const hits = [];
      let score = 0;

      for (const sig of mode.signals) {
        let re;
        try {
          re = new RegExp(sig.re, 'i');
        } catch (_) {
          continue; // a malformed pattern must never break the whole run
        }
        const m = hay.match(re);
        if (m) {
          score += sig.w;
          hits.push({ label: sig.label, phrase: m[0].trim(), w: sig.w });
        }
      }

      // Two independent signals agreeing is much stronger evidence than one
      // long signal firing, so reward breadth of evidence.
      if (hits.length >= 2) score += (hits.length - 1) * 2;

      hits.sort((a, b) => b.w - a.w);
      return { mode, score, hits };
    });

    scored.sort((a, b) => b.score - a.score || a.mode.no - b.mode.no);
    return scored;
  }

  function confidenceOf(scored) {
    const top = scored[0];
    const second = scored[1];
    if (!top || top.score === 0) return 'low';

    const gap = top.score - (second ? second.score : 0);
    if (top.score >= 12 && gap >= 5) return 'high';
    if (top.score >= 7 && gap >= 2) return 'medium';
    return 'low';
  }

  function offlineDiagnose(text) {
    const scored = classify(text);
    const top = scored[0];

    if (!top || top.score === 0) {
      return { unmatched: true, scored };
    }

    const second = scored[1];
    // Only surface a secondary when it is genuinely competitive.
    const showSecond = second && second.score > 0 && second.score >= top.score * 0.55;

    return {
      unmatched: false,
      confidence: confidenceOf(scored),
      primary: top,
      secondary: showSecond ? second : null,
      scored,
    };
  }

  /* --------------------------------------------------------------------- */
  /* Rendering                                                              */
  /* --------------------------------------------------------------------- */

  function block(title) {
    const b = el('div', 'res-block');
    b.appendChild(el('h4', null, title));
    return b;
  }

  function docLinkFor(mode) {
    const a = el('a', 'doc-link', `ProblemMap/${mode.doc} ↗`);
    a.href = DOC_BASE + mode.doc;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }

  function renderOffline(result) {
    const out = $('#output');
    out.innerHTML = '';

    if (result.unmatched) {
      const warn = el('div', 'alert');
      warn.innerHTML =
        '<b>Not enough signal to route this.</b>' +
        '<p>The offline engine matches concrete symptoms, and this report did not contain any. ' +
        'That is a finding in itself — usually <b>No.8, debugging as a black box</b>. Add:</p>' +
        '<ul>' +
        '<li>what you asked and what you got back, verbatim</li>' +
        '<li>whether the retrieved chunks were actually correct</li>' +
        '<li>whether it fails always, intermittently, or only after a deploy</li>' +
        '</ul>';
      out.appendChild(warn);
      out.appendChild(docLinkFor(PROBLEM_MAP[7]));
      return;
    }

    const { primary, secondary, confidence, scored } = result;
    const mode = primary.mode;

    // header ------------------------------------------------------------
    const head = el('div', 'result-head');
    head.appendChild(el('span', 'no-badge', `No.${mode.no}`));
    head.appendChild(el('span', 'result-name', mode.name));
    head.appendChild(el('span', `conf conf-${confidence}`, `${confidence} confidence`));
    out.appendChild(head);

    if (secondary) {
      const sec = el('div', 'result-head');
      sec.appendChild(el('span', 'no-badge secondary', `Secondary · No.${secondary.mode.no}`));
      sec.appendChild(el('span', 'map-symptom', secondary.mode.name));
      out.appendChild(sec);
    }

    // why ---------------------------------------------------------------
    const why = block('Why');
    why.appendChild(el('p', 'strong', mode.blurb));
    why.appendChild(el('p', null, `The tell: ${mode.tell}`));
    out.appendChild(why);

    // evidence ----------------------------------------------------------
    const ev = block(`Evidence matched (${primary.hits.length} signal${primary.hits.length === 1 ? '' : 's'})`);
    const ul = el('ul');
    primary.hits.slice(0, 5).forEach((h) => {
      const li = el('li', 'evidence-hit');
      li.innerHTML = `${escapeHtml(h.label)} — <code>${escapeHtml(truncate(h.phrase, 60))}</code> <span class="score-tag">+${h.w}</span>`;
      ul.appendChild(li);
    });
    ev.appendChild(ul);
    out.appendChild(ev);

    // read first --------------------------------------------------------
    const read = block('Read first');
    read.appendChild(docLinkFor(mode));
    out.appendChild(read);

    // patch -------------------------------------------------------------
    const patch = block('First patch');
    const ol = el('ol');
    mode.patch.forEach((p) => ol.appendChild(el('li', null, p)));
    patch.appendChild(ol);
    out.appendChild(patch);

    // runners up --------------------------------------------------------
    const others = scored.filter((s) => s.score > 0 && s.mode.no !== mode.no).slice(0, 4);
    if (others.length) {
      const ru = el('div', 'runners-up');
      ru.appendChild(el('h4', null, 'Other modes that scored'));
      const max = scored[0].score;
      others.forEach((s) => {
        const row = el('div', 'ru-row');
        row.appendChild(el('span', 'ru-no', `No.${s.mode.no}`));
        const bar = el('span', 'ru-bar');
        const fill = el('i');
        fill.style.width = `${Math.round((s.score / max) * 100)}%`;
        bar.appendChild(fill);
        row.appendChild(bar);
        row.appendChild(el('span', 'score-tag', s.mode.name));
        ru.appendChild(row);
      });
      const foot = el('p', 'muted');
      foot.style.fontSize = '.8rem';
      foot.style.marginTop = '.7rem';
      foot.textContent =
        confidence === 'low'
          ? 'Scores are close and none is strong. Re-run this on the live engine, or add detail on whether retrieval was correct.'
          : 'If the primary does not match what you see in the trace, the runner-up is usually the answer.';
      ru.appendChild(foot);
      out.appendChild(ru);
    }
  }

  function renderLive(raw) {
    const out = $('#output');
    out.innerHTML = '';

    const parsed = parseTemplate(raw);

    if (parsed.no) {
      const mode = PROBLEM_MAP.find((m) => m.no === parsed.no);
      const head = el('div', 'result-head');
      head.appendChild(el('span', 'no-badge', `No.${parsed.no}`));
      head.appendChild(el('span', 'result-name', mode ? mode.name : parsed.name || ''));
      if (parsed.confidence) {
        head.appendChild(el('span', `conf conf-${parsed.confidence}`, `${parsed.confidence} confidence`));
      }
      out.appendChild(head);

      if (parsed.secondNo) {
        const secMode = PROBLEM_MAP.find((m) => m.no === parsed.secondNo);
        const sec = el('div', 'result-head');
        sec.appendChild(el('span', 'no-badge secondary', `Secondary · No.${parsed.secondNo}`));
        sec.appendChild(el('span', 'map-symptom', secMode ? secMode.name : ''));
        out.appendChild(sec);
      }

      if (mode) {
        const read = block('Read first');
        read.appendChild(docLinkFor(mode));
        out.appendChild(read);
      }
    }

    const body = block(parsed.no ? 'Model output' : 'Model output (template not followed)');
    body.appendChild(el('pre', 'raw-out', raw));
    out.appendChild(body);
  }

  /** Pull the structured fields out of the model's answer. */
  function parseTemplate(raw) {
    const res = { no: null, secondNo: null, confidence: null, name: null };

    const primary = raw.match(/PRIMARY\s*:?\s*No\.?\s*(\d{1,2})\s*[-–—:]?\s*(.*)/i);
    if (primary) {
      const n = parseInt(primary[1], 10);
      if (n >= 1 && n <= 16) {
        res.no = n;
        res.name = (primary[2] || '').trim();
      }
    }

    const second = raw.match(/SECONDARY\s*:?\s*No\.?\s*(\d{1,2})/i);
    if (second) {
      const n = parseInt(second[1], 10);
      if (n >= 1 && n <= 16 && n !== res.no) res.secondNo = n;
    }

    const conf = raw.match(/CONFIDENCE\s*:?\s*(high|medium|low)/i);
    if (conf) res.confidence = conf[1].toLowerCase();

    return res;
  }

  /* --------------------------------------------------------------------- */
  /* Live engine                                                            */
  /* --------------------------------------------------------------------- */

  const SYSTEM_PROMPT = `You are the WFGY Problem Map Debugger, a semantic firewall that sits in front of an LLM or RAG application.

Your only job is to classify a reported bug into the WFGY Problem Map taxonomy of 16 reproducible failure modes, numbered No.1 through No.16, and then point the engineer at the exact document and first patch.

Hard rules:
- Always choose exactly ONE primary number in the range No.1 to No.16.
- Never invent numbers outside that range and never merge or renumber modes.
- Add a secondary number only when the evidence genuinely supports a second mode.
- Diagnose before you prescribe. Quote the specific words in the report that drove your choice.
- Assume the engineer can only change prompts and call patterns. Do not propose infrastructure rewrites unless they explicitly asked for code level changes.
- If the report is too vague to route, say so plainly, pick the closest number, and list the exact evidence you would need to raise confidence.
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
3. <how to verify the bug is actually gone and not just hidden>`;

  function mapTableText() {
    return PROBLEM_MAP.map(
      (m) => `No.${m.no} | ${m.name} | ${m.symptom} | doc: ${m.doc}`
    ).join('\n');
  }

  function buildUserPrompt(bug) {
    return [
      'Reference A - the canonical 16 mode table (authoritative numbering and document filenames):',
      mapTableText(),
      '',
      '='.repeat(74),
      'BUG REPORT FROM THE ENGINEER:',
      '='.repeat(74),
      bug,
      '='.repeat(74),
      '',
      'Classify this bug now, using the required template.',
    ].join('\n');
  }

  async function callLLM(bug) {
    const key = $('#apiKey').value.trim();
    const model = $('#model').value.trim();
    let base = $('#baseUrl').value.trim();

    if (!key) throw new UserError('No API key. Paste one above, or switch to the offline engine.');
    if (!model) throw new UserError('No model id. Type the model your provider exposes.');
    if (!base) base = 'https://api.openai.com/v1/';
    if (!base.endsWith('/')) base += '/';

    let response;
    try {
      response = await fetch(base + 'chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + key,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 900,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(bug) },
          ],
        }),
      });
    } catch (netErr) {
      // A browser CORS rejection is indistinguishable from a network failure here.
      throw new UserError(
        'The browser could not reach that endpoint. Almost always this is CORS: the ' +
          'provider did not allow a direct browser call. Nothing is wrong with your key. ' +
          'Use the offline engine, or copy the full prompt and run it from the CLI (main.py) ' +
          'or any chat model.'
      );
    }

    if (!response.ok) {
      let detail = '';
      try {
        const j = await response.json();
        detail = (j.error && (j.error.message || j.error.code)) || JSON.stringify(j).slice(0, 300);
      } catch (_) {
        detail = await response.text().catch(() => '');
      }
      const hint =
        response.status === 401 || response.status === 403
          ? ' Check the API key and that it matches this base URL.'
          : response.status === 404
          ? ' A 404 here almost always means the model id does not exist on this endpoint.'
          : '';
      throw new UserError(`Endpoint returned ${response.status}. ${detail}${hint}`);
    }

    const data = await response.json();
    const content =
      data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) throw new UserError('The endpoint replied but the response had no message content.');
    return content.trim();
  }

  function UserError(msg) {
    this.message = msg;
    this.isUserError = true;
  }
  UserError.prototype = Object.create(Error.prototype);

  /* --------------------------------------------------------------------- */
  /* Run                                                                    */
  /* --------------------------------------------------------------------- */

  async function run() {
    const bug = $('#bugInput').value.trim();
    const out = $('#output');

    if (bug.length < 15) {
      out.innerHTML = '';
      const warn = el('div', 'alert');
      warn.innerHTML =
        '<b>Too short to diagnose.</b><p>Describe the symptom the way you would in a team channel: ' +
        'what you asked, what came back, and whether the retrieved context was actually right.</p>';
      out.appendChild(warn);
      return;
    }

    if (engine === 'offline') {
      renderOffline(offlineDiagnose(bug));
      return;
    }

    const btn = $('#runBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Diagnosing';
    out.innerHTML = '';
    const thinking = el('div', 'thinking');
    thinking.appendChild(el('span', 'spinner'));
    thinking.appendChild(el('span', null, 'Routing your bug through the 16 mode map…'));
    out.appendChild(thinking);

    try {
      renderLive(await callLLM(bug));
    } catch (err) {
      // Never leave the user empty handed: show what broke, then fall back to
      // the offline engine so they still walk away with a number.
      const notice =
        `<div class="alert"><b>Live call failed.</b><p>${escapeHtml(err.message || String(err))}</p></div>` +
        '<div class="res-block" style="margin-top:1.2rem"><h4>Offline result instead</h4></div>';
      renderOffline(offlineDiagnose(bug));
      out.insertAdjacentHTML('afterbegin', notice);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Diagnose';
    }
  }

  /* --------------------------------------------------------------------- */
  /* UI wiring                                                              */
  /* --------------------------------------------------------------------- */

  function buildSamples() {
    const box = $('#sampleChips');
    SAMPLES.forEach((s) => {
      const chip = el('button', 'chip');
      chip.type = 'button';
      chip.innerHTML = `${escapeHtml(s.label)}<b>No.${s.expect}</b>`;
      chip.addEventListener('click', () => {
        $('#bugInput').value = s.text;
        $('#bugInput').focus();
        toast(`Loaded: ${s.label}`);
      });
      box.appendChild(chip);
    });
  }

  function buildMap() {
    const list = $('#mapList');
    PROBLEM_MAP.forEach((m) => {
      const item = el('div', 'map-item');

      const row = el('button', 'map-row');
      row.type = 'button';
      row.setAttribute('aria-expanded', 'false');
      row.appendChild(el('span', 'map-no', `No.${m.no}`));
      row.appendChild(el('span', `map-layer ly-${m.layer}`, m.layer));
      row.appendChild(el('span', 'map-name', m.name));
      row.appendChild(el('span', 'map-symptom', m.symptom));
      row.appendChild(el('span', 'map-caret', '›'));

      const detail = el('div', 'map-detail');
      detail.hidden = true;
      detail.appendChild(el('p', null, m.blurb));
      detail.appendChild(el('p', 'tell', `The tell: ${m.tell}`));
      detail.appendChild(el('h5', null, 'First patch'));
      const ol = el('ol');
      m.patch.forEach((p) => ol.appendChild(el('li', null, p)));
      detail.appendChild(ol);
      detail.appendChild(docLinkFor(m));

      row.addEventListener('click', () => {
        const open = item.classList.toggle('open');
        detail.hidden = !open;
        row.setAttribute('aria-expanded', String(open));
      });

      item.appendChild(row);
      item.appendChild(detail);
      list.appendChild(item);
    });
  }

  function setEngine(next) {
    engine = next;
    document.querySelectorAll('.engine').forEach((b) => {
      const on = b.dataset.engine === next;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', String(on));
    });
    $('#liveConfig').hidden = next !== 'live';
    $('#engineBadge').textContent = next === 'live' ? 'live llm' : 'offline';
    $('#runHint').textContent =
      next === 'live'
        ? 'Calls your endpoint directly from this tab. Key stays in memory.'
        : 'Offline engine — instant, no key needed.';
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2200);
  }

  async function copyText(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      toast(label + ' copied');
    } catch (_) {
      // Clipboard API needs a secure context; fall back to a selection.
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        toast(label + ' copied');
      } catch (__) {
        toast('Copy failed — select the text manually');
      }
      ta.remove();
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function truncate(s, n) {
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  function initTheme() {
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const saved = (() => {
      try { return localStorage.getItem('wfgy-theme'); } catch (_) { return null; }
    })();
    document.documentElement.dataset.theme = saved || (prefersLight ? 'light' : 'dark');

    $('#themeToggle').addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('wfgy-theme', next); } catch (_) { /* private mode */ }
    });
  }

  function init() {
    initTheme();
    buildSamples();
    buildMap();
    setEngine('offline');

    document.querySelectorAll('.engine').forEach((b) =>
      b.addEventListener('click', () => setEngine(b.dataset.engine))
    );

    $('#runBtn').addEventListener('click', run);

    $('#clearBtn').addEventListener('click', () => {
      $('#bugInput').value = '';
      $('#bugInput').focus();
    });

    $('#copyPromptBtn').addEventListener('click', () => {
      const bug = $('#bugInput').value.trim() || '<paste your bug report here>';
      copyText(SYSTEM_PROMPT + '\n\n' + buildUserPrompt(bug), 'Full prompt');
    });

    $('#jumpCopyPrompt').addEventListener('click', () => $('#copyPromptBtn').click());

    document.querySelectorAll('.copy').forEach((b) =>
      b.addEventListener('click', () => copyText($(b.dataset.copy).innerText, 'Snippet'))
    );

    // Ctrl/Cmd + Enter runs the diagnosis from inside the textarea.
    $('#bugInput').addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') run();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
