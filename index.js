#!/usr/bin/env node

const Discord = require('discord.js');

const context = {
  info: require('./package.json'),
  argv: process.argv,
  applets: {
    invite: require('./applets/invite.js'),
    apply: require('./applets/apply.js'),
  },
};

console.log('Discord-As-Code v' + context.info.version);

module.paths.push(process.cwd());
context.structure = require('structure.js');

context.client = new Discord.Client();

context.client.waitForReady = () =>
  new Promise((resolve) => context.client.on('ready', resolve));

const main = async () => {
  await context.client.waitForReady();
  console.log('Connection to Discord succeeded!');

  const applet = process.argv[2].toLowerCase();
  console.log('Running: ' + applet);
  await context.applets[applet](context);
  console.log('Applet execution finished: ' + applet);

  context.client.destroy();
};

main();

context.client.login(context.structure.authentication.botToken);
