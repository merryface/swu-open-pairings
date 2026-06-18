const pairings = require('./src/pairings');
const ui = require('./src/ui');

describe('SWU open pairings', () => {
  beforeEach(() => {
    window.SWU = { Pairings: pairings };
    ui.setPairingsLib(pairings);
    document.body.innerHTML = `
      <textarea id="players"></textarea>
      <select id="rounds"><option>3</option></select>
      <button id="generate"></button>
      <button id="reset"></button>
      <button id="export"></button>
      <select id="player-filter"></select>
      <section id="results"></section>
      <pre id="plainOut"></pre>
    `;
    localStorage.clear();
  });

  test('shuffle preserves all values', () => {
    const values = [1, 2, 3, 4, 5];
    const output = pairings.shuffle(values.slice());
    expect(output.sort()).toEqual(values);
    expect(output).not.toBe(values);
  });

  test('getPlayersFromText splits on commas and newlines', () => {
    const text = 'Alice, Bob\nCarol,\nDave';
    expect(ui.getPlayersFromText(text)).toEqual(['Alice', 'Bob', 'Carol', 'Dave']);
  });

  test('ordinalSuffix formats numbers correctly', () => {
    expect(ui.ordinalSuffix(1)).toBe('st');
    expect(ui.ordinalSuffix(2)).toBe('nd');
    expect(ui.ordinalSuffix(3)).toBe('rd');
    expect(ui.ordinalSuffix(4)).toBe('th');
    expect(ui.ordinalSuffix(11)).toBe('th');
    expect(ui.ordinalSuffix(12)).toBe('th');
    expect(ui.ordinalSuffix(13)).toBe('th');
    expect(ui.ordinalSuffix(21)).toBe('st');
  });

  test('generatePairings avoids repeats for 4 players', () => {
    const playersList = ['Alice', 'Bob', 'Carol', 'Dave'];
    const generated = pairings.generatePairings(playersList, 3);
    const seen = new Set();

    generated.forEach(round => {
      round.matches.forEach(match => {
        if (match.player1 && match.player2) {
          const keyA = `${match.player1}-${match.player2}`;
          const keyB = `${match.player2}-${match.player1}`;
          expect(seen.has(keyA)).toBe(false);
          expect(seen.has(keyB)).toBe(false);
          seen.add(keyA);
          seen.add(keyB);
        }
      });
    });
  });

  test('filterPairings selects only matching player rounds', () => {
    const pairingsData = [
      { round: 1, matches: [{ player1: 'Alice', player2: 'Bob', bye: false }, { player1: 'Carol', player2: 'Dave', bye: false }] },
      { round: 2, matches: [{ player1: 'Alice', player2: 'Carol', bye: false }] },
      { round: 3, matches: [{ player1: 'Bob', player2: 'Dave', bye: false }] },
    ];

    expect(ui.filterPairings(pairingsData, 'Alice')).toEqual([
      { round: 1, matches: [{ player1: 'Alice', player2: 'Bob', bye: false, matchIndex: 0 }] },
      { round: 2, matches: [{ player1: 'Alice', player2: 'Carol', bye: false, matchIndex: 0 }] },
    ]);
  });

  test('filterPairings returns all when player is all', () => {
    const pairingsData = [{ round: 1, matches: [{ player1: 'A', player2: 'B', bye: false }] }];
    expect(ui.filterPairings(pairingsData, 'all')).toBe(pairingsData);
  });

  test('parseMatchId returns zero-based indices', () => {
    expect(ui.parseMatchId('r2-m3')).toEqual({ roundIndex: 1, matchIndex: 3 });
    expect(ui.parseMatchId('r10-m0')).toEqual({ roundIndex: 9, matchIndex: 0 });
  });

  test('savePairings and restorePairings persist data', () => {
    const pairingsData = [{ round: 1, matches: [{ player1: 'X', player2: 'Y', bye: false, played: true }] }];
    ui.savePairings(pairingsData);
    expect(ui.restorePairings()).toEqual(pairingsData);
  });

  test('updateMatchPlayed toggles played flag in current pairings', () => {
    const pairingsData = [{ round: 1, matches: [{ player1: 'A', player2: 'B', bye: false, played: false }] }];
    ui.setCurrentPairings(pairingsData);
    ui.updateMatchPlayed('r1-m0', true);
    expect(ui.getCurrentPairings()[0].matches[0].played).toBe(true);
  });

  test('filtered checkbox updates the original match and persists played state', () => {
    const pairingsData = [{
      round: 1,
      matches: [
        { player1: 'Alice', player2: 'Bob', bye: false, played: false },
        { player1: 'Carol', player2: 'Dave', bye: false, played: false },
      ],
    }];

    document.body.innerHTML = `
      <textarea id="players"></textarea>
      <select id="rounds"><option>1</option></select>
      <button id="generate"></button>
      <button id="reset"></button>
      <button id="export"></button>
      <select id="player-filter"></select>
      <section id="results"></section>
      <pre id="plainOut"></pre>
    `;

    ui.setCurrentPairings(pairingsData);
    ui.initApp();
    ui.render(pairingsData, 'Carol');

    const checkbox = document.querySelector('.match-played-checkbox');
    checkbox.checked = true;
    checkbox.dispatchEvent(new window.Event('change', { bubbles: true }));

    expect(ui.getCurrentPairings()[0].matches[0].played).toBe(false);
    expect(ui.getCurrentPairings()[0].matches[1].played).toBe(true);

    const stored = JSON.parse(localStorage.getItem('swu-pairings'));
    expect(stored[0].matches[1].played).toBe(true);
  });

  test('updatePlayerFilterOptions populates dropdown options', () => {
    ui.initApp();
    ui.updatePlayerFilterOptions(['Alice', 'Bob']);
    const filterEl = document.getElementById('player-filter');
    expect(filterEl.options.length).toBe(3);
    expect(filterEl.options[0].value).toBe('all');
    expect(filterEl.options[1].value).toBe('Alice');
    expect(filterEl.options[2].value).toBe('Bob');
  });

  test('initApp wires generate event and filter dropdown', () => {
    document.getElementById('players').value = 'Alice, Bob';
    document.getElementById('rounds').value = '2';
    ui.initApp();

    document.getElementById('generate').click();
    expect(document.getElementById('player-filter').disabled).toBe(false);
    expect(ui.getCurrentPairings()).not.toBeNull();
    expect(document.getElementById('results').innerHTML).toContain('Round 1');
  });
});
