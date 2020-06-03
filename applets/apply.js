const fs = require('fs');
const crypto = require('crypto-js');

const truncate = (str, n) => {
  return str.length > n ? str.substr(0, n - 1) + '...' : str;
};

module.exports = async (context) => {
  const { client, structure } = context;
  const actions = [];

  const addAction = (exec) => {
    const info = exec();

    if (info.old === info.new && info.old !== 'NOT_KNOWN') {
      return;
    }

    const verbose = `Applying ${info.property} "${truncate(
      info.new,
      30
    )}" (Old: "${truncate(info.old, 30)}")`;
    actions.push({
      verbose,
      exec: () => info.exec(info.new, `[DaC] ${verbose}`),
    });
  };

  let guild = client.guilds.resolve(structure.serverInfo.guildId);

  addAction(() => ({
    old: guild.name,
    new: structure.serverInfo.name,
    property: 'server name',
    exec: async (newValue, reason) => {
      return await guild.setName(newValue, reason);
    },
  }));

  addAction(() => ({
    old: 'NOT_KNOWN',
    new: structure.serverInfo.icon,
    property: 'server icon',
    exec: async (newValue, reason) => {
      return await guild.setIcon(structure.serverInfo.icon, reason);
    },
  }));

  console.log(guild.channels);

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    console.log(action.verbose);
    guild = await action.exec();
  }
};
