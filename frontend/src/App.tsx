import { useEffect } from 'react';
import { useTodoStore } from './stores/todoStore';
import { TodoList } from './components/TodoList';
import { AddTodoForm } from './components/AddTodoForm';
import { Header } from './components/Header';
import { ConnectionStatus } from './components/ConnectionStatus';
import { TypingIndicator } from './components/TypingIndicator';
import { OnlineUsers } from './components/OnlineUsers';

function App() {
  const { fetchTodos, initializeSocket, isLoading, error } = useTodoStore();

  useEffect(() => {
    // Initialize socket connection
    initializeSocket();
    // Fetch initial todos
    fetchTodos();
  }, [fetchTodos, initializeSocket]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <ConnectionStatus />
          <OnlineUsers />
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <AddTodoForm />

          <TypingIndicator />

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <TodoList />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
