const { generatePairings } = require('./src/pairings');

if (require.main === module) {
  const argv = process.argv.slice(2);
  let rounds = 3;
  let players = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'];

  if (argv.length > 0) {
    const n = parseInt(argv[0], 10);
    if (!Number.isNaN(n) && n > 0) rounds = n;
    if (argv.length > 1) players = argv.slice(1);
  }

  console.log(`Generating ${rounds} rounds for ${players.length} players...`);
  const pairings = generatePairings(players, rounds);
  console.log(JSON.stringify(pairings, null, 2));
}

module.exports = { generatePairings };
