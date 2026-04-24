const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI;

const todoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending"
    }
  },
  {
    timestamps: true
  }
);

const Todo = mongoose.model("Todo", todoSchema);

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Todo API is running",
    endpoints: [
      "POST /tasks",
      "GET /tasks",
      "GET /tasks/:id",
      "PUT /tasks/:id",
      "DELETE /tasks/:id"
    ]
  });
});

app.post("/tasks", async (req, res) => {
  try {
    const { title, description, status } = req.body;
    const task = await Todo.create({ title, description, status });
    return res.status(201).json(task);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

app.get("/tasks", async (_req, res) => {
  try {
    const tasks = await Todo.find().sort({ createdAt: -1 });
    return res.json(tasks);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/tasks/:id", async (req, res) => {
  try {
    const task = await Todo.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "task not found" });
    }
    return res.json(task);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "invalid task id" });
    }
    return res.status(500).json({ error: error.message });
  }
});

app.put("/tasks/:id", async (req, res) => {
  try {
    const { title, description, status } = req.body;
    const updatedTask = await Todo.findByIdAndUpdate(
      req.params.id,
      { title, description, status },
      { new: true, runValidators: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ error: "task not found" });
    }

    return res.json(updatedTask);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "invalid task id" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
});

app.delete("/tasks/:id", async (req, res) => {
  try {
    const deletedTask = await Todo.findByIdAndDelete(req.params.id);
    if (!deletedTask) {
      return res.status(404).json({ error: "task not found" });
    }
    return res.json({ message: "task deleted successfully" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "invalid task id" });
    }
    return res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  try {
    if (!mongoUri) {
      throw new Error("MONGO_URI is missing. Add it in .env");
    }
    const connection = await mongoose.connect(mongoUri);
    const connectedDb = connection.connection.name;
    app.listen(port, () => {
      console.log("Database connected successfully.");
      console.log(`Connected database: ${connectedDb}`);
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to connect/start server:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };