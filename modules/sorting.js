const mineflayer = require('mineflayer') // eslint-disable-line

const { GoalGetToBlock } = require('mineflayer-pathfinder').goals
const genericHelper = require('../GenericHelpers')
const logger = require('../logger')
const fs = require('fs')
const { Vec3 } = require('vec3')

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

      // Find the comparator
      const comparator = bot.findBlock({
        point: bot.entity.position,
        matching: (block) => block.name === 'comparator'
      })

      if (!comparator) {
        logger.error('Unable to locate comparator')
        return
      }

      if (bot.waitingForAction) {
        logger.warn('Skipping sort due to already doing something')
        return
      }

      if (!comparator._properties.powered) return

      logger.info('Starting sort')

      bot.waitingForAction = true

      // Find the signs
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

        const match = signText.match(categoryRegex)
        if (!match) return false
        const category = match[1].toUpperCase()

        return category in sortingCategoryRaw
      }).map(e => {
        const signBlock = bot.blockAt(e)
        const chestOffset = CARDINALS[signBlock._properties.facing].scaled(-1)
        return [signBlock, bot.blockAt(e.offset(chestOffset.x * 3, 1, chestOffset.z * 3))]
      })

      // Goto the sorting chest/comparator
      await bot.pathfinder.goto(new GoalGetToBlock(comparator.position.x - 1, comparator.position.y, comparator.position.z))

      // Get the sort chest and open it
      const sortChestOffset = CARDINALS[comparator._properties.facing]
      const sortChestBlock = bot.blockAt(comparator.position.offset(sortChestOffset.x, 0, sortChestOffset.z))
      const sortChest = await bot.openChest(sortChestBlock)

      // Dump any unsorted items we have into the sort chest
      await Promise.all(bot.inventory.items().map(async e => {
        await sortChest.deposit(e.type, null, e.count).catch(() => {})
      }))

      await genericHelper.sleep(500)

      // Go over all the items to sort and find the stored category for each
      let changed = false
      const sortingCategoryRawCopy = { ...sortingCategoryRaw }
      const selectedCategories = []
      for (const item of sortChest.containerItems()) {
        const cat = findCategory(item.name)
        if (cat) {
          if (!(selectedCategories.includes(cat))) {
            selectedCategories.push(cat)
          }

          // We know the category so take the item
          await sortChest.withdraw(item.type, null, item.count).catch(() => {})
        } else if (!sortingCategoryRawCopy['Not Sorted'].includes(item.name)) {
          // We dont know the category so add the item to not sorted
          changed = true
          sortingCategoryRawCopy['Not Sorted'].push(item.name)
        }
      }

      // If the categories have changed then save the file
      if (changed) fs.writeFileSync(sortingCategoryFile, JSON.stringify(sortingCategoryRawCopy, null, 2))

      await genericHelper.sleep(1000)

      sortChest.close()

      if (selectedCategories.length !== 0) {
        logger.info('Sorting: ' + JSON.stringify(selectedCategories))

        // Handle each category item
        for (const selectedCat of selectedCategories) {
          const selectedSign = signs.find(e => e[0].signText.trim().match(categoryRegex)[1].toUpperCase() === selectedCat)

          if (selectedSign) {
            await bot.pathfinder.goto(new GoalGetToBlock(selectedSign[1].position.x - 1, selectedSign[1].position.y, selectedSign[1].position.z))

            // Open the category chest and store the items for that chest
            const blockchest = bot.blockAt(selectedSign[1].position)
            const chest = await bot.openChest(blockchest)
            await Promise.all(bot.inventory.items().map(async e => {
              const cat = findCategory(e.name)
              if (cat) {
                if (cat === selectedCat) {
                  await chest.deposit(e.type, null, e.count).catch(() => {})
                }
              }
            }))

            await genericHelper.sleep(1000)

            chest.close()
          } else {
            logger.warn(`Unable to find category chest for '${selectedCat}'`)
            // TODO Return item back to sort chest
          }
        }

        logger.info('Finished sorting')
      }
      // logger.debug(signs.map(e => e[0].signText.trim()), signs.map(e => e[1].name), signs.length)
      bot.waitingForAction = false
    }, 1000)
  })
}
