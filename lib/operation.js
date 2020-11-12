const fs = require('fs');
const path = require('path');
const checkParam = require('./utils').checkParam;
const getTempContent = require('./tempHandler').getTempContent;
const initFile = require('./tempHandler').initFile;
const config = require('../configger')();

exports.list = function (param) {
  if (!checkParam('list' ,param)) {
    return;
  }

  const [proj, apiGroup] = [param[0], param[1]];

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
};

exports.new = function (param) {
  if (!checkParam('new', param) ) {
    return;
  }
  const [proj, apiGroup] = [param[0], param[1]];
  let [controllerContent, interfaceContent, schemaContent, serviceContent] = [
    getTempContent('controller'),
    getTempContent('interface'),
    getTempContent('schema'),
    getTempContent('service')
  ];

  initFile(controllerContent, param, 'controller');
  initFile(interfaceContent, param, 'interfaces');
  initFile(schemaContent, param, 'schemas');
  initFile(serviceContent, param, 'services');

  console.log('Done!')
  return;
}
