const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors({
  origin: ['https://ppqp.ru', 'https://www.ppqp.ru', 'http://localhost:5000', 'http://185.221.214.24:5000', 'http://ppqp.ru:5000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// Массив чисел от 1 до 1,000,000
const items = Array.from({ length: 1000000 }, (_, i) => ({
  id: i + 1,
  value: i + 1,
}));

// Хранилище состояния
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

  // Применение пользовательского порядка
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

// Обслуживание статических файлов React
app.use(express.static(path.join(__dirname, '../client/build')));
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});