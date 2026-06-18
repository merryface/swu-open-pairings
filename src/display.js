/**
 * Shared display/render logic for pairings
 * Used by both the generator (ui.js) and viewer (pairings-display.js)
 */

const hslToHex = (h, s, l) => {
  s /= 100;
  l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return "#" + [f(0), f(8), f(4)].map(x => {
    const hex = Math.round(255 * x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

const generatePlayerColors = (players) => {
  const colors = {};
  const playerArray = Array.from(players).sort();
  playerArray.forEach((player, index) => {
    const hue = Math.round(((index * 360) / playerArray.length + 40) % 360);
    colors[player] = hslToHex(hue, 78, 56);
  });
  return colors;
};

const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
};

const extractPlayers = (rounds) => {
  const players = new Set();
  rounds.forEach(round => {
    round.matches?.forEach(match => {
      const home = (match.home || match.player1 || '').replace(/:\s*$/, '').trim();
      const away = (match.away || match.player2 || '').replace(/:\s*$/, '').trim();
      if (home && home !== 'BYE') players.add(home);
      if (away && away !== 'BYE') players.add(away);
    });
  });
  return players;
};

const buildMatchHTML = (match, playerColors, isAdmin = false, roundIdx = 0) => {
  const home = (match.home || match.player1 || '').replace(/:\s*$/, '').trim();
  const away = (match.away || match.player2 || '').replace(/:\s*$/, '').trim();
  const isBye = match.bye === true;
  const isPlayed = match.played;

  let html = `<li class="match-item ${isBye ? 'bye' : ''}">`;

  // Status indicator
  if (isAdmin) {
    html += `<input type="checkbox" class="match-played-checkbox" ${isPlayed ? 'checked' : ''} data-match-id="${match.id || ''}" data-round-idx="${roundIdx}" />`;
  } else {
    if (isPlayed) {
      html += `<span style="color: var(--accent); font-weight: 700; margin-right: 10px;">✓</span>`;
    } else {
      html += `<span style="color: var(--muted); font-weight: 700; margin-right: 10px; opacity: 0.3;">✗</span>`;
    }
  }

  // Player names
  if (isBye) {
    html += `<span class="player-name" style="color: ${playerColors[home] || 'inherit'}">${escapeHtml(home)}</span>`;
    html += `: BYE`;
  } else {
    html += `<span class="player-name" style="color: ${playerColors[home] || 'inherit'}">${escapeHtml(home)}</span>`;
    html += ` vs <span class="player-name" style="color: ${playerColors[away] || 'inherit'}">${escapeHtml(away)}</span>`;
  }
  html += `</li>`;

  return html;
};

const renderRounds = (rounds, playerColors, isAdmin = false) => {
  let html = '';
  let plainText = '';

  rounds.forEach((round, roundIdx) => {
    const roundNumber = round.round || roundIdx + 1;
    html += `<div class="round-box"><h3 class="round-title">Round ${roundNumber}</h3>`;
    plainText += `Round ${roundNumber}\n`;

    html += '<ul class="matches-list">';
    round.matches?.forEach((match, idx) => {
      const home = (match.home || match.player1 || '').replace(/:\s*$/, '').trim();
      const away = (match.away || match.player2 || '').replace(/:\s*$/, '').trim();
      const isBye = match.bye === true;
      
      if (isBye && !home) {
        console.warn('[Display] BYE match with no player:', { match, home, roundIdx, idx });
      }

      html += buildMatchHTML(match, playerColors, isAdmin, roundIdx);

      if (isBye) {
        plainText += `${home}: BYE\n`;
      } else {
        plainText += `${home} vs ${away}\n`;
      }
    });
    html += '</ul>';
    html += `</div>`;
    plainText += `\n`;
  });

  return { html, plainText };
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    hslToHex,
    generatePlayerColors,
    escapeHtml,
    extractPlayers,
    buildMatchHTML,
    renderRounds,
  };
}

if (typeof window !== 'undefined') {
  window.SWU = window.SWU || {};
  window.SWU.Display = {
    hslToHex,
    generatePlayerColors,
    escapeHtml,
    extractPlayers,
    buildMatchHTML,
    renderRounds,
  };
}
