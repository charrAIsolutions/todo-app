export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string; // ISO date string
  completedAt?: string; // ISO date string
}

export type TodoInput = Pick<Todo, 'title'>;
