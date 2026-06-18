// src/pairings.js

const MAX_ROUNDS = 10;

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
      if (cand === null) {
        bestIdx = k;
        bestScore = -1;
        break;
      }
      const cnt = playedMap.get(a)?.has(cand) ? 1 : 0;
      if (cnt < bestScore) {
        bestScore = cnt;
        bestIdx = k;
        if (bestScore === 0) break;
      }
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
      m.played = false;
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

const pairings = {
  MAX_ROUNDS,
  shuffle,
  findRoundMatches,
  hasRepeatMatch,
  generatePairings,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = pairings;
}

if (typeof window !== 'undefined') {
  window.SWU = window.SWU || {};
  window.SWU.Pairings = pairings;
}
