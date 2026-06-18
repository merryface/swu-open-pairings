const pairings = require('./src/pairings');
const ui = require('./src/ui');

describe('SWU open pairings', () => {
  let originalConfirm;

  beforeEach(() => {
    window.SWU = { Pairings: pairings };
    ui.setPairingsLib(pairings);

    document.body.innerHTML = `
      <textarea id="players"></textarea>
      <select id="rounds">
        <option>1</option>
        <option>2</option>
        <option selected>3</option>
      </select>
      <button id="generate"></button>
      <button id="reset"></button>
      <button id="export" disabled></button>
      <button id="menu-toggle"></button>
      <nav id="menu-panel" hidden></nav>
      <button id="manual-pairings-btn"></button>
      <section id="manualPairingsPanel" hidden></section>
      <textarea id="manual-pairings-input"></textarea>
      <button id="manual-pairings-load"></button>
      <button id="manual-pairings-close"></button>
      <p id="manual-pairings-error"></p>
      <select id="player-filter" disabled></select>
      <section id="results"></section>
      <pre id="plainOut"></pre>
    `;

    localStorage.clear();
    originalConfirm = window.confirm;
  });

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  test('shuffle preserves all values', () => {
    const values = [1, 2, 3, 4, 5];
    const output = pairings.shuffle(values.slice());
    expect(output.sort()).toEqual(values);
    expect(output).not.toBe(values);
  });

  test('findRoundMatches handles odd players with one bye and avoids repeat opponents', () => {
    const pool = ['Alice', 'Bob', 'Carol', null];
    const played = new Map([['Alice', new Set(['Bob'])], ['Bob', new Set(['Alice'])], ['Carol', new Set()]]);
    const matches = pairings.findRoundMatches(pool, played);

    expect(matches).toHaveLength(2);
    expect(matches.some(match => match.bye)).toBe(true);
    expect(pairings.hasRepeatMatch(matches, played)).toBe(false);
  });

  test('hasRepeatMatch detects repeated opponents', () => {
    const played = new Map([['A', new Set(['B'])], ['B', new Set(['A'])]]);
    const matches = [{ player1: 'A', player2: 'B' }];
    expect(pairings.hasRepeatMatch(matches, played)).toBe(true);
  });

  test('generatePairings creates valid rounds and default played flags', () => {
    const playersList = ['Alice', 'Bob', 'Carol'];
    const result = pairings.generatePairings(playersList, 2);

    expect(result).toHaveLength(2);
    expect(result.every(round => Number.isInteger(round.round))).toBe(true);
    expect(result.flatMap(round => round.matches).every(match => match.hasOwnProperty('played'))).toBe(true);
    expect(result.flatMap(round => round.matches).every(match => match.played === false)).toBe(true);
  });

  test('generatePairings throws when arguments are invalid', () => {
    expect(() => pairings.generatePairings('bad', 1)).toThrow(TypeError);
    expect(() => pairings.generatePairings(['Alice'], 0)).toThrow(TypeError);
    expect(() => pairings.generatePairings(['Alice'], 11)).toThrow(TypeError);
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

  test('formatDateHeading builds a readable date heading', () => {
    const date = new Date('2026-06-18T00:00:00Z');
    expect(ui.formatDateHeading(date)).toBe('Thursday 18th June 2026');
  });

  test('parseMatchId returns null for invalid identifiers', () => {
    expect(ui.parseMatchId('bad-id')).toBeNull();
    expect(ui.parseMatchId('r-1m')).toBeNull();
  });

  test('parseManualPairings returns structured pairings from raw text', () => {
    const raw = `The pairings for this month! Try and play as many of these as you can/want. Don't worry about getting all of them done (but try to play at least ONE 😅)
Round 1
Alice vs Bob
Carol: BYE
-----
***DEADLINE: Thursday 18th June 2026 20:00 UTC***
@Alice
@Bob
@Carol`;

    expect(ui.parseManualPairings(raw)).toEqual([
      { round: 1, matches: [
        { player1: 'Alice', player2: 'Bob', bye: false, played: false },
        { player1: 'Carol', player2: null, bye: true, played: false },
      ] },
    ]);
  });

  test('parseManualPairings throws when text cannot be parsed', () => {
    expect(() => ui.parseManualPairings('just some random text')).toThrow(/Could not parse manual pairings/);
  });

  test('filterPairings returns the original list when filter is all', () => {
    const pairingsData = [{ round: 1, matches: [{ player1: 'A', player2: 'B', bye: false }] }];
    expect(ui.filterPairings(pairingsData, 'all')).toBe(pairingsData);
  });

  test('filterPairings preserves original matchIndex metadata', () => {
    const pairingsData = [
      { round: 1, matches: [{ player1: 'Alice', player2: 'Bob', bye: false }, { player1: 'Carol', player2: 'Dave', bye: false }] },
      { round: 2, matches: [{ player1: 'Alice', player2: 'Carol', bye: false }] },
    ];

    expect(ui.filterPairings(pairingsData, 'Alice')).toEqual([
      { round: 1, matches: [{ player1: 'Alice', player2: 'Bob', bye: false, matchIndex: 0 }] },
      { round: 2, matches: [{ player1: 'Alice', player2: 'Carol', bye: false, matchIndex: 0 }] },
    ]);
  });

  test('savePairings and restorePairings persist data to localStorage', () => {
    const pairingsData = [{ round: 1, matches: [{ player1: 'X', player2: 'Y', bye: false, played: true }] }];
    ui.savePairings(pairingsData);
    expect(ui.restorePairings()).toEqual(pairingsData);
  });

  test('updateMatchPlayed toggles played flag and saves the change', () => {
    const pairingsData = [{ round: 1, matches: [{ player1: 'A', player2: 'B', bye: false, played: false }] }];
    ui.setCurrentPairings(pairingsData);
    ui.updateMatchPlayed('r1-m0', true);

    expect(ui.getCurrentPairings()[0].matches[0].played).toBe(true);
    expect(JSON.parse(localStorage.getItem('swu-pairings'))[0].matches[0].played).toBe(true);
  });

  test('updatePlayerFilterOptions disables dropdown when no players exist', () => {
    ui.initApp();
    ui.updatePlayerFilterOptions([]);
    expect(document.getElementById('player-filter').disabled).toBe(true);
  });

  test('initApp generates pairings, enables filter and export controls', () => {
    document.getElementById('players').value = 'Alice, Bob';
    document.getElementById('rounds').value = '2';
    ui.initApp();

    document.getElementById('generate').click();

    expect(document.getElementById('player-filter').disabled).toBe(false);
    expect(document.getElementById('export').disabled).toBe(false);
    expect(ui.getCurrentPairings()).not.toBeNull();
    expect(document.getElementById('results').textContent).toContain('Round 1');
  });

  test('manual pairings panel is hidden by default on page load', () => {
    ui.initApp();
    expect(document.getElementById('manualPairingsPanel').hasAttribute('hidden')).toBe(true);
  });

  test('menu toggle opens and closes the menu panel', () => {
    ui.initApp();
    const menuToggle = document.getElementById('menu-toggle');
    const menuPanel = document.getElementById('menu-panel');

    expect(menuPanel.hasAttribute('hidden')).toBe(true);
    menuToggle.click();
    expect(menuPanel.hasAttribute('hidden')).toBe(false);
    expect(menuToggle.getAttribute('aria-expanded')).toBe('true');

    menuToggle.click();
    expect(menuPanel.hasAttribute('hidden')).toBe(true);
    expect(menuToggle.getAttribute('aria-expanded')).toBe('false');
  });

  test('manual pairings button opens the manual pairings panel', () => {
    ui.initApp();
    document.getElementById('manual-pairings-btn').click();
    expect(document.getElementById('manualPairingsPanel').hasAttribute('hidden')).toBe(false);
  });

  test('manual pairings close button hides the manual panel', () => {
    ui.initApp();
    document.getElementById('manual-pairings-btn').click();
    expect(document.getElementById('manualPairingsPanel').hasAttribute('hidden')).toBe(false);
    document.getElementById('manual-pairings-close').click();
    expect(document.getElementById('manualPairingsPanel').hasAttribute('hidden')).toBe(true);
  });

  test('loadManualPairingsFromText loads manual pairings, enables export, and closes manual panel', () => {
    ui.initApp();

    const raw = `Round 1\nAlice vs Bob\nCarol: BYE\n-----\n***DEADLINE: Thursday 18th June 2026 20:00 UTC***\n@Alice\n@Bob\n@Carol`;
    document.getElementById('manual-pairings-btn').click();
    document.getElementById('manual-pairings-input').value = raw;
    document.getElementById('manual-pairings-load').click();

    expect(ui.getCurrentPairings()).toEqual([
      { round: 1, matches: [
        { player1: 'Alice', player2: 'Bob', bye: false, played: false },
        { player1: 'Carol', player2: null, bye: true, played: false },
      ] },
    ]);
    expect(document.getElementById('export').disabled).toBe(false);
  });

  test('render applies the played checkbox state from current pairings', () => {
    ui.initApp();
    const pairingsData = [{ round: 1, matches: [{ player1: 'Alice', player2: 'Bob', bye: false, played: true }] }];
    ui.render(pairingsData);

    const checkbox = document.querySelector('.match-played-checkbox');
    expect(checkbox.checked).toBe(true);
  });

  test('clicking player name toggles winner selection and saves to localStorage', () => {
    ui.initApp();
    const pairingsData = [{ round: 1, matches: [{ player1: 'Alice', player2: 'Bob', bye: false, played: false }] }];
    ui.setCurrentPairings(pairingsData);
    ui.render(pairingsData);

    const alice = document.querySelector('.player-name[data-player="Alice"]');
    alice.click();

    expect(alice.classList.contains('winner-selected')).toBe(true);
    expect(JSON.parse(localStorage.getItem('swu-winners'))).toEqual([
      { matchId: 'r1-m0', player: 'Alice' },
      { matchId: 'r1-m0', player: 'Bob' },
    ]);
  });

  test('checking a play checkbox persists the played status', () => {
    ui.initApp();
    const pairingsData = [{ round: 1, matches: [{ player1: 'Carol', player2: 'Dave', bye: false, played: false }] }];
    ui.setCurrentPairings(pairingsData);
    ui.render(pairingsData);

    const checkbox = document.querySelector('.match-played-checkbox');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));

    expect(ui.getCurrentPairings()[0].matches[0].played).toBe(true);
    expect(JSON.parse(localStorage.getItem('swu-pairings'))[0].matches[0].played).toBe(true);
  });

  test('reset clears all saved data and resets the UI', () => {
    window.confirm = jest.fn(() => true);
    localStorage.setItem('swu-players', 'Alice');
    localStorage.setItem('swu-rounds', '2');
    localStorage.setItem('swu-pairings', JSON.stringify([{ round: 1, matches: [{ player1: 'A', player2: 'B', bye: false, played: true }] }]));
    localStorage.setItem('swu-winners', JSON.stringify([{ matchId: 'r1-m0', player: 'A' }]));

    ui.initApp();
    document.getElementById('results').innerHTML = '<div>some results</div>';
    document.getElementById('plainOut').innerHTML = '<div>plain</div>';
    document.getElementById('reset').click();

    expect(localStorage.getItem('swu-players')).toBeNull();
    expect(localStorage.getItem('swu-rounds')).toBeNull();
    expect(localStorage.getItem('swu-pairings')).toBeNull();
    expect(localStorage.getItem('swu-winners')).toBeNull();
    expect(document.getElementById('results').innerHTML).toBe('');
    expect(document.getElementById('plainOut').innerHTML).toBe('');
  });

  test('initApp restores saved pairings and winner selections from localStorage', () => {
    const savedPairings = [{ round: 1, matches: [{ player1: 'Alice', player2: 'Bob', bye: false, played: true }] }];
    localStorage.setItem('swu-pairings', JSON.stringify(savedPairings));
    localStorage.setItem('swu-winners', JSON.stringify([{ matchId: 'r1-m0', player: 'Alice' }]));

    ui.initApp();

    expect(ui.getCurrentPairings()).toEqual(savedPairings);
    expect(document.getElementById('player-filter').disabled).toBe(false);
    expect(document.querySelector('.player-name[data-player="Alice"]').classList.contains('winner-selected')).toBe(true);
  });

  test('app.js bootstraps UI init on DOMContentLoaded', () => {
    const initSpy = jest.fn();
    window.SWU = { UI: { initApp: initSpy } };
    jest.resetModules();

    jest.isolateModules(() => {
      require('./app');
    });

    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true }));
    expect(initSpy).toHaveBeenCalled();
  });
});
