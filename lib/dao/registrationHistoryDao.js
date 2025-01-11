var query = require('./utils').query;

var saveOne = (uid, name, callback) => {
  const sl = 'INSERT INTO registration_history(uid, name) VALUES($1, $2)'
  const vle = [uid, name];
  query(sl, vle, callback);
} 
exports.saveOne = saveOne;
