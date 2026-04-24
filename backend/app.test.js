const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const { app } = require("./app");

jest.setTimeout(60000);

describe("Todo API integration tests", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "todo_test",
    });
  });

  afterEach(async () => {
    if (!mongoose.connection.db) {
      return;
    }
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((collection) => collection.deleteMany({})));
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it("GET / returns API status and endpoint list", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Todo API is running");
    expect(response.body).toHaveProperty("endpoints");
    expect(response.body.endpoints).toContain("POST /tasks");
    expect(response.body.endpoints).toContain("DELETE /tasks/:id");
  });

  it("POST /tasks creates a new task", async () => {
    const payload = {
      title: "Write integration tests",
      description: "Cover CRUD routes",
      status: "pending",
    };

    const response = await request(app).post("/tasks").send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("_id");
    expect(response.body.title).toBe(payload.title);
    expect(response.body.description).toBe(payload.description);
    expect(response.body.status).toBe(payload.status);
  });

  it("POST /tasks returns 400 when title is missing", async () => {
    const response = await request(app).post("/tasks").send({
      description: "Invalid payload",
      status: "pending",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/title/i);
  });

  it("GET /tasks returns created tasks", async () => {
    await request(app).post("/tasks").send({ title: "Task one" });
    await request(app).post("/tasks").send({ title: "Task two" });

    const response = await request(app).get("/tasks");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toHaveProperty("_id");
  });

  it("GET /tasks/:id returns a single task", async () => {
    const created = await request(app).post("/tasks").send({
      title: "Fetch me",
      description: "Single item fetch",
      status: "pending",
    });

    const response = await request(app).get(`/tasks/${created.body._id}`);

    expect(response.status).toBe(200);
    expect(response.body._id).toBe(created.body._id);
    expect(response.body.title).toBe("Fetch me");
  });

  it("GET /tasks/:id returns 400 for invalid object id", async () => {
    const response = await request(app).get("/tasks/not-a-valid-id");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "invalid task id" });
  });

  it("GET /tasks/:id returns 404 when task does not exist", async () => {
    const missingId = new mongoose.Types.ObjectId().toString();
    const response = await request(app).get(`/tasks/${missingId}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "task not found" });
  });

  it("PUT /tasks/:id updates an existing task", async () => {
    const created = await request(app).post("/tasks").send({
      title: "Old title",
      description: "Old description",
      status: "pending",
    });

    const response = await request(app)
      .put(`/tasks/${created.body._id}`)
      .send({
        title: "New title",
        description: "New description",
        status: "completed",
      });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe("New title");
    expect(response.body.description).toBe("New description");
    expect(response.body.status).toBe("completed");
  });

  it("PUT /tasks/:id returns 400 for invalid payload", async () => {
    const created = await request(app).post("/tasks").send({
      title: "Valid task",
      status: "pending",
    });

    const response = await request(app)
      .put(`/tasks/${created.body._id}`)
      .send({
        title: "",
        status: "pending",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  it("DELETE /tasks/:id removes an existing task", async () => {
    const created = await request(app).post("/tasks").send({
      title: "Delete me",
      status: "pending",
    });

    const deleteResponse = await request(app).delete(`/tasks/${created.body._id}`);
    const getResponse = await request(app).get(`/tasks/${created.body._id}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toEqual({ message: "task deleted successfully" });
    expect(getResponse.status).toBe(404);
  });

  it("DELETE /tasks/:id returns 404 when task does not exist", async () => {
    const missingId = new mongoose.Types.ObjectId().toString();
    const response = await request(app).delete(`/tasks/${missingId}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "task not found" });
  });
});
