module.exports = async (context) => {
  const link = await context.client.generateInvite([
    'MANAGE_GUILD',
    'MANAGE_ROLES',
  ]);
  console.log('Invite link: ' + link);
};
