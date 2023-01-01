const mineflayer = require('mineflayer') // eslint-disable-line
const { GoalGetToBlock } = require('mineflayer-pathfinder').goals

const GenericHelpers = require('../GenericHelpers')
const logger = require('../logger')

/**
 * @param {mineflayer.Bot} bot // to enable intellisense
 */
module.exports = bot => {
  bot.on('handleChat', (username, message, isWhisper, reply) => {
    if (message.split(' ')[0] !== '!sleep') return

    // Find the bed
    const bedPos = bot.findBlocks({
      matching: (block) => {
        return bot.isABed(block)
      }
    })

    // Make sure we found a bed
    if (bedPos.length === 0) return

    // Get the bed block
    const bedBlock = bot.blockAt(bedPos[0])
    if (bedBlock == null) return

    // Make sure we are not waiting or sleeping
    if (bot.waitingForAction || bot.isSleeping) return

    // Walk to the bed and use it to sleep
    bot.waitingForAction = true
    bot.pathfinder.goto(new GoalGetToBlock(bedBlock.position.x, bedBlock.position.y, bedBlock.position.z)).then(async () => {
      bot.sleep(bedBlock).then(() => {
        reply('Going to sleep, sweet dreams. Zzz')
      }).catch((e) => { logger.error(e) /* Quietly fail */ }).finally(async () => {
        await GenericHelpers.sleep(100)
        bot.waitingForAction = false
      })
    })
  })
}
