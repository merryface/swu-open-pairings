// src/pairings.js
// Cleaner BYE logic: uses explicit bye flag, never uses null as a player name

const MAX_ROUNDS = 10;

const shuffle = array => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// Match players avoiding repeats. Returns array of { player1, player2 } pairs.
// For odd-length input, last element is the bye player (caller handles it separately)
const matchPlayers = (players, playedMap) => {
  const n = players.length;
  const used = new Array(n).fill(false);
  const matches = [];

  const backtrack = () => {
    let i = 0;
    while (i < n && used[i]) i++;
    if (i >= n) return true;

    used[i] = true;
    const p1 = players[i];

    for (let j = i + 1; j < n; j++) {
      if (used[j]) continue;
      const p2 = players[j];
      const havePlayed = playedMap.get(p1)?.has(p2);
      if (havePlayed) continue;

      used[j] = true;
      matches.push({ player1: p1, player2: p2 });

      if (backtrack()) return true;

      matches.pop();
      used[j] = false;
    }

    used[i] = false;
    return false;
  };

  if (backtrack()) return matches.slice();

  // Fallback: greedy matching - pick best available opponent
  const rem = players.slice();
  const fallback = [];
  while (rem.length >= 2) {
    const a = rem.shift();
    
    let bestIdx = 0;
    let bestScore = Infinity;
    for (let k = 0; k < rem.length; k++) {
      const cand = rem[k];
      const cnt = playedMap.get(a)?.has(cand) ? 1 : 0;
      if (cnt < bestScore) {
        bestScore = cnt;
        bestIdx = k;
        if (bestScore === 0) break;
      }
    }

    const b = rem.splice(bestIdx, 1)[0];
    fallback.push({ player1: a, player2: b });
  }

  return fallback;
};

const hasRepeatMatch = (matches, playedMap) => {
  return matches.some(({ player1, player2 }) => {
    return playedMap.get(player1)?.has(player2);
  });
};

const generatePairings = (players, rounds) => {
  if (!Array.isArray(players)) throw new TypeError('players must be an array');
  if (!Number.isInteger(rounds) || rounds < 1) throw new TypeError('rounds must be a positive integer');
  if (rounds > MAX_ROUNDS) throw new TypeError(`rounds cannot exceed ${MAX_ROUNDS}`);

  console.log('[Pairings] generatePairings called with:', { players, rounds });
  
  // Filter out null/undefined/empty players
  const validPlayers = players.filter(p => p !== null && p !== undefined && String(p).trim() !== '');
  console.log('[Pairings] Valid players after filtering:', validPlayers);
  
  if (validPlayers.length === 0) {
    throw new Error('No valid players provided');
  }

  // Track who has played whom
  const played = new Map();
  for (const p of validPlayers) {
    played.set(p, new Set());
  }

  const result = [];
  const maxAttempts = 10;
  let byeRotationIndex = 0; // Simple rotation for bye assignment

  for (let r = 0; r < rounds; r++) {
    let matches;
    let attempt = 0;
    let byePlayer = null;

    do {
      const pool = shuffle(validPlayers.slice());
      
      // If odd number of players, extract one for bye (rotate through players)
      if (pool.length % 2 === 1) {
        byePlayer = pool[byeRotationIndex % pool.length];
        pool.splice(pool.indexOf(byePlayer), 1);
        byeRotationIndex++;
      }
      
      matches = matchPlayers(pool, played);
      attempt += 1;
    } while (attempt < maxAttempts && hasRepeatMatch(matches, played));

    if (hasRepeatMatch(matches, played)) {
      console.warn(`Could not avoid repeat opponents after ${maxAttempts} attempts for round ${r + 1}. Using best available pairing.`);
    }

    // Update played history and mark all matches
    for (const m of matches) {
      m.played = false;
      m.bye = false;
      const { player1, player2 } = m;
      
      // Verify players are in played map
      if (!played.has(player1)) {
        throw new Error(`Player "${player1}" not found in players list`);
      }
      if (!played.has(player2)) {
        throw new Error(`Player "${player2}" not found in players list`);
      }
      
      played.get(player1).add(player2);
      played.get(player2).add(player1);
    }
    
    // Add bye match if there's an odd player
    if (byePlayer) {
      matches.push({
        player1: byePlayer,
        player2: null,
        bye: true,
        played: false
      });
    }

    result.push({ round: r + 1, matches });
  }

  return result;
};

const pairings = {
  MAX_ROUNDS,
  shuffle,
  matchPlayers,
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
