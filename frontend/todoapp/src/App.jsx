import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "pending"
  });
  const [editingTaskId, setEditingTaskId] = useState(null);

  const isEditing = useMemo(() => editingTaskId !== null, [editingTaskId]);

  async function fetchTasks() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_BASE}/tasks`);
      if (!response.ok) {
        throw new Error("Failed to load tasks");
      }
      const data = await response.json();
      setTasks(data);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  function resetForm() {
    setFormData({
      title: "",
      description: "",
      status: "pending"
    });
    setEditingTaskId(null);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }

    try {
      setError("");
      const method = isEditing ? "PUT" : "POST";
      const endpoint = isEditing
        ? `${API_BASE}/tasks/${editingTaskId}`
        : `${API_BASE}/tasks`;

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          status: formData.status
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }

      if (isEditing) {
        setTasks((previous) =>
          previous.map((task) => (task._id === data._id ? data : task))
        );
      } else {
        setTasks((previous) => [data, ...previous]);
      }

      resetForm();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  function handleEdit(task) {
    setEditingTaskId(task._id);
    setFormData({
      title: task.title || "",
      description: task.description || "",
      status: task.status || "pending"
    });
  }

  async function handleDelete(taskId) {
    try {
      setError("");
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Delete failed");
      }
      setTasks((previous) => previous.filter((task) => task._id !== taskId));
      if (editingTaskId === taskId) {
        resetForm();
      }
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function toggleTaskStatus(task) {
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    try {
      setError("");
      const response = await fetch(`${API_BASE}/tasks/${task._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          status: nextStatus
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Update failed");
      }
      setTasks((previous) =>
        previous.map((item) => (item._id === task._id ? data : item))
      );
    } catch (updateError) {
      setError(updateError.message);
    }
  }

  return (
    <main className="todo-app">
      <h1>Todo API Frontend</h1>
      <p className="subtext">Connected to your Express + Mongoose backend</p>

      <form className="todo-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="title"
          placeholder="Task title"
          value={formData.title}
          onChange={handleInputChange}
          required
        />
        <textarea
          name="description"
          placeholder="Task description (optional)"
          value={formData.description}
          onChange={handleInputChange}
          rows={3}
        />
        <select
          name="status"
          value={formData.status}
          onChange={handleInputChange}
        >
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
        <div className="actions">
          <button type="submit">{isEditing ? "Update Task" : "Add Task"}</button>
          {isEditing && (
            <button type="button" className="secondary" onClick={resetForm}>
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {error && <p className="status error">{error}</p>}
      {loading && <p className="status">Loading tasks...</p>}

      <section className="task-list">
        {!loading && tasks.length === 0 && (
          <p className="status">No tasks yet. Add your first one.</p>
        )}
        {tasks.map((task) => (
          <article key={task._id} className="task-item">
            <div className="task-main">
              <h3>{task.title}</h3>
              <p>{task.description || "No description"}</p>
              <span className={`badge ${task.status}`}>{task.status}</span>
            </div>
            <div className="task-buttons">
              <button type="button" onClick={() => toggleTaskStatus(task)}>
                Mark as {task.status === "completed" ? "Pending" : "Completed"}
              </button>
              <button type="button" onClick={() => handleEdit(task)}>
                Edit
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => handleDelete(task._id)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

export default App;
