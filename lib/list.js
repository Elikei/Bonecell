const fs = require('fs');
const path = require('path');
const config = require('../configger')();

module.exports = function list(param) {
  if (!param[0] || !param[1]) {
    console.log('Failed to list. param error');
  }
  const [proj, apiGroup] = [param[0], param[1]];
  if (!config.projDir[proj]) {
    console.log(proj + ' Not found!');
    return;
  }

  const filePath = path.join(config.projDir[proj], 'src/app/controller', apiGroup + '.ts');
  let content = fs.readFileSync(filePath, 'utf8');
  const rows = content.split('\n');
  let counter = 1;

  console.log('📜 ' + proj + ' -> ' + apiGroup + ':');
  console.log('-------------------')
  for (let i of rows) {
    if (i.indexOf('summary') > 0) {
      console.log(counter + ". " + i.split("'")[1]);
      counter++;
    }
  }

}

// list(['point-platform', 'sys-role']);
