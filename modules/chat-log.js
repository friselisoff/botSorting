const mineflayer = require('mineflayer') // eslint-disable-line

/**
 * @param {mineflayer.Bot} bot // to enable intellisense
 */
module.exports = bot => {
  // Log user messages
  bot.on('handleChat', (username, message, reply) => {
    console.log(`<${username}> ${message}`)
  })

  // Log system messages
  bot.on('message', (msg, position, sender) => {
    if (position !== 'system') return
    console.log(msg.getText())
  })
}
