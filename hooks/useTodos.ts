import { useEffect } from 'react';
import { useTodoContext } from '../store/TodoContext';
import { storage } from '../lib/storage';
import { Todo } from '../types/todo';

/**
 * Custom hook for managing todos with persistence
 *
 * Why a custom hook instead of using context directly?
 * - Encapsulates persistence logic (load/save to storage)
 * - Keeps components focused on UI, not data management
 * - Makes testing easier - can mock the hook
 * - Single place to add features like optimistic updates, error handling
 */
export function useTodos() {
  const { state, addTodo, toggleTodo, deleteTodo, setTodos } = useTodoContext();

  // Load todos from storage on mount
  useEffect(() => {
    async function loadTodos() {
      const savedTodos = await storage.getTodos<Todo[]>();
      if (savedTodos) {
        setTodos(savedTodos);
      } else {
        setTodos([]);
      }
    }
    loadTodos();
  }, []);

  // Persist todos when they change
  useEffect(() => {
    if (!state.isLoading) {
      storage.setTodos(state.todos);
    }
  }, [state.todos, state.isLoading]);

  return {
    todos: state.todos,
    isLoading: state.isLoading,
    addTodo,
    toggleTodo,
    deleteTodo,
  };
}
