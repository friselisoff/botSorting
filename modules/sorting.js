const mineflayer = require('mineflayer') // eslint-disable-line

const { GoalGetToBlock } = require('mineflayer-pathfinder').goals
const mcData = require('minecraft-data')('1.19.2')
const genericHelper = require('../GenericHelpers')
const fs = require('fs')
const { cwd } = require('process')

let isSorting = false
const categoryRegex = /\[(.*?)\]/

/**
 * @param {mineflayer.Bot} bot // to enable intellisense
 */
module.exports = bot => {
  bot.on('spawn', () => {
    setInterval(async () => {
      const sortingCategoryRaw = require('../sortingCategory.json')
      const sortingCategory = Object.entries(sortingCategoryRaw)
      delete require.cache[require.resolve('../sortingCategory.json')]

      const findCategory = (itemName) => {
        for (const k in sortingCategory) {
          const cat = sortingCategory[k]
          if (cat[1].includes(itemName) && cat[0] !== 'Not Sorted') {
            return cat[0]
          }
        }
        return null
      }

      const comparator = bot.findBlock({
        point: bot.entity.position,
        matching: (block) => block && block.type === mcData.blocksByName.comparator.id
      })

      if (comparator && !isSorting && comparator._properties.powered) {
        isSorting = true
        const signs = bot.findBlocks({
          maxDistance: 50,
          count: 1000,
          point: bot.entity.position,
          matching: (block) => block.name === 'oak_wall_sign'
        }).filter(e => {
          const signBlock = bot.blockAt(e)
          const signText = signBlock.signText.trim()
          const chestBlock = bot.blockAt(e.offset(-1, 0, 0))

          if (chestBlock.name !== 'chest') return false
          if (signText === 'PUT ITEM TO SORT\nHERE') return false

          const match = signText.match(categoryRegex)
          if (!match) return false
          const category = match[1]

          return category in sortingCategory
        }).map(e => [bot.blockAt(e), bot.blockAt(e.offset(-3, 1, 0))])

        await bot.pathfinder.goto(new GoalGetToBlock(comparator.position.x - 1, comparator.position.y, comparator.position.z))

        const blocksortchest = bot.blockAt(comparator.position.offset(1, 0, 0))
        const sortchest = await bot.openChest(blocksortchest)

        await Promise.all(bot.inventory.items().map(async e => {
          await sortchest.deposit(e.type, null, e.count).catch(console.error)
        }))

        await genericHelper.sleep(500)
        const sortingCategoryRawCopy = { ...sortingCategoryRaw }
        let selectedCat = ''
        await Promise.all(sortchest.containerItems().map(async e => {
          const cat = findCategory(e.name)
          if (cat) {
            if (selectedCat === '') {
              selectedCat = cat
            }
            if (cat === selectedCat) {
              await sortchest.withdraw(e.type, null, e.count).catch(console.error)
            }
          } else if (!sortingCategoryRawCopy['Not Sorted'].includes(e.name)) {
            sortingCategoryRawCopy['Not Sorted'].push(e.name)
          }
        }))

        fs.writeFileSync(cwd() + '/sortingCategory.json', JSON.stringify(sortingCategoryRawCopy, null, 2))

        await genericHelper.sleep(1000)

        sortchest.close()

        if (selectedCat !== '') {
          const selectedSign = signs.find(e => e[0].signText.trim().match(/\[(.*?)\]/)[1] === selectedCat)

          await bot.pathfinder.goto(new GoalGetToBlock(selectedSign[1].position.x - 1, selectedSign[1].position.y, selectedSign[1].position.z))

          const blockchest = bot.blockAt(selectedSign[1].position)
          const chest = await bot.openChest(blockchest)
          await Promise.all(bot.inventory.items().map(async e => {
            const cat = findCategory(e.name)
            if (cat) {
              if (cat === selectedCat) {
                await chest.deposit(e.type, null, e.count).catch(console.error)
              }
            }
          }))

          await genericHelper.sleep(1000)

          chest.close()
        }
        // console.log(signs.map(e => e[0].signText.trim()), signs.map(e => e[1].name), signs.length)
        isSorting = false
      }
    }, 1000)
  })
}
