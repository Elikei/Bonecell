const fs = require('fs');
const path = require('path');
const config = require('../configger')();

exports.getTempContent = function(temp) {
  const file = ('template/' + temp);
  return fs.readFileSync(file, 'utf8');
}

exports.initFile = function(content, param, type) {
  let middlePath = 'src/lib/' + type;
  if (type === 'controller') {
    middlePath = 'src/app/controller'
  }
  const file = path.join(config.projDir[param[0]], middlePath, param[1] + '.ts');
  content = content.replace(/🦴/g, param[1]);
  fs.writeFileSync(file, content, 'utf8');
  console.log('🖌  ' + type + ' Done!')
}
