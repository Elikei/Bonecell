module.exports = async (agent: any) => {
  agent.messenger.on('egg-ready', () => {
    agent.messenger.sendToApp('cmq-pull-action', {});
  });
};
