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

  if (!fs.existsSync('mapping.json')) {
    const mapping = structure.channels
      .map((channel) => channel.id || channel.name)
      .reduce((result, item) => {
        result[item] = '';
        return result;
      }, {});
    const mappingString = JSON.stringify(mapping, null, 2);
    fs.writeFileSync('mapping.json', mappingString);
    console.log(
      'Mapping file has been created, please adapt it to fit your needs.'
    );
    return;
  }

  const mapping = JSON.parse(fs.readFileSync('mapping.json'));
  Object.keys(mapping).forEach((key) => {
    structure.channels = structure.channels.map((channel) => {
      if ((channel.id || channel.name) === key) {
        return {
          ...channel,
          discordId: mapping[key],
        };
      }
      return channel;
    });
  });

  structure.channels.forEach((channel) => {
    if (!('discordId' in channel)) {
      console.log(
        `WARNING: Channel "${
          channel.id || channel.name
        }" was not configured in mapping file. Continuing, this channel will be viewed as non-existent.`
      );
      channel.discordId = '';
    }
  });

  let touchedChannels = guild.channels.cache.map((channel) => channel.id);

  for (let i = 0; i < structure.channels.length; i++) {
    const channel = structure.channels[i];
    touchedChannels = touchedChannels.filter((c) => c !== channel.discordId);
    let discordChannel = guild.channels.resolve(channel.discordId);
    if (discordChannel) {
      console.log(`Channel "${channel.id || channel.name}" found.`);
    } else {
      discordChannel = await guild.channels.create(channel.name, [
        channel.type,
      ]);
      mapping[channel.id || channel.name] = discordChannel.id;
    }
    await discordChannel.setName(channel.name);
    await discordChannel.setPosition(channel.position);
    await discordChannel.setNSFW(channel.nsfw);
    await discordChannel.setTopic(channel.topic);
  }
  const mappingString = JSON.stringify(mapping, null, 2);
  fs.writeFileSync('mapping.json', mappingString);

  touchedChannels.forEach((channel) => {
    guild.channels.resolve(channel).delete();
  });

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    console.log(action.verbose);
    guild = await action.exec();
  }
};
