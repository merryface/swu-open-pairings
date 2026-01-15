// app.js - moved from index.html

// Shuffle (Fisher-Yates)
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function findRoundMatches(players, playedMap) {
  const n = players.length;
  const used = new Array(n).fill(false);
  const matches = [];

  function backtrack() {
    let i = 0;
    while (i < n && used[i]) i++;
    if (i >= n) return true;

    used[i] = true;
    const p1 = players[i];

    for (let j = i + 1; j < n; j++) {
      if (used[j]) continue;
      const p2 = players[j];
      const havePlayed = p1 !== null && p2 !== null && playedMap.get(p1)?.has(p2);
      if (havePlayed) continue;

      used[j] = true;
      matches.push({ player1: p1, player2: p2, bye: p1 === null || p2 === null });

      if (backtrack()) return true;

      matches.pop();
      used[j] = false;
    }

    used[i] = false;
    return false;
  }

  if (backtrack()) return matches.slice();

  // Greedy fallback
  const rem = players.slice();
  const fallback = [];
  while (rem.length) {
    const a = rem.shift();
    if (a === null) {
      const b = rem.shift();
      fallback.push({ player1: a, player2: b, bye: true });
      continue;
    }

    let bestIdx = 0;
    let bestScore = Infinity;
    for (let k = 0; k < rem.length; k++) {
      const cand = rem[k];
      if (cand === null) { bestIdx = k; bestScore = -1; break; }
      const cnt = playedMap.get(a)?.has(cand) ? 1 : 0;
      if (cnt < bestScore) { bestScore = cnt; bestIdx = k; if (bestScore === 0) break; }
    }

    const b = rem.splice(bestIdx, 1)[0];
    fallback.push({ player1: a, player2: b, bye: a === null || b === null });
  }

  return fallback;
}

function generatePairings(players, rounds) {
  if (!Array.isArray(players)) throw new TypeError('players must be an array');
  if (!Number.isInteger(rounds) || rounds < 1) throw new TypeError('rounds must be a positive integer');

  const played = new Map();
  for (const p of players) played.set(p, new Set());

  const result = [];

  for (let r = 0; r < rounds; r++) {
    const pool = shuffle(players.slice());
    if (pool.length % 2 === 1) pool.push(null);

    const matches = findRoundMatches(pool, played);

    for (const m of matches) {
      const { player1, player2 } = m;
      if (player1 !== null && player2 !== null) {
        played.get(player1).add(player2);
        played.get(player2).add(player1);
      }
    }

    result.push({ round: r + 1, matches });
  }

  return result;
}

// DOM wiring
const playersEl = document.getElementById('players');
const roundsEl = document.getElementById('rounds');
const groupEl = document.getElementById('group');
const generateBtn = document.getElementById('generate');
const resultsEl = document.getElementById('results');

// accessibility attributes
playersEl.setAttribute('aria-label', 'Players, comma separated');
roundsEl.setAttribute('aria-label', 'Number of rounds');
groupEl.setAttribute('aria-label', 'Group selection');
generateBtn.setAttribute('aria-controls', 'results');
resultsEl.setAttribute('role', 'region');
resultsEl.setAttribute('aria-live', 'polite');
resultsEl.setAttribute('aria-label', 'Pairings results');
resultsEl.setAttribute('tabindex', '-1');

function ordinalSuffix(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatDateHeading(date) {
  const weekdays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const wd = weekdays[date.getDay()];
  const day = date.getDate();
  const mo = months[date.getMonth()];
  const year = date.getFullYear();
  return `${wd} ${day}${ordinalSuffix(day)} ${mo} ${year}`;
}

function render(pairings) {
  resultsEl.innerHTML = '';

  const heading = document.createElement('h2');
  heading.className = 'pairings-heading';
  const groupLabel = (document.getElementById('group') && document.getElementById('group').value) || '';
  // e.g. 'Seed Group Pairings Monday 3rd January 2026'
  heading.textContent = `${groupLabel} Group Pairings ${formatDateHeading(new Date())}`;
  resultsEl.appendChild(heading);

  for (let idx = 0; idx < pairings.length; idx++) {
    const r = pairings[idx];
    const box = document.createElement('div');
    box.className = 'round-box';

    const h = document.createElement('h3');
    h.className = 'round-title';
    const titleId = `round-${r.round}-title`;
    h.id = titleId;
    h.textContent = `Round ${r.round}`;
    box.setAttribute('aria-labelledby', titleId);
    box.appendChild(h);

    const ul = document.createElement('ul');
    ul.className = 'matches-list';
    ul.setAttribute('role', 'list');
    for (const m of r.matches) {
      const li = document.createElement('li');
      li.className = 'match-item';
      li.setAttribute('role', 'listitem');
      // unique match identifier for this pairing
      const matchId = `r${r.round}-m${r.matches.indexOf(m)}`;
      if (m.bye) {
        li.classList.add('bye');
        const who = m.player1 === null ? m.player2 : m.player1;
        const span = document.createElement('span');
        span.className = 'player-name';
        span.textContent = who;
        span.setAttribute('data-player', who);
        span.setAttribute('data-match-id', matchId);
        span.style.cursor = 'pointer';
        li.appendChild(span);
        li.appendChild(document.createTextNode(': BYE'));
      } else {
        const span1 = document.createElement('span');
        span1.className = 'player-name';
        span1.textContent = m.player1;
        span1.setAttribute('data-player', m.player1);
        span1.setAttribute('data-match-id', matchId);
        span1.style.cursor = 'pointer';

        const span2 = document.createElement('span');
        span2.className = 'player-name';
        span2.textContent = m.player2;
        span2.setAttribute('data-player', m.player2);
        span2.setAttribute('data-match-id', matchId);
        span2.style.cursor = 'pointer';

    li.appendChild(span1);
    li.appendChild(document.createTextNode('vs '));
    li.appendChild(span2);
      }
      ul.appendChild(li);
    }
    box.appendChild(ul);
    resultsEl.appendChild(box);
  }

  // build plain text output
  const plainLines = [];
  for (const r of pairings) {
    plainLines.push(`Round ${r.round}`);
    for (const m of r.matches) {
      if (m.bye) {
        const who = m.player1 === null ? m.player2 : m.player1;
        plainLines.push(`@${who}: BYE`);
      } else {
        plainLines.push(`@${m.player1} vs @${m.player2}`);
      }
    }
    // add a clear plain-text separator between rounds
    plainLines.push('-----');
  }
  const plainOut = document.getElementById('plainOut');
  // construct HTML with minimal markup so names can be yellow
  plainOut.innerHTML = '';
  for (const line of plainLines) {
    const div = document.createElement('div');
    // replace @Name tokens with span.at-name
    const htmlLine = line.replace(/@([\w\-\s]+)/g, (m, name) => {
      return `<span class="at-name"> @${name.trim()}</span>`;
    });
    div.innerHTML = htmlLine;
    plainOut.appendChild(div);
  }
}

// helper: convert HSL to hex (stable, readable)
function hslToHex(h, s, l){
  // h in [0,360], s and l in [0,100]
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(-1, Math.min(Math.min(k - 3, 9 - k), 1));
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

generateBtn.addEventListener('click', () => {
  const raw = playersEl.value;
  const players = raw.split(',').map(s => s.trim()).filter(Boolean);
  const rounds = parseInt(roundsEl.value, 10) || 1;

  if (players.length === 0) {
    resultsEl.innerHTML = '<em>Please enter at least one player.</em>';
    return;
  }

  // assign each player a readable color (HSL spaced hues)
  // shift hues slightly to avoid clashing with the yellow accent (~50deg)
  const nameColors = {};
  const n = players.length;
  for (let i = 0; i < n; i++){
    // space hues evenly and add an offset
    const hue = Math.round(((i * 360) / n + 40) % 360);
    // use relatively high saturation and medium-lightness for contrast on dark bg
    const sat = 78;
    const light = 56;
    nameColors[players[i]] = hslToHex(hue, sat, light);
  }

  // inject CSS rules for each player to avoid inline styles
  const styleId = 'player-colors';
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  const rules = Object.entries(nameColors).map(([name, hex]) => {
    const esc = name.replace(/"/g, '\\"');
    return `.player-name[data-player="${esc}"]{ color: ${hex}; }`;
  }).join('\n');
  styleEl.textContent = rules;

  const pairings = generatePairings(players, rounds);
  render(pairings);
  // move focus to results for screen readers
  resultsEl.focus();
});

// Handle winner selection clicks
resultsEl.addEventListener('click', (e) => {
  const target = e.target;
  if (!target.classList.contains('player-name')) return;
  
  const matchId = target.getAttribute('data-match-id');
  if (!matchId) return;
  
  // Find all players in this match
  const playersInMatch = resultsEl.querySelectorAll(`.player-name[data-match-id="${matchId}"]`);
  
  // Check if this player is already selected
  const isSelected = target.classList.contains('winner-selected');
  
  if (isSelected) {
    // Toggle off
    target.classList.remove('winner-selected');
  } else {
    // Deselect all others in this match, then select this one
    playersInMatch.forEach(p => p.classList.remove('winner-selected'));
    target.classList.add('winner-selected');
  }
});

// Export function for possible programmatic use
if (typeof window !== 'undefined') window.generatePairings = generatePairings;
