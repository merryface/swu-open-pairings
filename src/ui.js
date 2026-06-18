// src/ui.js

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

let elements = null;
let pairingsLib = null;
let currentPairings = null;
let currentNameColors = {};
let currentPlayerFilter = 'all';

function setPairingsLib(lib) {
  pairingsLib = lib;
}

function getPlayersFromText(raw) {
  return raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
}

function ordinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function formatDateHeading(date) {
  const wd = WEEKDAYS[date.getDay()];
  const day = date.getDate();
  const mo = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${wd} ${day}${ordinalSuffix(day)} ${mo} ${year}`;
}

function parseMatchId(matchId) {
  const match = /^r(\d+)-m(\d+)$/.exec(matchId);
  if (!match) return null;
  return {
    roundIndex: parseInt(match[1], 10) - 1,
    matchIndex: parseInt(match[2], 10),
  };
}

function filterPairings(pairings, player) {
  if (!pairings || player === 'all' || !player) return pairings;
  return pairings
    .map(round => ({
      round: round.round,
      matches: round.matches
        .map((match, index) => ({ ...match, matchIndex: index }))
        .filter(match => match.player1 === player || match.player2 === player),
    }))
    .filter(round => round.matches.length > 0);
}

function updatePlayerFilterOptions(players) {
  const filterEl = elements.filterEl;
  filterEl.innerHTML = '';

  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'All players';
  filterEl.appendChild(allOption);

  players.forEach(player => {
    const option = document.createElement('option');
    option.value = player;
    option.textContent = player;
    filterEl.appendChild(option);
  });

  filterEl.disabled = players.length === 0;
  filterEl.value = currentPlayerFilter || 'all';
}

function ensurePlayerStyles(nameColors) {
  const styleId = 'player-colors';
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = Object.entries(nameColors)
    .map(([name, hex]) => {
      const esc = name.replace(/"/g, '\\"');
      return `.player-name[data-player="${esc}"]{ color: ${hex}; }`;
    })
    .join('\n');
}

function getNextMonthDeadline() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 15, 20, 0, 0));
}

function savePairings(pairings) {
  localStorage.setItem('swu-pairings', JSON.stringify(pairings));
}

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

function saveWinnerSelections() {
  const winners = [];
  elements.resultsEl.querySelectorAll('.player-name.winner-selected').forEach(el => {
    winners.push({
      matchId: el.getAttribute('data-match-id'),
      player: el.getAttribute('data-player'),
    });
  });
  localStorage.setItem('swu-winners', JSON.stringify(winners));
}

function restoreWinnerSelections() {
  const saved = localStorage.getItem('swu-winners');
  if (!saved) return;

  try {
    const winners = JSON.parse(saved);
    winners.forEach(({ matchId, player }) => {
      const el = elements.resultsEl.querySelector(`.player-name[data-match-id="${matchId}"][data-player="${player}"]`);
      if (el) el.classList.add('winner-selected');
    });
  } catch (e) {
    console.error('Failed to restore winner selections:', e);
  }
}

function updateMatchPlayed(matchId, played) {
  if (!currentPairings) return;
  const matchRef = parseMatchId(matchId);
  if (!matchRef) return;

  const round = currentPairings[matchRef.roundIndex];
  if (!round || !round.matches || !round.matches[matchRef.matchIndex]) return;

  round.matches[matchRef.matchIndex].played = played;
  savePairings(currentPairings);
}

function buildMatchItem(match, matchId) {
  const li = document.createElement('li');
  li.className = 'match-item';
  li.setAttribute('role', 'listitem');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'match-played-checkbox';
  checkbox.id = `played-${matchId}`;
  checkbox.setAttribute('data-match-id', matchId);
  checkbox.checked = !!match.played;
  checkbox.setAttribute('aria-label',
    match.bye
      ? `Mark ${match.player1 === null ? match.player2 : match.player1} bye as played`
      : `Mark ${match.player1} vs ${match.player2} as played`
  );

  const label = document.createElement('label');
  label.className = 'match-played-label';
  label.setAttribute('for', checkbox.id);
  label.textContent = 'Played';

  li.appendChild(checkbox);
  li.appendChild(label);

  if (match.bye) {
    li.classList.add('bye');
    const who = match.player1 === null ? match.player2 : match.player1;
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
    span1.textContent = match.player1;
    span1.setAttribute('data-player', match.player1);
    span1.setAttribute('data-match-id', matchId);
    span1.style.cursor = 'pointer';

    const span2 = document.createElement('span');
    span2.className = 'player-name';
    span2.textContent = match.player2;
    span2.setAttribute('data-player', match.player2);
    span2.setAttribute('data-match-id', matchId);
    span2.style.cursor = 'pointer';

    li.appendChild(span1);
    li.appendChild(document.createTextNode('vs '));
    li.appendChild(span2);
  }

  return li;
}

function buildRoundBox(round) {
  const box = document.createElement('div');
  box.className = 'round-box';

  const h = document.createElement('h3');
  h.className = 'round-title';
  const titleId = `round-${round.round}-title`;
  h.id = titleId;
  h.textContent = `Round ${round.round}`;
  box.setAttribute('aria-labelledby', titleId);
  box.appendChild(h);

  const ul = document.createElement('ul');
  ul.className = 'matches-list';
  ul.setAttribute('role', 'list');

  round.matches.forEach((match, idx) => {
    const matchIndex = typeof match.matchIndex === 'number' ? match.matchIndex : idx;
    ul.appendChild(buildMatchItem(match, `r${round.round}-m${matchIndex}`));
  });
  box.appendChild(ul);
  return box;
}

function render(pairings, filterPlayer = 'all') {
  const resultsEl = elements.resultsEl;
  resultsEl.innerHTML = '';
  const visiblePairings = filterPairings(pairings, filterPlayer) || [];

  const heading = document.createElement('h2');
  heading.className = 'pairings-heading';
  heading.textContent = `Pairings ${formatDateHeading(new Date())}`;
  resultsEl.appendChild(heading);

  visiblePairings.forEach(round => resultsEl.appendChild(buildRoundBox(round)));

  const plainLines = [];
  plainLines.push('The pairings for this month! Try and play as many of these as you can/want. Don\'t worry about getting all of them done (but try to play at least ONE 😅)');
  plainLines.push('<br>');

  visiblePairings.forEach(round => {
    plainLines.push(`Round ${round.round}`);
    round.matches.forEach(match => {
      if (match.bye) {
        const who = match.player1 === null ? match.player2 : match.player1;
        plainLines.push(`${who}: BYE`);
      } else {
        plainLines.push(`${match.player1} vs ${match.player2}`);
      }
    });
    plainLines.push('-----');
  });

  plainLines.push('<br>');
  const deadline = getNextMonthDeadline();
  const day = deadline.getUTCDate();
  const month = MONTHS[deadline.getUTCMonth()];
  plainLines.push(`***DEADLINE: ${WEEKDAYS[deadline.getUTCDay()]} ${day}${ordinalSuffix(day)} ${month} 20:00 UTC***`);
  plainLines.push('<br>');

  const allPlayers = new Set();
  visiblePairings.forEach(round => {
    round.matches.forEach(match => {
      if (match.player1 !== null) allPlayers.add(match.player1);
      if (match.player2 !== null) allPlayers.add(match.player2);
    });
  });

  Array.from(allPlayers).sort().forEach(player => plainLines.push(`@${player}`));

  elements.plainOutEl.innerHTML = '';
  plainLines.forEach(line => {
    const div = document.createElement('div');
    const htmlLine = line.replace(/@([\w\-\s]+)/g, (m, name) => `<span class="at-name"> @${name.trim()}</span>`);
    div.innerHTML = htmlLine;
    elements.plainOutEl.appendChild(div);
  });
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(-1, Math.min(Math.min(k - 3, 9 - k), 1));
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function initApp() {
  elements = {
    playersEl: document.getElementById('players'),
    roundsEl: document.getElementById('rounds'),
    generateBtn: document.getElementById('generate'),
    resetBtn: document.getElementById('reset'),
    exportBtn: document.getElementById('export'),
    filterEl: document.getElementById('player-filter'),
    resultsEl: document.getElementById('results'),
    plainOutEl: document.getElementById('plainOut'),
  };

  const { playersEl, roundsEl, generateBtn, resetBtn, exportBtn, filterEl, resultsEl } = elements;

  setPairingsLib(window.SWU?.Pairings || null);

  playersEl.setAttribute('aria-label', 'Players, comma separated');
  roundsEl.setAttribute('aria-label', 'Number of rounds');
  generateBtn.setAttribute('aria-controls', 'results');
  resultsEl.setAttribute('role', 'region');
  resultsEl.setAttribute('aria-live', 'polite');
  resultsEl.setAttribute('aria-label', 'Pairings results');
  resultsEl.setAttribute('tabindex', '-1');

  const savedPlayers = localStorage.getItem('swu-players');
  if (savedPlayers) playersEl.value = savedPlayers;

  const savedRounds = localStorage.getItem('swu-rounds');
  if (savedRounds) roundsEl.value = savedRounds;

  playersEl.addEventListener('input', () => localStorage.setItem('swu-players', playersEl.value));
  roundsEl.addEventListener('input', () => localStorage.setItem('swu-rounds', roundsEl.value));

  generateBtn.addEventListener('click', () => {
    const raw = playersEl.value;
    const players = getPlayersFromText(raw);
    const rounds = parseInt(roundsEl.value, 10) || 1;

    if (players.length === 0) {
      resultsEl.innerHTML = '<em>Please enter at least one player.</em>';
      return;
    }

    const nameColors = {};
    players.forEach((player, index) => {
      const hue = Math.round(((index * 360) / players.length + 40) % 360);
      nameColors[player] = hslToHex(hue, 78, 56);
    });

    ensurePlayerStyles(nameColors);

    if (!pairingsLib) {
      console.error('Pairings library is unavailable.');
      return;
    }

    currentPairings = pairingsLib.generatePairings(players, rounds);
    currentNameColors = nameColors;
    currentPlayerFilter = 'all';
    updatePlayerFilterOptions(players);
    exportBtn.disabled = false;
    savePairings(currentPairings);
    render(currentPairings, currentPlayerFilter);
    restoreWinnerSelections();
    resultsEl.focus();
  });

  exportBtn.addEventListener('click', () => exportPairingsImage(currentPairings, currentNameColors));

  filterEl.addEventListener('change', () => {
    currentPlayerFilter = filterEl.value;
    render(currentPairings, currentPlayerFilter);
    restoreWinnerSelections();
  });

  resultsEl.addEventListener('click', e => {
    const target = e.target;
    if (!target.classList.contains('player-name')) return;

    const matchId = target.getAttribute('data-match-id');
    if (!matchId) return;

    const playersInMatch = resultsEl.querySelectorAll(`.player-name[data-match-id="${matchId}"]`);
    const isSelected = target.classList.contains('winner-selected');
    playersInMatch.forEach(el => el.classList.toggle('winner-selected', !isSelected));
    saveWinnerSelections();
  });

  resultsEl.addEventListener('change', e => {
    const target = e.target;
    if (!target.classList.contains('match-played-checkbox')) return;

    const matchId = target.getAttribute('data-match-id');
    if (!matchId) return;
    updateMatchPlayed(matchId, target.checked);
  });

  resetBtn.addEventListener('click', () => {
    if (!confirm('Clear all saved data (player names, rounds, pairings, and winner selections)?')) return;
    localStorage.removeItem('swu-players');
    localStorage.removeItem('swu-rounds');
    localStorage.removeItem('swu-pairings');
    localStorage.removeItem('swu-winners');
    playersEl.value = '';
    roundsEl.value = '1';
    resultsEl.innerHTML = '';
    elements.plainOutEl.innerHTML = '';
    currentPairings = null;
    currentNameColors = {};
    currentPlayerFilter = 'all';
    exportBtn.disabled = true;
  });

  const savedPairings = restorePairings();
  if (savedPairings && savedPairings.length > 0) {
    const raw = playersEl.value;
    let players = getPlayersFromText(raw);

    if (players.length === 0) {
      const playerSet = new Set();
      savedPairings.forEach(round => round.matches.forEach(match => {
        if (match.player1 !== null) playerSet.add(match.player1);
        if (match.player2 !== null) playerSet.add(match.player2);
      }));
      players = Array.from(playerSet).sort();
    }

    if (players.length > 0) {
      const nameColors = {};
      players.forEach((player, index) => {
        const hue = Math.round(((index * 360) / players.length + 40) % 360);
        nameColors[player] = hslToHex(hue, 78, 56);
      });
      ensurePlayerStyles(nameColors);
      currentNameColors = nameColors;
      updatePlayerFilterOptions(players);
    }

    currentPairings = savedPairings;
    currentPlayerFilter = 'all';
    exportBtn.disabled = false;
    render(savedPairings, currentPlayerFilter);
    restoreWinnerSelections();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setPairingsLib,
    initApp,
    getPlayersFromText,
    ordinalSuffix,
    formatDateHeading,
    updatePlayerFilterOptions,
    filterPairings,
    parseMatchId,
    savePairings,
    restorePairings,
    updateMatchPlayed,
    setCurrentPairings(pairings) { currentPairings = pairings; },
    getCurrentPairings() { return currentPairings; },
    render,
  };
}

if (typeof window !== 'undefined') {
  window.SWU = window.SWU || {};
  window.SWU.UI = window.SWU.UI || { initApp };
}
