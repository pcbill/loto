var query = require('./utils').query;

var saveOne = (game_id, result ) => {
  const sl = 'INSERT INTO history(game_id, result) VALUES($1, $2) RETURNING *'
  const vle = [game_id, result];
  query(sl, vle, () => {
    console.log({action:'save one history', game_id});
  });
} 
exports.saveOne = saveOne;