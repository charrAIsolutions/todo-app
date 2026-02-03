/**
 * TaskItem regression tests
 *
 * TaskItem is the fundamental rendering unit for every task row in the app.
 * It receives a Task object and renders a checkbox + title.  These tests lock
 * down the contract so that future refactors (styling changes, new props,
 * accessibility additions) are caught before they ship.
 *
 * Behaviours under test:
 *   1. Incomplete task renders title without a checkmark
 *   2. Completed task renders checkmark inside the checkbox
 *   3. Tapping the title row calls onPress when provided, onToggle otherwise
 *   4. Tapping the checkbox (via checkmark) always calls onToggle
 *   5. indentLevel produces the correct marginLeft (0 / 12 / 32)
 *   6. Omitting indentLevel defaults to 0 margin
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { TaskItem } from "../TaskItem";
import type { Task } from "@/types/todo";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    listId: "list-1",
    categoryId: "cat-now",
    parentTaskId: null,
    title: "Buy groceries",
    completed: false,
    sortOrder: 0,
    createdAt: "2026-01-15T10:00:00.000Z",
    ...overrides,
  };
}

/**
 * Extract the marginLeft from the outermost element of a rendered TaskItem.
 * The component applies style={[styles.container, { marginLeft: indent }]}.
 */
function getContainerMarginLeft(props: Parameters<typeof TaskItem>[0]): number {
  const { toJSON } = render(<TaskItem {...props} />);
  const tree = toJSON();

  // tree is the outermost Pressable rendered as a View.
  // Its style prop is an array of style objects.
  if (tree && Array.isArray(tree.props?.style)) {
    for (const s of tree.props.style) {
      if (s && typeof s === "object" && "marginLeft" in s) {
        return (s as { marginLeft: number }).marginLeft;
      }
    }
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TaskItem", () => {
  // -----------------------------------------------------------------------
  // Visual rendering
  // -----------------------------------------------------------------------
  describe("incomplete task", () => {
    it("displays the task title text", () => {
      const task = makeTask({ title: "Write tests" });
      const { getByText } = render(
        <TaskItem task={task} onToggle={jest.fn()} />,
      );

      expect(getByText("Write tests")).toBeDefined();
    });

    it("does not render a checkmark", () => {
      const task = makeTask({ completed: false });
      const { queryByText } = render(
        <TaskItem task={task} onToggle={jest.fn()} />,
      );

      expect(queryByText("\u2713")).toBeNull();
    });
  });

  describe("completed task", () => {
    it("displays the task title text", () => {
      const task = makeTask({ title: "Already done", completed: true });
      const { getByText } = render(
        <TaskItem task={task} onToggle={jest.fn()} />,
      );

      expect(getByText("Already done")).toBeDefined();
    });

    it("renders the checkmark character", () => {
      const task = makeTask({ completed: true });
      const { getByText } = render(
        <TaskItem task={task} onToggle={jest.fn()} />,
      );

      expect(getByText("\u2713")).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Tap behaviour
  // -----------------------------------------------------------------------
  describe("tapping the task title row", () => {
    it("calls onPress when it is provided", () => {
      const onToggle = jest.fn();
      const onPress = jest.fn();
      const task = makeTask({ title: "Tap me" });

      const { getByText } = render(
        <TaskItem task={task} onToggle={onToggle} onPress={onPress} />,
      );

      fireEvent.press(getByText("Tap me"));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onToggle).not.toHaveBeenCalled();
    });

    it("falls back to onToggle when onPress is not provided", () => {
      const onToggle = jest.fn();
      const task = makeTask({ title: "Toggle me" });

      const { getByText } = render(
        <TaskItem task={task} onToggle={onToggle} />,
      );

      fireEvent.press(getByText("Toggle me"));

      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe("tapping the checkbox directly", () => {
    // The checkbox inner Pressable always calls onToggle.  In a completed
    // task the checkmark text ("\u2713") is rendered inside it, giving us
    // a stable query target.  Pressing that text element fires the
    // checkbox Pressable's onPress (onToggle) without bubbling to the
    // outer row's onPress.
    it("calls onToggle and does not call onPress", () => {
      const onToggle = jest.fn();
      const onPress = jest.fn();
      const task = makeTask({ completed: true, title: "Done task" });

      const { getByText } = render(
        <TaskItem task={task} onToggle={onToggle} onPress={onPress} />,
      );

      // Press the checkmark -- it lives inside the checkbox Pressable
      fireEvent.press(getByText("\u2713"));

      expect(onToggle).toHaveBeenCalledTimes(1);
      // onPress belongs to the outer row; pressing the nested checkbox
      // should not trigger it in React Native (no event bubbling for press)
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Indentation
  // -----------------------------------------------------------------------
  describe("indentation levels", () => {
    const task = makeTask();

    it("indentLevel=0 produces marginLeft of 0", () => {
      expect(
        getContainerMarginLeft({ task, onToggle: jest.fn(), indentLevel: 0 }),
      ).toBe(0);
    });

    it("indentLevel=1 produces marginLeft of 12 (category indent)", () => {
      expect(
        getContainerMarginLeft({ task, onToggle: jest.fn(), indentLevel: 1 }),
      ).toBe(12);
    });

    it("indentLevel=2 produces marginLeft of 32 (subtask indent)", () => {
      expect(
        getContainerMarginLeft({ task, onToggle: jest.fn(), indentLevel: 2 }),
      ).toBe(32);
    });

    it("omitting indentLevel defaults to marginLeft of 0", () => {
      expect(getContainerMarginLeft({ task, onToggle: jest.fn() })).toBe(0);
    });
  });
});
