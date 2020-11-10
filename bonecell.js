const route = require('./lib/route.js')

function start() {
  const d = process.argv;
  const [option, param] = [d[2], d.slice(3)];
  route(option, param);
};

start();
