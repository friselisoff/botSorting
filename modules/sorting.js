const mineflayer = require('mineflayer');
const { GoalGetToBlock } = require('mineflayer-pathfinder').goals
const mcData = require('minecraft-data')("1.19.2");
const genericHelper = require('../GenericHelpers');
const fs = require('fs');
const { cwd } = require('process');
let isSorting = false;
/**
 * @param {mineflayer.Bot} bot // to enable intellisense
 */
module.exports = bot => {
    bot.on("spawn", () => {
        setInterval(async () => {
            var sortingCategoryRaw = require("../sortingCategory.json");
            var sortingCategory = Object.entries(sortingCategoryRaw);
            delete require.cache[require.resolve('../sortingCategory.json')];
            let findCategory = (item_name) => {
                for (let k in sortingCategory) {
                    let cat = sortingCategory[k];
                    if (cat[1].includes(item_name) && cat[0] != "Not Sorted") {
                        return cat[0];
                    }
                }
                return null;
            }
            let comparator = bot.findBlock({
                point: bot.entity.position,
                matching: (block) => block && block.type === mcData.blocksByName["comparator"].id
            });
            if (comparator && !isSorting && comparator._properties.powered) {
                isSorting = true;
                let signs = bot.findBlocks({
                    maxDistance: 50,
                    count: 1000,
                    point: bot.entity.position,
                    matching: (block) => block.name == "oak_wall_sign"
                }).filter(e => {
                    let signBlock = bot.blockAt(e);
                    return bot.blockAt(e.offset(-1, 0, 0)).name == "chest" && signBlock.signText.trim() != "PUT ITEM TO SORT\nHERE" && !!sortingCategory.find((v) => signBlock.signText.trim().match(/\[(.*?)\]/) && signBlock.signText.trim().match(/\[(.*?)\]/)[1] == v[0])
                }).map(e => [bot.blockAt(e), bot.blockAt(e.offset(-3, 1, 0))]);
                await bot.pathfinder.goto(new GoalGetToBlock(comparator.position.x - 1, comparator.position.y, comparator.position.z));
                let blocksortchest = bot.blockAt(comparator.position.offset(1, 0, 0));
                let sortchest = await bot.openChest(blocksortchest);
                await Promise.all(bot.inventory.items().map(async e => {
                    await sortchest.deposit(e.type, null, e.count).catch(console.error);
                }));
                await genericHelper.sleep(500);
                let sortingCategoryRawCopy = { ...sortingCategoryRaw };
                let selectedCat = "";
                await Promise.all(sortchest.containerItems().map(async e => {
                    let cat = "";
                    if (cat = findCategory(e.name)) {
                        if (selectedCat == "") {
                            selectedCat = cat;
                        }
                        if (cat == selectedCat) {
                            await sortchest.withdraw(e.type, null, e.count).catch(console.error);
                        }
                    } else if (!sortingCategoryRawCopy['Not Sorted'].includes(e.name)) {
                        sortingCategoryRawCopy['Not Sorted'].push(e.name);
                    }
                }));
                fs.writeFileSync(cwd() + "/sortingCategory.json", JSON.stringify(sortingCategoryRawCopy, null, 4));
                await genericHelper.sleep(1000);
                sortchest.close();
                if (selectedCat != "") {
                    let selectedSign = signs.find(e => e[0].signText.trim().match(/\[(.*?)\]/)[1] == selectedCat);
                    await bot.pathfinder.goto(new GoalGetToBlock(selectedSign[1].position.x - 1, selectedSign[1].position.y, selectedSign[1].position.z));
                    let blockchest = bot.blockAt(selectedSign[1].position);
                    let chest = await bot.openChest(blockchest);
                    await Promise.all(bot.inventory.items().map(async e => {
                        let cat = "";
                        if (cat = findCategory(e.name)) {
                            if (cat == selectedCat) {
                                await chest.deposit(e.type, null, e.count).catch(console.error);
                            }
                        }
                    }));
                    await genericHelper.sleep(1000);
                    chest.close();
                }
                // console.log(signs.map(e => e[0].signText.trim()), signs.map(e => e[1].name), signs.length)
                isSorting = false;
            }
        }, 1000);
    });
}
