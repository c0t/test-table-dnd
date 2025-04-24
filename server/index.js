const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Массив чисел от 1 до 1,000,000
const items = Array.from({ length: 1000000 }, (_, i) => ({
  id: i + 1,
  value: i + 1,
}))

// Хранилище состояния (выбранные элементы и порядок)
let selectedItems = new Set();
let customOrder = [];

// Получение элементов с пагинацией и фильтрацией
app.get('/api/items', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const search = req.query.search || '';
  const startIndex = (page - 1) * limit;

  // Фильтрация
  let filteredItems = items;
  if (search) {
    filteredItems = items.filter(item => item.value.toString().includes(search));
  }

  // Применение пользовательского порядка, если он есть
  let resultItems = filteredItems;
  if (customOrder.length > 0) {
    const orderedItems = [];
    const itemMap = new Map(filteredItems.map(item => [item.id, item]));
    customOrder.forEach(id => {
      if (itemMap.has(id)) orderedItems.push(itemMap.get(id));
    });
    resultItems = [
      ...orderedItems,
      ...filteredItems.filter(item => !customOrder.includes(item.id)),
    ];
  }

  // Пагинация
  const paginatedItems = resultItems.slice(startIndex, startIndex + limit);
  res.json({
    items: paginatedItems,
    total: filteredItems.length,
    selected: Array.from(selectedItems),
  });
});

// Обновление порядка элементов
app.post('/api/order', (req, res) => {
  customOrder = req.body.order;
  res.json({ success: true });
});

// Обновление выбранных элементов
app.post('/api/select', (req, res) => {
  selectedItems = new Set(req.body.selected);
  res.json({ success: true });
});

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});