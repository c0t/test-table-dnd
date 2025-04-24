import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './App.css';

const SortableItem = ({ id, value, index, selected, handleSelect }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <td>
        <input
          id={`checkbox-${id}`}
          name={`checkbox-${id}`}
          type="checkbox"
          checked={selected.has(id)}
          onChange={() => handleSelect(id)}
        />
      </td>
      <td>{value}</td>
    </tr>
  );
};

const App = () => {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Настройка сенсоров для Drag&Drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Минимальное расстояние для активации Drag&Drop
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Загрузка данных
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/items?page=${page}&search=${search}`);
      setItems(prev => (page === 1 ? response.data.items : [...prev, ...response.data.items]));
      setTotal(response.data.total);
      setSelected(new Set(response.data.selected));
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Обработка скролла для пагинации
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 100 &&
        items.length < total &&
        !loading
      ) {
        setPage(prev => prev + 1);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [items.length, total, loading]);

  // Обработка выбора
  const handleSelect = async (id) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
    try {
      await axios.post('/api/select', { selected: Array.from(newSelected) });
    } catch (error) {
      console.error('Ошибка сохранения выбора:', error);
    }
  };

  // Обработка Drag&Drop
  const onDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex(item => item.id === active.id);
    const newIndex = items.findIndex(item => item.id === over.id);

    const reorderedItems = [...items];
    const [movedItem] = reorderedItems.splice(oldIndex, 1);
    reorderedItems.splice(newIndex, 0, movedItem);

    setItems(reorderedItems);
    try {
      await axios.post('/api/order', {
        order: reorderedItems.map(item => item.id),
      });
    } catch (error) {
      console.error('Ошибка сохранения порядка:', error);
    }
  };

  // Обработка поиска
  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
    setItems([]);
  };

  return (
    <div className="App">
      <h1>Список чисел</h1>
      <input
        id="search-input"
        name="search"
        type="text"
        placeholder="Поиск..."
        value={search}
        onChange={handleSearch}
        style={{ marginBottom: '20px', padding: '8px', width: '200px' }}
      />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <table>
          <thead>
            <tr>
              <th>Выбрать</th>
              <th>Значение</th>
            </tr>
          </thead>
          <tbody>
            <SortableContext
              items={items.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.length > 0 ? (
                items.map((item, index) => (
                  <SortableItem
                    key={item.id}
                    id={item.id}
                    value={item.value}
                    index={index}
                    selected={selected}
                    handleSelect={handleSelect}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan="2">Нет данных</td>
                </tr>
              )}
            </SortableContext>
          </tbody>
        </table>
      </DndContext>
      {loading && <p>Загрузка...</p>}
    </div>
  );
};

export default App;