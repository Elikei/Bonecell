const OpList = require('./operation').list;
const OpNew = require('./operation').new;
const OpAdd = require('./operation').superadd;

module.exports = function optionRoute(op, param) {
  switch (op) {
    case 'new':
      OpNew(param);
      break;
    case 'list':
      OpList(param);
      break;
    case 'add':
      OpAdd(param);
      break;
    case 'remove':
      console.log('🚧');
      break;
    case 'copy':
      console.log('🚧');
      break;
    case 'check':
      console.log('🚧');
      break;
    default:
      console.log('❓Unknow option.')
  }
};
