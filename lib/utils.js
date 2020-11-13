const config = require('../configger')();
const fs = require('fs');
const path = require('path');

exports.checkParam = function(op, param) {
  if (!param[0] || !param[1]) {
    console.log('❌ ' + 'Failed to list. param error');
    return false
  }

  if (!config.projDir[param[0]]) {
    console.log('❌ Project ' + param[0] + ' Not found!');
    return false;
  }

  if (op === 'list' || op === 'add') {
    if(!fs.existsSync(path.join(config.projDir[param[0]], 'src/app/controller', param[1] + '.ts'))) {
      console.log('❌ ApiGroup ' + param[1] + ' Not found!');
      return false;
    }
  }
  return true;
};
