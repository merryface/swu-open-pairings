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

function hasRepeatMatch(matches, playedMap) {
  return matches.some(({ player1, player2 }) => {
    return player1 !== null && player2 !== null && playedMap.get(player1)?.has(player2);
  });
}

function generatePairings(players, rounds) {
  if (!Array.isArray(players)) throw new TypeError('players must be an array');
  if (!Number.isInteger(rounds) || rounds < 1) throw new TypeError('rounds must be a positive integer');
  if (rounds > MAX_ROUNDS) throw new TypeError(`rounds cannot exceed ${MAX_ROUNDS}`);

  const played = new Map();
  for (const p of players) played.set(p, new Set());

  const result = [];
  const maxAttempts = 10;

  for (let r = 0; r < rounds; r++) {
    let matches;
    let attempt = 0;

    do {
      const pool = shuffle(players.slice());
      if (pool.length % 2 === 1) pool.push(null);
      matches = findRoundMatches(pool, played);
      attempt += 1;
    } while (attempt < maxAttempts && hasRepeatMatch(matches, played));

    if (hasRepeatMatch(matches, played)) {
      console.warn(`Could not avoid repeat opponents after ${maxAttempts} attempts for round ${r + 1}. Using best available pairing.`);
    }

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
const generateBtn = document.getElementById('generate');
const resetBtn = document.getElementById('reset');
const exportBtn = document.getElementById('export');
const resultsEl = document.getElementById('results');
const plainOutEl = document.getElementById('plainOut');

let currentPairings = null;
let currentNameColors = {};

const MAX_ROUNDS = 10;
const MAX_REPEAT_ATTEMPTS = 10;
const MAX_EXPORT_WIDTH = 1000;
const EXPORT_PADDING = 32;
const EXPORT_LINE_HEIGHT = 28;
const EXPORT_LINE_GAP = 10;

const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// accessibility attributes
playersEl.setAttribute('aria-label', 'Players, comma separated');
roundsEl.setAttribute('aria-label', 'Number of rounds');
generateBtn.setAttribute('aria-controls', 'results');
resultsEl.setAttribute('role', 'region');
resultsEl.setAttribute('aria-live', 'polite');
resultsEl.setAttribute('aria-label', 'Pairings results');
resultsEl.setAttribute('tabindex', '-1');

// Load saved player names from localStorage
const savedPlayers = localStorage.getItem('swu-players');
if (savedPlayers) {
  playersEl.value = savedPlayers;
}

// Load saved rounds from localStorage
const savedRounds = localStorage.getItem('swu-rounds');
if (savedRounds) {
  roundsEl.value = savedRounds;
}

// Save player names to localStorage when they change
playersEl.addEventListener('input', () => {
  localStorage.setItem('swu-players', playersEl.value);
});

// Save rounds to localStorage when they change
roundsEl.addEventListener('input', () => {
  localStorage.setItem('swu-rounds', roundsEl.value);
});

function ordinalSuffix(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatDateHeading(date) {
  const wd = WEEKDAYS[date.getDay()];
  const day = date.getDate();
  const mo = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${wd} ${day}${ordinalSuffix(day)} ${mo} ${year}`;
}

function getPlayersFromText(raw) {
  return raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
}

function ensurePlayerStyles(nameColors) {
  const styleId = 'player-colors';
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = Object.entries(nameColors).map(([name, hex]) => {
    const esc = name.replace(/"/g, '\\"');
    return `.player-name[data-player="${esc}"]{ color: ${hex}; }`;
  }).join('\n');
}

function getNextMonthDeadline() {
  const now = new Date();
  const deadline = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 15, 20, 0, 0));
  return deadline;
}

function exportPairingsImage(pairings, nameColors) {
  if (!pairings || !pairings.length) {
    alert('Generate pairings before exporting an image.');
    return;
  }

  const padding = EXPORT_PADDING;
  const titleFont = 'bold 30px Inter, system-ui, sans-serif';
  const roundFont = 'bold 22px Inter, system-ui, sans-serif';
  const textFont = '16px ui-monospace, SFMono-Regular, Menlo, Monaco, monospace';
  const lineGap = EXPORT_LINE_GAP;
  const lineHeight = EXPORT_LINE_HEIGHT;
  const maxLineWidth = MAX_EXPORT_WIDTH;

  const rows = [];
  rows.push({type: 'title', text: `Pairings ${formatDateHeading(new Date())}`});
  rows.push({type: 'spacer'});

  for (const r of pairings) {
    rows.push({type: 'round', text: `Round ${r.round}`});
    for (const m of r.matches) {
      if (m.bye) {
        const who = m.player1 === null ? m.player2 : m.player1;
        rows.push({type: 'bye', player: who, text: `${who}: BYE`});
      } else {
        rows.push({type: 'match', player1: m.player1, player2: m.player2});
      }
    }
    rows.push({type: 'spacer'});
  }

  const deadline = getNextMonthDeadline();
  const deadlineText = `DEADLINE: ${WEEKDAYS[deadline.getUTCDay()]} ${deadline.getUTCDate()}${ordinalSuffix(deadline.getUTCDate())} ${MONTHS[deadline.getUTCMonth()]} 20:00 UTC`;
  rows.push({type: 'deadline', text: deadlineText});

  let canvasWidth = 0;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  for (const row of rows) {
    if (row.type === 'title') {
      ctx.font = titleFont;
      canvasWidth = Math.max(canvasWidth, ctx.measureText(row.text).width);
    } else if (row.type === 'round') {
      ctx.font = roundFont;
      canvasWidth = Math.max(canvasWidth, ctx.measureText(row.text).width);
    } else if (row.type === 'match' || row.type === 'bye' || row.type === 'deadline') {
      ctx.font = textFont;
      const text = row.type === 'match' ? `${row.player1} vs ${row.player2}` : row.text;
      canvasWidth = Math.max(canvasWidth, ctx.measureText(text).width);
    }
  }

  canvasWidth = Math.min(maxLineWidth, Math.ceil(canvasWidth) + padding * 2);
  const canvasHeight = Math.ceil(rows.length * lineHeight + padding * 2 + rows.filter(r => r.type === 'spacer').length * lineGap);
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  ctx.fillStyle = '#04070d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = textFont;
  ctx.textBaseline = 'top';

  let y = padding;
  for (const row of rows) {
    if (row.type === 'spacer') {
      y += lineGap;
      continue;
    }

    if (row.type === 'title') {
      ctx.font = titleFont;
      ctx.fillStyle = '#ffe81f';
      ctx.fillText(row.text, padding, y);
      y += lineHeight;
      continue;
    }

    if (row.type === 'round') {
      ctx.font = roundFont;
      ctx.fillStyle = '#7fffd4';
      ctx.fillText(row.text, padding, y);
      y += lineHeight;
      continue;
    }

    ctx.font = textFont;
    if (row.type === 'deadline') {
      ctx.fillStyle = '#ffffff';
      ctx.fillText(row.text, padding, y);
      y += lineHeight;
      continue;
    }

    if (row.type === 'bye') {
      ctx.fillStyle = nameColors[row.player] || '#ffffff';
      ctx.fillText(row.text, padding, y);
      y += lineHeight;
      continue;
    }

    // match row with colored names
    const gap = ' vs ';
    const p1Color = nameColors[row.player1] || '#ffffff';
    const p2Color = nameColors[row.player2] || '#ffffff';
    ctx.fillStyle = p1Color;
    ctx.fillText(row.player1, padding, y);
    const firstWidth = ctx.measureText(row.player1).width;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(gap, padding + firstWidth, y);
    const gapWidth = ctx.measureText(gap).width;
    ctx.fillStyle = p2Color;
    ctx.fillText(row.player2, padding + firstWidth + gapWidth, y);
    y += lineHeight;
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'pairings.png';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

function render(pairings) {
  resultsEl.innerHTML = '';

  const heading = document.createElement('h2');
  heading.className = 'pairings-heading';
  // 'Pairings Monday 3rd January 2026'
  heading.textContent = `Pairings ${formatDateHeading(new Date())}`;
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
    for (let mIdx = 0; mIdx < r.matches.length; mIdx++) {
      const m = r.matches[mIdx];
      const li = document.createElement('li');
      li.className = 'match-item';
      li.setAttribute('role', 'listitem');
      // unique match identifier for this pairing
      const matchId = `r${r.round}-m${mIdx}`;
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
  
  // Add header message with corrected grammar
  plainLines.push('The pairings for this month! Try and play as many of these as you can/want. Don\'t worry about getting all of them done (but try to play at least ONE 😅)');
  plainLines.push('<br>');
  
  // Add rounds and matchups
  for (const r of pairings) {
    plainLines.push(`Round ${r.round}`);
    for (const m of r.matches) {
      if (m.bye) {
        const who = m.player1 === null ? m.player2 : m.player1;
        plainLines.push(`${who}: BYE`);
      } else {
        plainLines.push(`${m.player1} vs ${m.player2}`);
      }
    }
    plainLines.push('-----');
  }
  plainLines.push('<br>');
  
  const deadline = getNextMonthDeadline();
  const day = deadline.getUTCDate();
  const month = MONTHS[deadline.getUTCMonth()];
  plainLines.push(`***DEADLINE: ${WEEKDAYS[deadline.getUTCDay()]} ${day}${ordinalSuffix(day)} ${month} 20:00 UTC***`);
  plainLines.push('<br>');
  
  // Collect all unique players
  const allPlayers = new Set();
  for (const r of pairings) {
    for (const m of r.matches) {
      if (m.player1 !== null) allPlayers.add(m.player1);
      if (m.player2 !== null) allPlayers.add(m.player2);
    }
  }
  
  // Add player mentions
  for (const player of Array.from(allPlayers).sort()) {
    plainLines.push(`@${player}`);
  }
  // construct HTML with minimal markup so names can be yellow
  plainOutEl.innerHTML = '';
  for (const line of plainLines) {
    const div = document.createElement('div');
    // replace @Name tokens with span.at-name
    const htmlLine = line.replace(/@([\w\-\s]+)/g, (m, name) => {
      return `<span class="at-name"> @${name.trim()}</span>`;
    });
    div.innerHTML = htmlLine;
    plainOutEl.appendChild(div);
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
  // Split by both commas and line breaks
  const players = getPlayersFromText(raw);
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

  ensurePlayerStyles(nameColors);

  const pairings = generatePairings(players, rounds);
  currentPairings = pairings;
  currentNameColors = nameColors;
  exportBtn.disabled = false;
  
  // Save pairings to localStorage
  savePairings(pairings);
  
  render(pairings);
  restoreWinnerSelections();
  // move focus to results for screen readers
  resultsEl.focus();
});

exportBtn.addEventListener('click', () => {
  exportPairingsImage(currentPairings, currentNameColors);
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
  
  // Save winner selections to localStorage
  saveWinnerSelections();
});

// Save pairings to localStorage
function savePairings(pairings) {
  localStorage.setItem('swu-pairings', JSON.stringify(pairings));
}

// Restore pairings from localStorage
function restorePairings() {
  const saved = localStorage.getItem('swu-pairings');
  if (!saved) return null;
  
  try {
    return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to restore pairings:', e);
    return null;
  }
}

// Save current winner selections
function saveWinnerSelections() {
  const winners = [];
  resultsEl.querySelectorAll('.player-name.winner-selected').forEach(el => {
    winners.push({
      matchId: el.getAttribute('data-match-id'),
      player: el.getAttribute('data-player')
    });
  });
  localStorage.setItem('swu-winners', JSON.stringify(winners));
}

// Restore winner selections after rendering
function restoreWinnerSelections() {
  const saved = localStorage.getItem('swu-winners');
  if (!saved) return;
  
  try {
    const winners = JSON.parse(saved);
    winners.forEach(({ matchId, player }) => {
      const el = resultsEl.querySelector(`.player-name[data-match-id="${matchId}"][data-player="${player}"]`);
      if (el) el.classList.add('winner-selected');
    });
  } catch (e) {
    console.error('Failed to restore winner selections:', e);
  }
}

// Reset button handler
resetBtn.addEventListener('click', () => {
  if (confirm('Clear all saved data (player names, rounds, pairings, and winner selections)?')) {
    localStorage.removeItem('swu-players');
    localStorage.removeItem('swu-rounds');
    localStorage.removeItem('swu-pairings');
    localStorage.removeItem('swu-winners');
    playersEl.value = '';
    roundsEl.value = '1';
    resultsEl.innerHTML = '';
    plainOutEl.innerHTML = '';
    currentPairings = null;
    currentNameColors = {};
    exportBtn.disabled = true;
  }
});

// Load and display saved pairings on page load
window.addEventListener('DOMContentLoaded', () => {
  const savedPairings = restorePairings();
  if (savedPairings && savedPairings.length > 0) {
    // Get saved player names to restore colors
    const raw = playersEl.value;
    const players = getPlayersFromText(raw);
    
    if (players.length > 0) {
      // Recreate player colors
      const nameColors = {};
      const n = players.length;
      for (let i = 0; i < n; i++){
        const hue = Math.round(((i * 360) / n + 40) % 360);
        const sat = 78;
        const light = 56;
        nameColors[players[i]] = hslToHex(hue, sat, light);
      }
      
      ensurePlayerStyles(nameColors);
      currentNameColors = nameColors;
    }
    
    currentPairings = savedPairings;
    exportBtn.disabled = false;
    render(savedPairings);
    restoreWinnerSelections();
  }
});

// Export function for possible programmatic use
if (typeof window !== 'undefined') window.generatePairings = generatePairings;
