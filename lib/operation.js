const fs = require('fs');
const path = require('path');
const checkParam = require('./utils').checkParam;
const getJsonContent = require('./tempHandler').getJsonContent;
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

exports.new = function(param) {
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

  return;
}

exports.add = function(param) {
  if (!checkParam('add', param)) {
    return;
  }
  let [controllerItemContent, interfaceItemContent, schemaItemContent, serviceItemContent] = [
    getTempContent('controllerItem'),
    getTempContent('interfaceItem'),
    getTempContent('schemaItem'),
    getTempContent('serviceItem')
  ];

  initFile(controllerItemContent, param, 'controller', 'CS');
  initFile(serviceItemContent, param, 'services', 'CS');
  initFile(interfaceItemContent, param, 'interfaces', 'IS');
  initFile(schemaItemContent, param, 'schemas', 'IS');
  return;
}

exports.add = function(param) {
  if (!checkParam('add', param)) {
    return;
  }

  let [controllerItemContent, interfaceItemContent, schemaItemContent, serviceItemContent, jsonContent] = [
    getTempContent('controllerItem'),
    getTempContent('interfaceItem'),
    getTempContent('schemaItem'),
    getTempContent('serviceItem')
  ];

  initFile(controllerItemContent, param, 'controller', 'CS');
  initFile(serviceItemContent, param, 'services', 'CS');
  initFile(interfaceItemContent, param, 'interfaces', 'IS');
  initFile(schemaItemContent, param, 'schemas', 'IS');
  return;
}

exports.superadd = function (param) {
  if (!checkParam('add', param)) {
    return;
  }
  let jsonContent = getJsonContent(param[0]);
  let [controllerItemContent, interfaceItemContent, schemaItemContent, serviceItemContent] = [
    getTempContent('controllerItem' + '_' +jsonContent.method),
    getTempContent('interfaceItem'),
    getTempContent('schemaItem'),
    getTempContent('serviceItem'),
  ];

  initFile(controllerItemContent, jsonContent, 'controller', 'CS');
  initFile(serviceItemContent, jsonContent, 'services', 'CS');
  initFile(interfaceItemContent, jsonContent, 'interfaces', 'IS');
  initFile(schemaItemContent, jsonContent, 'schemas', 'IS');
  return;
}
