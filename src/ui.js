// src/ui.js

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

let elements = null;
let pairingsLib = null;
let currentPairings = null;
let currentNameColors = {};
let currentPlayerFilter = 'all';

const setPairingsLib = lib => {
  pairingsLib = lib;
};

const getPlayersFromText = raw => raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean);

const ordinalSuffix = n => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

const formatDateHeading = date => {
  const wd = WEEKDAYS[date.getDay()];
  const day = date.getDate();
  const mo = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${wd} ${day}${ordinalSuffix(day)} ${mo} ${year}`;
};

const parseMatchId = matchId => {
  const match = /^r(\d+)-m(\d+)$/.exec(matchId);
  if (!match) return null;
  return {
    roundIndex: parseInt(match[1], 10) - 1,
    matchIndex: parseInt(match[2], 10),
  };
};

const clearElement = el => {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
};

const createOption = (value, label) => {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
};

const createPlayerNameSpan = (player, matchId) => {
  const span = document.createElement('span');
  span.className = 'player-name';
  span.textContent = player;
  span.setAttribute('data-player', player);
  span.setAttribute('data-match-id', matchId);
  span.style.cursor = 'pointer';
  return span;
};

const getSortedPlayers = pairings => {
  const players = new Set();
  pairings.forEach(round => {
    round.matches.forEach(match => {
      if (match.player1 !== null) players.add(match.player1);
      if (match.player2 !== null) players.add(match.player2);
    });
  });
  return Array.from(players).sort();
};

const renderPlainOutput = lines => {
  clearElement(elements.plainOutEl);
  lines.forEach(line => appendPlainTextLine(elements.plainOutEl, line));
};

const filterPairings = (pairings, player) => {
  if (!pairings || player === 'all' || !player) return pairings;
  return pairings
    .map(round => ({
      round: round.round,
      matches: round.matches
        .map((match, index) => ({ ...match, matchIndex: index }))
        .filter(match => match.player1 === player || match.player2 === player),
    }))
    .filter(round => round.matches.length > 0);
};

const parseManualPairings = raw => {
  if (typeof raw !== 'string') throw new TypeError('Manual pairings input must be text');

  const lines = raw.split(/\r?\n/).map(line => line.trim());
  const rounds = [];
  let currentRound = null;

  for (const line of lines) {
    if (!line) continue;

    const roundMatch = /^Round\s+(\d+)/i.exec(line);
    if (roundMatch) {
      currentRound = { round: parseInt(roundMatch[1], 10), matches: [] };
      rounds.push(currentRound);
      continue;
    }

    if (!currentRound) continue;
    if (/^-{3,}$/.test(line)) continue;
    if (/^\*\*\*DEADLINE:/i.test(line)) break;
    if (/^@/.test(line)) continue;
    if (/^The pairings/i.test(line)) continue;

    const byeMatch = /^(.*?)\s*:\s*BYE$/i.exec(line);
    if (byeMatch) {
      const player = byeMatch[1].trim();
      if (player) {
        currentRound.matches.push({ player1: player, player2: null, bye: true, played: false });
        continue;
      }
    }

    const vsMatch = /^(.*?)\s+vs\s+(.*?)$/i.exec(line);
    if (vsMatch) {
      const player1 = vsMatch[1].trim();
      const player2 = vsMatch[2].trim();
      if (player1 && player2) {
        currentRound.matches.push({ player1, player2, bye: false, played: false });
        continue;
      }
    }
  }

  if (rounds.length === 0 || rounds.every(round => round.matches.length === 0)) {
    throw new Error('Could not parse manual pairings. Please paste valid raw pairings output.');
  }

  return rounds;
};

const loadManualPairingsFromText = raw => {
  const pairings = parseManualPairings(raw);
  const players = getSortedPlayers(pairings);
  const nameColors = {};
  players.forEach((player, index) => {
    const hue = Math.round(((index * 360) / players.length + 40) % 360);
    nameColors[player] = hslToHex(hue, 78, 56);
  });

  ensurePlayerStyles(nameColors);
  currentPairings = pairings;
  currentNameColors = nameColors;
  currentPlayerFilter = 'all';
  updatePlayerFilterOptions(players);
  elements.exportBtn.disabled = false;
  savePairings(currentPairings);
  render(currentPairings, currentPlayerFilter);
  restoreWinnerSelections();
  return currentPairings;
};

const updatePlayerFilterOptions = players => {
  const filterEl = elements.filterEl;
  clearElement(filterEl);

  filterEl.appendChild(createOption('all', 'All players'));

  players.forEach(player => filterEl.appendChild(createOption(player, player)));

  filterEl.disabled = players.length === 0;
  const selectedValue = players.includes(currentPlayerFilter) ? currentPlayerFilter : 'all';
  filterEl.value = selectedValue;
  currentPlayerFilter = selectedValue;
};

const escapeCssString = value => {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/([\\"'\[\]\:\.\,\>\+\~\^\$\*\|\=])/g, '\\$1');
};

const ensurePlayerStyles = nameColors => {
  const styleId = 'player-colors';
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = Object.entries(nameColors)
    .map(([name, hex]) => {
      const esc = escapeCssString(name);
      return `.player-name[data-player="${esc}"]{ color: ${hex}; }`;
    })
    .join('\n');
};

const getNextMonthDeadline = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 15, 20, 0, 0));
};

const savePairings = pairings => {
  localStorage.setItem('swu-pairings', JSON.stringify(pairings));
};

const restorePairings = () => {
  const saved = localStorage.getItem('swu-pairings');
  if (!saved) return null;

  try {
    return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to restore pairings:', e);
    return null;
  }
};

const saveWinnerSelections = () => {
  const winners = [];
  elements.resultsEl.querySelectorAll('.player-name.winner-selected').forEach(el => {
    winners.push({
      matchId: el.getAttribute('data-match-id'),
      player: el.getAttribute('data-player'),
    });
  });
  localStorage.setItem('swu-winners', JSON.stringify(winners));
};

const restoreWinnerSelections = () => {
  const saved = localStorage.getItem('swu-winners');
  if (!saved) return;

  try {
    const winners = JSON.parse(saved);
    winners.forEach(({ matchId, player }) => {
      elements.resultsEl.querySelectorAll('.player-name').forEach(el => {
        if (el.getAttribute('data-match-id') === matchId && el.getAttribute('data-player') === player) {
          el.classList.add('winner-selected');
        }
      });
    });
  } catch (e) {
    console.error('Failed to restore winner selections:', e);
  }
};

const updateMatchPlayed = (matchId, played) => {
  if (!currentPairings) return;
  const matchRef = parseMatchId(matchId);
  if (!matchRef) return;

  const round = currentPairings[matchRef.roundIndex];
  if (!round || !round.matches || !round.matches[matchRef.matchIndex]) return;

  round.matches[matchRef.matchIndex].played = played;
  savePairings(currentPairings);
};

const buildMatchItem = (match, matchId) => {
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
    li.appendChild(createPlayerNameSpan(who, matchId));
    li.appendChild(document.createTextNode(': BYE'));
  } else {
    li.appendChild(createPlayerNameSpan(match.player1, matchId));
    li.appendChild(document.createTextNode('vs '));
    li.appendChild(createPlayerNameSpan(match.player2, matchId));
  }

  return li;
};

const buildRoundBox = round => {
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
};

const render = (pairings, filterPlayer = 'all') => {
  const resultsEl = elements.resultsEl;
  clearElement(resultsEl);
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

  getSortedPlayers(visiblePairings).forEach(player => plainLines.push(`@${player}`));

  renderPlainOutput(plainLines);
};

const appendPlainTextLine = (container, line) => {
  const div = document.createElement('div');

  if (line === '<br>') {
    div.appendChild(document.createElement('br'));
    container.appendChild(div);
    return;
  }

  const mentionRE = /@([\w\-\s]+)/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionRE.exec(line)) !== null) {
    if (match.index > lastIndex) {
      div.appendChild(document.createTextNode(line.slice(lastIndex, match.index)));
    }

    const span = document.createElement('span');
    span.className = 'at-name';
    span.textContent = match[0];
    div.appendChild(span);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    div.appendChild(document.createTextNode(line.slice(lastIndex)));
  }

  if (!div.hasChildNodes()) {
    div.textContent = line;
  }

  container.appendChild(div);
};

const hslToHex = (h, s, l) => {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(-1, Math.min(Math.min(k - 3, 9 - k), 1));
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const initApp = () => {
  elements = {
    playersEl: document.getElementById('players'),
    roundsEl: document.getElementById('rounds'),
    generateBtn: document.getElementById('generate'),
    resetBtn: document.getElementById('reset'),
    exportBtn: document.getElementById('export'),
    filterEl: document.getElementById('player-filter'),
    resultsEl: document.getElementById('results'),
    plainOutEl: document.getElementById('plainOut'),
    menuToggleBtn: document.getElementById('menu-toggle'),
    menuPanel: document.getElementById('menu-panel'),
    manualPairingsBtn: document.getElementById('manual-pairings-btn'),
    manualPairingsPanel: document.getElementById('manualPairingsPanel'),
    manualPairingsInput: document.getElementById('manual-pairings-input'),
    manualPairingsLoadBtn: document.getElementById('manual-pairings-load'),
    manualPairingsCloseBtn: document.getElementById('manual-pairings-close'),
    manualPairingsErrorEl: document.getElementById('manual-pairings-error'),
  };

  const {
    playersEl,
    roundsEl,
    generateBtn,
    resetBtn,
    exportBtn,
    filterEl,
    resultsEl,
    menuToggleBtn,
    menuPanel,
    manualPairingsBtn,
    manualPairingsPanel,
    manualPairingsInput,
    manualPairingsLoadBtn,
    manualPairingsCloseBtn,
    manualPairingsErrorEl,
  } = elements;

  setPairingsLib(window.SWU?.Pairings || null);

  playersEl.setAttribute('aria-label', 'Players, comma separated');
  roundsEl.setAttribute('aria-label', 'Number of rounds');
  generateBtn.setAttribute('aria-controls', 'results');
  resultsEl.setAttribute('role', 'region');
  resultsEl.setAttribute('aria-live', 'polite');
  resultsEl.setAttribute('aria-label', 'Pairings results');
  resultsEl.setAttribute('tabindex', '-1');
  menuToggleBtn?.setAttribute('aria-expanded', 'false');

  const savedPlayers = localStorage.getItem('swu-players');
  if (savedPlayers) playersEl.value = savedPlayers;

  const savedRounds = localStorage.getItem('swu-rounds');
  if (savedRounds) roundsEl.value = savedRounds;

  playersEl.addEventListener('input', () => localStorage.setItem('swu-players', playersEl.value));
  roundsEl.addEventListener('input', () => localStorage.setItem('swu-rounds', roundsEl.value));

  const toggleMenuPanel = () => {
    const isHidden = menuPanel.hasAttribute('hidden');
    if (isHidden) {
      menuPanel.removeAttribute('hidden');
      menuToggleBtn.setAttribute('aria-expanded', 'true');
    } else {
      menuPanel.setAttribute('hidden', '');
      menuToggleBtn.setAttribute('aria-expanded', 'false');
    }
  };

  const openManualPairingsPanel = () => {
    manualPairingsPanel.removeAttribute('hidden');
    menuPanel.setAttribute('hidden', '');
    menuToggleBtn.setAttribute('aria-expanded', 'false');
    manualPairingsInput.focus();
  };

  generateBtn.addEventListener('click', () => {
    const raw = playersEl.value;
    const players = getPlayersFromText(raw);
    const rounds = parseInt(roundsEl.value, 10) || 1;

    if (players.length === 0) {
      clearElement(resultsEl);
      const message = document.createElement('em');
      message.textContent = 'Please enter at least one player.';
      resultsEl.appendChild(message);
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

  menuToggleBtn.addEventListener('click', toggleMenuPanel);
  manualPairingsBtn.addEventListener('click', openManualPairingsPanel);
  manualPairingsCloseBtn?.addEventListener('click', () => {
    manualPairingsPanel.setAttribute('hidden', '');
  });
  manualPairingsLoadBtn.addEventListener('click', () => {
    const raw = manualPairingsInput.value;
    try {
      loadManualPairingsFromText(raw);
      manualPairingsErrorEl.hidden = true;
      manualPairingsErrorEl.textContent = '';
      manualPairingsPanel.setAttribute('hidden', '');
    } catch (err) {
      manualPairingsErrorEl.hidden = false;
      manualPairingsErrorEl.textContent = err.message;
    }
  });

  exportBtn.addEventListener('click', () => {
    if (typeof exportPairingsImage === 'function') {
      exportPairingsImage(currentPairings, currentNameColors);
    } else {
      console.warn('Export image function is unavailable.');
    }
  });

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

    const playersInMatch = resultsEl.querySelectorAll('.player-name');
    const isSelected = target.classList.contains('winner-selected');
    playersInMatch.forEach(el => {
      if (el.getAttribute('data-match-id') === matchId) {
        el.classList.toggle('winner-selected', !isSelected);
      }
    });
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
    clearElement(resultsEl);
    clearElement(elements.plainOutEl);
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
};

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
    parseManualPairings,
    loadManualPairingsFromText,
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
