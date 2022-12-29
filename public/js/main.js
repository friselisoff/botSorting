function itemDragStart (event) {
  event
    .dataTransfer
    .setData('text/plain', event.target.id)
}

function dragOver (event) {
  event.preventDefault()
}

function categoryDrop (event) {
  const id = event
    .dataTransfer
    .getData('text')

  const draggableElement = document.getElementById(id)
  const oldItems = draggableElement.closest('.items')

  const items = event.target.closest('.category').querySelector('.items')

  items.appendChild(draggableElement)

  sortSlots(oldItems)
  sortSlots(items)

  event
    .dataTransfer
    .clearData()
}

function removeDrop (event) {
  const id = event
    .dataTransfer
    .getData('text')

  const draggableElement = document.getElementById(id)
  const oldItems = draggableElement.closest('.items')

  draggableElement.remove()

  sortSlots(oldItems)

  event
    .dataTransfer
    .clearData()
}

function sortSlots (items) {
  items.querySelectorAll('span.item').forEach(element => {
    element.remove()
  })

  const itemCount = items.children.length
  let remaining = (Math.ceil(itemCount / 10) * 10) - itemCount
  remaining = remaining === 0 ? 10 : remaining

  for (let index = 0; index < remaining; index++) {
    items.innerHTML += '<span class="item"></span>'
  }
}

function newCategory () {
  let id = prompt('Enter a name for the new category')

  if (id == null) return
  id = id.toUpperCase()
  document.querySelector('main').innerHTML += `<div class="category" id="${id}" ondragover="dragOver(event)" ondrop="categoryDrop(event)"><div class="title">${id.charAt(0).toUpperCase() + id.substr(1).toLowerCase()}</div><div class="items"></div></div>`
  sortSlots(document.querySelector(`#${id} .items`))
}

function saveCategories () {
  const newData = {}
  document.querySelectorAll('.category').forEach(category => {
    newData[category.id] = []
    category.querySelectorAll('img.item').forEach(item => {
      newData[category.id].push(item.id)
    })
  })

  fetch('/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newData)
  }).then(() => { window.location.reload() }).catch((e) => { alert('Unable to save category data!\n' + e.message.trim()) })
}

function addItem () {
  let id = prompt('Enter a name for the new item')

  if (id == null) return
  id = id.toLowerCase()
  id = id.replaceAll(' ', '_')

  const items = document.getElementById('Not Sorted').querySelector('.items')
  items.innerHTML += `<img class="item" draggable="true" ondragstart="itemDragStart(event)" src="https://github.com/Jens-Co/MinecraftItemImages/raw/main/1.19/${id}.png" alt="${id}" id="${id}" title="${id}">`

  sortSlots(items)
}
