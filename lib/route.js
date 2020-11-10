const OpList = require('./list');

module.exports = function optionRoute(op, param) {
  switch (op) {
    case 'new':
      console.log('new');
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
