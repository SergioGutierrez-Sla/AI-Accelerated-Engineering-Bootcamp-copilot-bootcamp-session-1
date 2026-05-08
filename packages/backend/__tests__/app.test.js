const request = require('supertest');
const { app, db } = require('../src/app');

// Close the database connection after all tests
afterAll(() => {
  if (db) {
    db.close();
  }
});

describe('API Endpoints', () => {
  describe('GET /api/items', () => {
    it('should return all items', async () => {
      const response = await request(app).get('/api/items');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Check if items have the expected structure
      const item = response.body[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('created_at');
    });
  });

  describe('POST /api/items', () => {
    it('should create a new item', async () => {
      const newItem = { name: 'Test Item' };
      const response = await request(app)
        .post('/api/items')
        .send(newItem)
        .set('Accept', 'application/json');
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newItem.name);
      expect(response.body).toHaveProperty('created_at');
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({})
        .set('Accept', 'application/json');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Item name is required');
    });

    it('should return 400 if name is empty', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({ name: '' })
        .set('Accept', 'application/json');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Item name is required');
    });
  });

  describe('PUT /api/items/:id', () => {
    it('should update an existing item', async () => {
      const created = await request(app)
        .post('/api/items')
        .send({ name: 'Original Name' })
        .set('Accept', 'application/json');

      const id = created.body.id;

      const response = await request(app)
        .put(`/api/items/${id}`)
        .send({ name: 'Updated Name' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(id);
      expect(response.body.name).toBe('Updated Name');
    });

    it('should return 404 when updating a non-existent item', async () => {
      const response = await request(app)
        .put('/api/items/99999')
        .send({ name: 'Any Name' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Item not found');
    });

    it('should return 400 if name is empty when updating', async () => {
      const created = await request(app)
        .post('/api/items')
        .send({ name: 'Some Item' })
        .set('Accept', 'application/json');

      const response = await request(app)
        .put(`/api/items/${created.body.id}`)
        .send({ name: '' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Item name is required');
    });
  });

  describe('DELETE /api/items/:id', () => {
    it('should delete an existing item', async () => {
      // First create an item to delete
      const created = await request(app)
        .post('/api/items')
        .send({ name: 'Item to Delete' })
        .set('Accept', 'application/json');

      const id = created.body.id;

      const response = await request(app).delete(`/api/items/${id}`);
      expect(response.status).toBe(204);

      // Confirm it no longer exists
      const getResponse = await request(app).get('/api/items');
      const ids = getResponse.body.map((i) => i.id);
      expect(ids).not.toContain(id);
    });

    it('should return 404 when deleting a non-existent item', async () => {
      const response = await request(app).delete('/api/items/99999');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Item not found');
    });
  });
});