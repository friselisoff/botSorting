const mineflayer = require('mineflayer') // eslint-disable-line

const { GoalGetToBlock } = require('mineflayer-pathfinder').goals
const mcData = require('minecraft-data')('1.19.2')
const genericHelper = require('../GenericHelpers')
const fs = require('fs')
const { Vec3 } = require('vec3')

let isSorting = false
const categoryRegex = /\[(.*?)\]/
const sortingCategoryFile = 'sortingCategory.json'

const CARDINALS = {
  north: new Vec3(0, 0, -1),
  south: new Vec3(0, 0, 1),
  west: new Vec3(-1, 0, 0),
  east: new Vec3(1, 0, 0)
}

/**
 * @param {mineflayer.Bot} bot // to enable intellisense
 */
module.exports = bot => {
  bot.on('spawn', () => {
    setInterval(async () => {
      const sortingCategoryRaw = fs.existsSync(sortingCategoryFile) ? JSON.parse(fs.readFileSync(sortingCategoryFile)) : {}
      const sortingCategory = Object.entries(sortingCategoryRaw)

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
        matching: (block) => block.name === 'comparator'
      })

      if (comparator && !isSorting && comparator._properties.powered) {
        isSorting = true
        const signs = bot.findBlocks({
          maxDistance: 50,
          count: 1000,
          point: bot.entity.position,
          matching: (block) => block.name.endsWith('_wall_sign')
        }).filter(e => {
          const signBlock = bot.blockAt(e)
          const signText = signBlock.signText.trim()
          const chestOffset = CARDINALS[signBlock._properties.facing].scaled(-1)
          const chestBlock = bot.blockAt(e.offset(chestOffset.x, 0, chestOffset.z))

          if (!chestBlock || chestBlock.name !== 'chest') return false
          if (signText === 'PUT ITEM TO SORT\nHERE') return false // Not sure this is needed due to the regex

          const match = signText.match(categoryRegex)
          if (!match) return false
          const category = match[1]

          return category in sortingCategoryRaw
        }).map(e => {
          const signBlock = bot.blockAt(e)
          const chestOffset = CARDINALS[signBlock._properties.facing].scaled(-1)
          return [signBlock, bot.blockAt(e.offset(chestOffset.x * 3, 1, chestOffset.z * 3))]
        })

        await bot.pathfinder.goto(new GoalGetToBlock(comparator.position.x - 1, comparator.position.y, comparator.position.z))

        const sortChestOffset = CARDINALS[comparator._properties.facing]
        const sortChestBlock = bot.blockAt(comparator.position.offset(sortChestOffset.x, 0, sortChestOffset.z))
        const sortChest = await bot.openChest(sortChestBlock)

        await Promise.all(bot.inventory.items().map(async e => {
          await sortChest.deposit(e.type, null, e.count).catch(console.error)
        }))

        await genericHelper.sleep(500)
        const sortingCategoryRawCopy = { ...sortingCategoryRaw }
        let selectedCat = ''
        await Promise.all(sortChest.containerItems().map(async e => {
          const cat = findCategory(e.name)
          if (cat) {
            if (selectedCat === '') {
              selectedCat = cat
            }
            if (cat === selectedCat) {
              await sortChest.withdraw(e.type, null, e.count).catch(console.error)
            }
          } else if (!sortingCategoryRawCopy['Not Sorted'].includes(e.name)) {
            sortingCategoryRawCopy['Not Sorted'].push(e.name)
          }
        }))

        fs.writeFileSync(sortingCategoryFile, JSON.stringify(sortingCategoryRawCopy, null, 2))

        await genericHelper.sleep(1000)

        sortChest.close()

        if (selectedCat !== '') {
          const selectedSign = signs.find(e => e[0].signText.trim().match(categoryRegex)[1] === selectedCat)

          if (selectedSign) {
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
          } else {
            console.log(`Unable to find category chest for '${selectedCat}'`)
            // TODO Return item back to sort chest
          }
        }
        // console.log(signs.map(e => e[0].signText.trim()), signs.map(e => e[1].name), signs.length)
        isSorting = false
      }
    }, 1000)
  })
}
