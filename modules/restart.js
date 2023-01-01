const mineflayer = require('mineflayer') // eslint-disable-line

/**
 * @param {mineflayer.Bot} bot // to enable intellisense
 */
module.exports = bot => {
  // Simple command to let people know we are a bot
  bot.on('handleChat', (username, message, isWhisper, reply) => {
    if (message.split(' ')[0] !== '!restart') return
    if (!isWhisper) return
    if (username !== "friselis" && username !== "rtm516") return
    reply('Restarting...')
    console.log(`${username} requested a restart!`)
    process.exit()
  })
}
