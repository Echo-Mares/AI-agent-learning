import { useState, useEffect } from 'react';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

function App() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('todos');
    return saved ? JSON.parse(saved) : [];
  });
  const [newTodo, setNewTodo] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Save to localStorage whenever todos change
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    if (newTodo.trim() === '') return;
    const newTodoItem: Todo = {
      id: Date.now().toString(),
      text: newTodo.trim(),
      completed: false,
      createdAt: new Date(),
    };
    setTodos([newTodoItem, ...todos]);
    setNewTodo('');
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const saveEdit = () => {
    if (editText.trim() === '') return;
    setTodos(todos.map(todo => 
      todo.id === editingId ? { ...todo, text: editText.trim() } : todo
    ));
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const activeCount = todos.filter(todo => !todo.completed).length;
  const completedCount = todos.length - activeCount;

  return (
    <div className="app">
      <div className="header">
        <h1>📝 Todo List</h1>
        <p>Stay organized and get things done!</p>
      </div>

      <div className="todo-container">
        <div className="input-section">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            placeholder="Add a new task..."
            className="todo-input"
          />
          <button onClick={addTodo} className="add-btn">
            Add
          </button>
        </div>

        <div className="filter-section">
          <button 
            onClick={() => setFilter('all')}
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('active')}
            className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
          >
            Active
          </button>
          <button 
            onClick={() => setFilter('completed')}
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          >
            Completed
          </button>
        </div>

        <div className="stats-section">
          <span>{activeCount} {activeCount === 1 ? 'task' : 'tasks'} left</span>
          <span>{completedCount} completed</span>
        </div>

        <ul className="todo-list">
          {filteredTodos.length === 0 ? (
            <li className="empty-state">No tasks found. Add one above!</li>
          ) : (
            filteredTodos.map((todo) => (
              <li 
                key={todo.id} 
                className={`todo-item ${todo.completed ? 'completed' : ''} ${editingId === todo.id ? 'editing' : ''}`}
              >
                {editingId === todo.id ? (
                  <div className="edit-form">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                      autoFocus
                      className="edit-input"
                    />
                    <div className="edit-actions">
                      <button onClick={saveEdit} className="save-btn">Save</button>
                      <button onClick={cancelEdit} className="cancel-btn">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="todo-content">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggleTodo(todo.id)}
                        className="todo-checkbox"
                      />
                      <span className="todo-text">{todo.text}</span>
                    </div>
                    <div className="todo-actions">
                      <button 
                        onClick={() => startEditing(todo)}
                        className="edit-btn"
                        aria-label="Edit todo"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => deleteTodo(todo.id)}
                        className="delete-btn"
                        aria-label="Delete todo"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="footer">
        <p>Double-click to edit a task • Drag and drop to reorder</p>
      </div>
    </div>
  );
}

export default App;
