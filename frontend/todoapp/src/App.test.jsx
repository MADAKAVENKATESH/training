import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import App from "./App";

describe("App", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders title and loads empty task state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    render(<App />);

    expect(screen.getByRole("heading", { name: /todo api frontend/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/no tasks yet\. add your first one\./i)).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/tasks");
  });

  it("shows API error when initial fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Failed to load tasks" }),
      })
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load tasks/i)).toBeInTheDocument();
    });
  });

  it("creates a new task and prepends it to the list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            _id: "task-1",
            title: "Learn testing",
            description: "Use Vitest and RTL",
            status: "pending",
          }),
        })
    );

    render(<App />);

    await screen.findByText(/no tasks yet\. add your first one\./i);

    fireEvent.change(screen.getByPlaceholderText(/task title/i), {
      target: { value: "Learn testing" },
    });
    fireEvent.change(screen.getByPlaceholderText(/task description/i), {
      target: { value: "Use Vitest and RTL" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add task/i }));

    await screen.findByText("Learn testing");
    expect(screen.getByText("Use Vitest and RTL")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("validates title as required before submit", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    render(<App />);

    await screen.findByText(/no tasks yet\. add your first one\./i);
    const titleInput = screen.getByPlaceholderText(/task title/i);
    fireEvent.click(screen.getByRole("button", { name: /add task/i }));

    expect(titleInput).toBeInvalid();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("edits an existing task", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              _id: "task-1",
              title: "Old title",
              description: "Old description",
              status: "pending",
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            _id: "task-1",
            title: "Updated title",
            description: "Updated description",
            status: "completed",
          }),
        })
    );

    render(<App />);
    await screen.findByText("Old title");

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    fireEvent.change(screen.getByPlaceholderText(/task title/i), {
      target: { value: "Updated title" },
    });
    fireEvent.change(screen.getByPlaceholderText(/task description/i), {
      target: { value: "Updated description" },
    });
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "completed" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update task/i }));

    await screen.findByText("Updated title");
    expect(screen.getByText("Updated description")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
  });

  it("toggles task status from completed to pending", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              _id: "task-2",
              title: "Ship feature",
              description: "",
              status: "completed",
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            _id: "task-2",
            title: "Ship feature",
            description: "",
            status: "pending",
          }),
        })
    );

    render(<App />);
    await screen.findByText("Ship feature");

    fireEvent.click(screen.getByRole("button", { name: /mark as pending/i }));

    await screen.findByText("pending");
  });

  it("deletes a task from the list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              _id: "task-3",
              title: "Remove me",
              description: "",
              status: "pending",
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: "task deleted successfully" }),
        })
    );

    render(<App />);
    await screen.findByText("Remove me");

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(screen.queryByText("Remove me")).not.toBeInTheDocument();
    });
  });
});
