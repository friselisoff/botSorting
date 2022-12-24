const mineflayer = require('mineflayer') // eslint-disable-line

const express = require('express')
const fs = require('fs')

const sortingCategoryFile = 'sortingCategory.json'
const port = 3000

/**
 * @param {mineflayer.Bot} bot // to enable intellisense
 */
module.exports = bot => {
  const app = express()
  app.set('view engine', 'ejs')
  app.use(express.static('public'))
  app.use(express.json())

  app.get('/', (req, res) => {
    const sortingCategory = fs.existsSync(sortingCategoryFile) ? JSON.parse(fs.readFileSync(sortingCategoryFile)) : {}
    res.render('pages/index', { categories: sortingCategory })
  })

  app.post('/save', (req, res) => {
    console.log('Got new category data', req.body)
    fs.writeFileSync(sortingCategoryFile, JSON.stringify(req.body, null, 2))
    res.json({ success: true })
  })

  app.listen(port, () => {
    console.log(`Sorting web interface listening on port ${port}`)
  })
}
