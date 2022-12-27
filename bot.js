const mineflayer = require('mineflayer')
const pathfinder = require('mineflayer-pathfinder').pathfinder
const Movements = require('mineflayer-pathfinder').Movements
const ChatHelper = require('./ChatHelper')
const GenericHelpers = require('./GenericHelpers')
const fs = require('fs')
const path = require('path')

const bot = mineflayer.createBot({
  host: "65.109.165.130",
  username: 'dkskkffkdkzifkz@gmail.com',
  auth: 'microsoft',
  disableChatSigning: true,
  physicsEnabled: true
})

bot.loadPlugin(ChatHelper)
bot.loadPlugin(pathfinder)

function injectModules (bot) {
  const MODULES_DIRECTORY = path.join(__dirname, 'modules')
  const modules = fs
    .readdirSync(MODULES_DIRECTORY) // find the plugins
    .filter(x => x.endsWith('.js')) // only use .js files
    .map(pluginName => require(path.join(MODULES_DIRECTORY, pluginName)))

  console.log(`Loading ${modules.length} modules`)
  bot.loadPlugins(modules)
}

injectModules(bot)

bot.on('login', () => {
  const defaultMove = new Movements(bot)
  defaultMove.canDig = false
  defaultMove.allow1by1towers = false
  bot.pathfinder.setMovements(defaultMove)

  // Round positions to bypass the anti-human check
  const handler = {
    get (target, prop, receiver) {
      if (prop in target && (typeof target[prop] !== 'function' || /^\s*class\s+/.test(target[prop].toString()))) {
        return Reflect.get(...arguments)
      }

      return (...args) => {
        if (prop === 'write' && (args[0] === 'position' || args[0] === 'position_look')) {
          args[1].x = GenericHelpers.roundNum(args[1].x)
          args[1].z = GenericHelpers.roundNum(args[1].z)
        }
        if (prop in target) return target[prop](...args)
      }
    }
  }
  bot._client = new Proxy(bot._client, handler)
})

// Log errors and kick reasons:
bot.on('end', (reason, loggedIn) => {
  console.log(reason, loggedIn)
  process.exit()
})
bot.on('kicked', (reason, loggedIn) => {
  console.log(reason, loggedIn)
  process.exit()
})
bot.on('error', (reason) => {
  console.log(reason)
  process.exit()
})
