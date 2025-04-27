import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Todo } from '../../../app/components/Todo';

describe('Todo Component', () => {
  it('renders correctly', () => {
    render(<Todo />);
    
    // Check if the title is rendered
    expect(screen.getByText('Todo App')).toBeInTheDocument();
    
    // Check if the input field exists
    expect(screen.getByPlaceholderText('Add a new todo')).toBeInTheDocument();
    
    // Check if the Add button exists
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('adds a new todo when clicking the Add button', () => {
    render(<Todo />);
    
    // Get the input element and Add button
    const input = screen.getByPlaceholderText('Add a new todo');
    const addButton = screen.getByRole('button', { name: 'Add' });
    
    // Set a value in the input field
    fireEvent.change(input, { target: { value: 'New test todo' } });
    
    // Click the Add button
    fireEvent.click(addButton);
    
    // Check if the new todo is displayed
    expect(screen.getByText('New test todo')).toBeInTheDocument();
    
    // Check if the input field is cleared after adding
    expect(input).toHaveValue('');
  });

  it('marks a todo as completed when clicking the checkbox', () => {
    render(<Todo />);
    
    // Add a new todo
    const input = screen.getByPlaceholderText('Add a new todo');
    const addButton = screen.getByRole('button', { name: 'Add' });
    
    fireEvent.change(input, { target: { value: 'Todo to complete' } });
    fireEvent.click(addButton);
    
    // Find the todo's checkbox and click it
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    // Get the parent div containing the todo item
    const todoText = screen.getByText('Todo to complete');
    const todoItemContainer = todoText.closest('div').parentElement;
    
    // Check if the todo item container has the line-through class
    expect(todoItemContainer?.className).toContain('line-through');
  });

  it('deletes a todo when clicking the Delete button', () => {
    render(<Todo />);
    
    // Add a new todo
    const input = screen.getByPlaceholderText('Add a new todo');
    const addButton = screen.getByRole('button', { name: 'Add' });
    
    fireEvent.change(input, { target: { value: 'Todo to delete' } });
    fireEvent.click(addButton);
    
    // Check if the todo is displayed
    expect(screen.getByText('Todo to delete')).toBeInTheDocument();
    
    // Find the delete button for the todo and click it
    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButton);
    
    // Check if the todo is removed
    expect(screen.queryByText('Todo to delete')).not.toBeInTheDocument();
  });

  it('clears all todos when clicking the Clear All button', () => {
    render(<Todo />);
    
    // Add multiple todos
    const input = screen.getByPlaceholderText('Add a new todo');
    const addButton = screen.getByRole('button', { name: 'Add' });
    
    fireEvent.change(input, { target: { value: 'First todo' } });
    fireEvent.click(addButton);
    
    fireEvent.change(input, { target: { value: 'Second todo' } });
    fireEvent.click(addButton);
    
    // Check if both todos are displayed
    expect(screen.getByText('First todo')).toBeInTheDocument();
    expect(screen.getByText('Second todo')).toBeInTheDocument();
    
    // Find the Clear All button and click it
    const clearButton = screen.getByRole('button', { name: 'Clear All' });
    fireEvent.click(clearButton);
    
    // Check if all todos are removed
    expect(screen.queryByText('First todo')).not.toBeInTheDocument();
    expect(screen.queryByText('Second todo')).not.toBeInTheDocument();
  });
}); 