import { createContext, useContext, useReducer, ReactNode } from 'react';
import { Todo, TodoInput } from '../types/todo';
import { generateId, nowISO } from '../lib/utils';

// State shape
interface TodoState {
  todos: Todo[];
  isLoading: boolean;
}

// Action types
type TodoAction =
  | { type: 'SET_TODOS'; payload: Todo[] }
  | { type: 'ADD_TODO'; payload: TodoInput }
  | { type: 'TOGGLE_TODO'; payload: string }
  | { type: 'DELETE_TODO'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean };

// Initial state
const initialState: TodoState = {
  todos: [],
  isLoading: true,
};

// Reducer
function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'SET_TODOS':
      return { ...state, todos: action.payload, isLoading: false };
    case 'ADD_TODO':
      const newTodo: Todo = {
        id: generateId(),
        title: action.payload.title,
        completed: false,
        createdAt: nowISO(),
      };
      return { ...state, todos: [newTodo, ...state.todos] };
    case 'TOGGLE_TODO':
      return {
        ...state,
        todos: state.todos.map((todo) =>
          todo.id === action.payload
            ? {
                ...todo,
                completed: !todo.completed,
                completedAt: !todo.completed ? nowISO() : undefined,
              }
            : todo
        ),
      };
    case 'DELETE_TODO':
      return {
        ...state,
        todos: state.todos.filter((todo) => todo.id !== action.payload),
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

// Context
interface TodoContextValue {
  state: TodoState;
  addTodo: (input: TodoInput) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  setTodos: (todos: Todo[]) => void;
}

const TodoContext = createContext<TodoContextValue | null>(null);

// Provider
interface TodoProviderProps {
  children: ReactNode;
}

export function TodoProvider({ children }: TodoProviderProps) {
  const [state, dispatch] = useReducer(todoReducer, initialState);

  const value: TodoContextValue = {
    state,
    addTodo: (input) => dispatch({ type: 'ADD_TODO', payload: input }),
    toggleTodo: (id) => dispatch({ type: 'TOGGLE_TODO', payload: id }),
    deleteTodo: (id) => dispatch({ type: 'DELETE_TODO', payload: id }),
    setTodos: (todos) => dispatch({ type: 'SET_TODOS', payload: todos }),
  };

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
}

// Hook
export function useTodoContext() {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodoContext must be used within a TodoProvider');
  }
  return context;
}
