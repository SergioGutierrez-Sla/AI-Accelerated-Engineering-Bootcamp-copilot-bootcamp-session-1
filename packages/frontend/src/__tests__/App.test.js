import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import App from '../App';

// Mock server to intercept API requests
const server = setupServer(
  // GET /api/items handler
  rest.get('/api/items', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        { id: 1, name: 'Test Item 1', created_at: '2023-01-01T00:00:00.000Z' },
        { id: 2, name: 'Test Item 2', created_at: '2023-01-02T00:00:00.000Z' },
      ])
    );
  }),
  
  // POST /api/items handler
  rest.post('/api/items', (req, res, ctx) => {
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Item name is required' })
      );
    }
    
    return res(
      ctx.status(201),
      ctx.json({
        id: 3,
        name,
        created_at: new Date().toISOString(),
      })
    );
  }),

  // DELETE /api/items/:id handler
  rest.delete('/api/items/:id', (req, res, ctx) => {
    return res(ctx.status(204));
  }),

  // PUT /api/items/:id handler
  rest.put('/api/items/:id', (req, res, ctx) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res(ctx.status(400), ctx.json({ error: 'Item name is required' }));
    }
    return res(
      ctx.status(200),
      ctx.json({ id: Number(id), name, created_at: '2023-01-01T00:00:00.000Z' })
    );
  })
);

// Setup and teardown for the mock server
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('App Component', () => {
  test('renders the header', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.getByText('Connected to in-memory database')).toBeInTheDocument();
  });

  test('loads and displays items', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Initially shows loading state
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
    
    // Wait for items to load
    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    });
  });

  test('adds a new item', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(<App />);
    });
    
    // Wait for items to load
    await waitFor(() => {
      expect(screen.queryByText('Loading data...')).not.toBeInTheDocument();
    });
    
    // Fill in the form and submit
    const input = screen.getByPlaceholderText('Enter item name');
    await act(async () => {
      await user.type(input, 'New Test Item');
    });
    
    const submitButton = screen.getByText('Add Item');
    await act(async () => {
      await user.click(submitButton);
    });
    
    // Check that the new item appears
    await waitFor(() => {
      expect(screen.getByText('New Test Item')).toBeInTheDocument();
    });
  });

  test('handles API error', async () => {
    // Override the default handler to simulate an error
    server.use(
      rest.get('/api/items', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    
    await act(async () => {
      render(<App />);
    });
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch data/)).toBeInTheDocument();
    });
  });

  test('shows empty state when no items', async () => {
    // Override the default handler to return empty array
    server.use(
      rest.get('/api/items', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json([]));
      })
    );
    
    await act(async () => {
      render(<App />);
    });
    
    // Wait for empty state message
    await waitFor(() => {
      expect(screen.getByText('No items found. Add some!')).toBeInTheDocument();
    });
  });

  test('deletes an item when Delete button is clicked', async () => {
    const user = userEvent.setup();
    window.confirm = jest.fn(() => true);

    await act(async () => {
      render(<App />);
    });

    // Wait for items to load
    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    });

    // Click the Delete button for the first item
    const deleteButtons = screen.getAllByText('Delete');
    await act(async () => {
      await user.click(deleteButtons[0]);
    });

    // Item should be removed from the list
    await waitFor(() => {
      expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
    });
  });

  test('does not delete item when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    window.confirm = jest.fn(() => false);

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    await act(async () => {
      await user.click(deleteButtons[0]);
    });

    // Item should still be in the list
    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
  });

  test('edits an item and saves the updated name', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    });

    // Click Edit on the first item
    const editButtons = screen.getAllByText('Edit');
    await act(async () => {
      await user.click(editButtons[0]);
    });

    // An input should appear pre-filled with the item name
    const editInput = screen.getByDisplayValue('Test Item 1');
    expect(editInput).toBeInTheDocument();

    // Clear and type a new name
    await act(async () => {
      await user.clear(editInput);
      await user.type(editInput, 'Updated Item 1');
    });

    // Click Save
    await act(async () => {
      await user.click(screen.getByText('Save'));
    });

    // Updated name should appear in the list
    await waitFor(() => {
      expect(screen.getByText('Updated Item 1')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Updated Item 1')).not.toBeInTheDocument();
    });
  });

  test('cancels editing without changing the item name', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Edit');
    await act(async () => {
      await user.click(editButtons[0]);
    });

    // Click Cancel
    await act(async () => {
      await user.click(screen.getByText('Cancel'));
    });

    // Original name still shown, input gone
    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Test Item 1')).not.toBeInTheDocument();
  });

  test('sorts items alphabetically when sort button is clicked', async () => {
    const user = userEvent.setup();

    // Return items intentionally out of order
    server.use(
      rest.get('/api/items', (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json([
            { id: 2, name: 'Zebra Item', created_at: '2023-01-02T00:00:00.000Z' },
            { id: 1, name: 'Apple Item', created_at: '2023-01-01T00:00:00.000Z' },
          ])
        );
      })
    );

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Zebra Item')).toBeInTheDocument();
    });

    // Before sort: Zebra Item appears before Apple Item in the DOM
    const itemsBefore = screen.getAllByRole('listitem');
    expect(itemsBefore[0].textContent).toContain('Zebra Item');

    // Click sort button
    await act(async () => {
      await user.click(screen.getByText(/Sort: A → Z/));
    });

    // After sort: Apple Item should appear before Zebra Item
    const itemsAfter = screen.getAllByRole('listitem');
    expect(itemsAfter[0].textContent).toContain('Apple Item');

    // Click again to toggle off — original order restored
    await act(async () => {
      await user.click(screen.getByText(/Sort: A → Z/));
    });

    const itemsReset = screen.getAllByRole('listitem');
    expect(itemsReset[0].textContent).toContain('Zebra Item');
  });
});