const { Vec3 } = require('vec3')
const { sleep } = require('mineflayer/lib/promise_utils')

exports.sleep = sleep

function roundNum (num) {
  return Math.round(num * 100) / 100
}
exports.roundNum = roundNum

function roundPos (pos) {
  return new Vec3(roundNum(pos.x), roundNum(pos.y), roundNum(pos.z))
}
exports.roundPos = roundPos

function clamp (num, min, max) {
  return Math.min(Math.max(num, min), max)
}
exports.clamp = clamp

function lerpVec3 (start, end, dist) {
  dist = clamp(dist, 0, 1)
  return new Vec3(
    start.x + (end.x - start.x) * dist,
    start.y + (end.y - start.y) * dist,
    start.z + (end.z - start.z) * dist
  )
}
exports.lerpVec3 = lerpVec3

async function gotoPos (bot, pos) {
  pos = roundPos(pos)
  const dist = bot.entity.position.distanceTo(pos)
  const split = 9.5
  const botPos = bot.entity.position
  if (dist > split) {
    for (let i = 1; i <= Math.ceil(dist / split); i++) {
      const pcg = ((100 / Math.ceil(dist / split)) * i) / 100
      const target = roundPos(lerpVec3(botPos, pos, pcg))
      console.log(target, pcg, bot.entity.position.distanceTo(target))
      bot.entity.position = target
      await sleep(100)
    }
  } else {
    bot.entity.position = pos
  }
}
exports.gotoPos = gotoPos
