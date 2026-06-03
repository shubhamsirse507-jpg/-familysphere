import { runSeeding } from './src/seed.js';
runSeeding(true).then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
