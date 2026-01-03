"use strict";

/**
 * Shuffle array in-place using Fisher-Yates.
 * Returns the same array reference.
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Attempt to find a pairing for one round with no repeat opponents using backtracking.
 * If no such complete matching exists, return a fallback greedy matching that minimizes repeats.
 *
 * players: array (already shuffled) with even length (a null may be present to represent bye)
 * playedMap: Map(player -> Set(opponents already played))
 */
function findRoundMatches(players, playedMap) {
  const n = players.length;
  const used = new Array(n).fill(false);
  const matches = [];

  function backtrack() {
    // find first unused index
    let i = 0;
    while (i < n && used[i]) i++;
    if (i >= n) return true; // all paired

    used[i] = true;
    const p1 = players[i];

    for (let j = i + 1; j < n; j++) {
      if (used[j]) continue;
      const p2 = players[j];

      // allow pairing if either is a bye (null) or they haven't played before
      const havePlayed = p1 !== null && p2 !== null && playedMap.get(p1)?.has(p2);
      if (havePlayed) continue;

      used[j] = true;
      matches.push({ player1: p1, player2: p2, bye: p1 === null || p2 === null });

      if (backtrack()) return true;

      // undo
      matches.pop();
      used[j] = false;
    }

    used[i] = false;
    return false;
  }

  if (backtrack()) return matches.slice();

  // Fallback: greedy matching that prefers partners with fewer prior meetings
  const rem = players.slice();
  const fallback = [];
  while (rem.length) {
    const a = rem.shift();
    if (a === null) {
      const b = rem.shift();
      fallback.push({ player1: a, player2: b, bye: true });
      continue;
    }

    // choose partner with minimal times played against 'a'
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

/**
 * Generate randomized pairings for a number of rounds while avoiding repeat opponents as much as possible.
 *
 * Inputs:
 * - players: array of player identifiers (strings or numbers)
 * - rounds: positive integer number of rounds to generate
 *
 * Output: array of rounds. Each round is an object:
 * { round: <n>, matches: [ { player1, player2, bye: boolean }, ... ] }
 * If the number of players is odd, a bye is represented by player2 === null and bye=true.
 */
function generatePairings(players, rounds) {
  if (!Array.isArray(players)) throw new TypeError("players must be an array");
  if (!Number.isInteger(rounds) || rounds < 1) throw new TypeError("rounds must be a positive integer");

  // Initialize played map: player -> Set(opponents)
  const played = new Map();
  for (const p of players) {
    played.set(p, new Set());
  }

  const result = [];

  for (let r = 0; r < rounds; r++) {
    // Shuffle players each round to randomize ordering
    const pool = shuffle(players.slice());

    // If odd, add a null representing a bye
    if (pool.length % 2 === 1) pool.push(null);

    const matches = findRoundMatches(pool, played);

    // Update played map for all non-bye matches
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

module.exports = { generatePairings };

// Simple CLI/demo runner when executed directly
if (require.main === module) {
  // Usage: node index.js [rounds] [player1 player2 ...]
  const argv = process.argv.slice(2);
  let rounds = 3;
  let players = ["Alice", "Bob", "Carol", "Dave", "Eve"];

  if (argv.length > 0) {
    const n = parseInt(argv[0], 10);
    if (!Number.isNaN(n) && n > 0) rounds = n;
    if (argv.length > 1) players = argv.slice(1);
  }

  console.log(`Generating ${rounds} rounds for ${players.length} players...`);
  const pairings = generatePairings(players, rounds);
  console.log(JSON.stringify(pairings, null, 2));
}
