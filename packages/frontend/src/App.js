import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newItem, setNewItem] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [sortAlpha, setSortAlpha] = useState(false);

  const displayedData = sortAlpha
    ? [...data].sort((a, b) => a.name.localeCompare(b.name))
    : data;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/items');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to fetch data: ' + err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditingName(item.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleUpdate = async (id) => {
    if (!editingName.trim()) return;
    try {
      const response = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName }),
      });
      if (!response.ok) {
        throw new Error('Failed to update item');
      }
      const updated = await response.json();
      setData(data.map((item) => (item.id === id ? updated : item)));
      setEditingId(null);
      setEditingName('');
    } catch (err) {
      setError('Error updating item: ' + err.message);
      console.error('Error updating item:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const response = await fetch(`/api/items/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete item');
      }
      setData(data.filter((item) => item.id !== id));
    } catch (err) {
      setError('Error deleting item: ' + err.message);
      console.error('Error deleting item:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newItem }),
      });

      if (!response.ok) {
        throw new Error('Failed to add item');
      }

      const result = await response.json();
      setData([...data, result]);
      setNewItem('');
    } catch (err) {
      setError('Error adding item: ' + err.message);
      console.error('Error adding item:', err);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Hello World</h1>
        <p>Connected to in-memory database</p>
      </header>
      
      <main>
        <section className="add-item-section">
          <h2>Add New Item</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Enter item name"
            />
            <button type="submit">Add Item</button>
          </form>
        </section>

        <section className="items-section">
          <h2>Items from Database</h2>
          <button
            className={`sort-btn${sortAlpha ? ' sort-btn--active' : ''}`}
            onClick={() => setSortAlpha(!sortAlpha)}
          >
            {sortAlpha ? 'Sort: A → Z (on)' : 'Sort: A → Z (off)'}
          </button>
          {loading && <p>Loading data...</p>}
          {error && <p className="error">{error}</p>}
          {!loading && !error && (
            <ul>
              {displayedData.length > 0 ? (
                displayedData.map((item) => (
                  <li key={item.id}>
                    {editingId === item.id ? (
                      <>
                        <input
                          className="edit-input"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          aria-label="Edit item name"
                        />
                        <div className="item-actions">
                          <button className="save-btn" onClick={() => handleUpdate(item.id)}>Save</button>
                          <button className="cancel-btn" onClick={handleCancelEdit}>Cancel</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span>{item.name}</span>
                        <div className="item-actions">
                          <button className="edit-btn" onClick={() => handleEdit(item)}>Edit</button>
                          <button className="delete-btn" onClick={() => handleDelete(item.id)}>Delete</button>
                        </div>
                      </>
                    )}
                  </li>
                ))
              ) : (
                <p>No items found. Add some!</p>
              )}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;