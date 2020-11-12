const OpList = require('./operation').list;
const OpNew = require('./operation').new;

module.exports = function optionRoute(op, param) {
  switch (op) {
    case 'new':
      OpNew(param);
      break;
    case 'list':
      OpList(param)
      break;
    case 'add':
      console.log('🚧');
      break;
    case 'remove':
      console.log('🚧');
      break;
    case 'copy':
      console.log('🚧');
      break;
    default:
      console.log('❓Unknow option.')
  }
};
