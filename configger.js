const fs = require('fs');
const yaml = require('js-yaml');

//need to be single
module.exports = function config() {
  return yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));
}
