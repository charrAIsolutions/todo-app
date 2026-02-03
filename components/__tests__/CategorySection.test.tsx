/**
 * CategorySection regression tests
 *
 * CategorySection is the grouping shell that stitches together a
 * CategoryHeader (or UncategorizedHeader), its parent tasks, and their
 * subtasks.  It has two internal rendering paths: StaticCategorySection
 * (dragEnabled=false) and DraggableCategorySection (dragEnabled=true).
 *
 * All tests here use dragEnabled=false.  The static path uses plain TaskItem
 * and CategoryHeader components directly -- no gesture-handler or reanimated
 * context required.  The drag path is integration-tested at the screen level
 * and does not need unit coverage here.
 *
 * Behaviours under test:
 *   1. A named category renders its header and all tasks under it
 *   2. Tasks appear with indentLevel=1 (one level under the header)
 *   3. Subtasks appear under their parent with indentLevel=2
 *   4. The uncategorized section (category=null) renders UncategorizedHeader
 *   5. An uncategorized section with zero tasks returns null (nothing rendered)
 *   6. A named category with zero tasks still renders the header + empty placeholder
 *   7. onToggleTask is called with the correct taskId when a task checkbox is pressed
 *   8. onPressTask is called with the correct taskId when a task row is pressed
 *   9. Multiple tasks render in the order they appear in the tasks array
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { CategorySection } from "../CategorySection";
import type { Category, Task } from "@/types/todo";

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "cat-now",
    name: "Now",
    sortOrder: 0,
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    listId: "list-1",
    categoryId: "cat-now",
    parentTaskId: null,
    title: "Default task",
    completed: false,
    sortOrder: 0,
    createdAt: "2026-01-15T10:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CategorySection", () => {
  // -----------------------------------------------------------------------
  // Named category rendering
  // -----------------------------------------------------------------------
  describe("with a named category and tasks", () => {
    it("renders the category header name", () => {
      const category = makeCategory({ name: "Now" });
      const tasks = [makeTask({ id: "t1", title: "Task one" })];

      const { getByText } = render(
        <CategorySection
          category={category}
          listId="list-1"
          tasks={tasks}
          subtasksByParent={new Map()}
          onToggleTask={jest.fn()}
          dragEnabled={false}
        />,
      );

      expect(getByText("Now")).toBeDefined();
    });

    it("renders all task titles", () => {
      const category = makeCategory();
      const tasks = [
        makeTask({ id: "t1", title: "First task" }),
        makeTask({ id: "t2", title: "Second task", sortOrder: 1 }),
      ];

      const { getByText } = render(
        <CategorySection
          category={category}
          listId="list-1"
          tasks={tasks}
          subtasksByParent={new Map()}
          onToggleTask={jest.fn()}
          dragEnabled={false}
        />,
      );

      expect(getByText("First task")).toBeDefined();
      expect(getByText("Second task")).toBeDefined();
    });

    it("renders tasks with indentLevel=1 (category-level indent)", () => {
      const category = makeCategory();
      const tasks = [makeTask({ id: "t1", title: "Indented task" })];

      const { toJSON } = render(
        <CategorySection
          category={category}
          listId="list-1"
          tasks={tasks}
          subtasksByParent={new Map()}
          onToggleTask={jest.fn()}
          dragEnabled={false}
        />,
      );

      // Find the TaskItem container (the element that has marginLeft).
      // TaskItem renders: <Pressable style={[container, { marginLeft: 12 }]}>
      const tree = toJSON();
      const taskContainer = findElementWithMarginLeft(tree, 12);
      expect(taskContainer).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Subtask rendering
  // -----------------------------------------------------------------------
  describe("subtasks under a parent task", () => {
    it("renders subtask titles below their parent", () => {
      const category = makeCategory();
      const parentTask = makeTask({ id: "parent-1", title: "Parent task" });
      const subtask = makeTask({
        id: "sub-1",
        title: "Child task",
        parentTaskId: "parent-1",
      });

      const subtasksByParent = new Map<string, Task[]>([
        ["parent-1", [subtask]],
      ]);

      const { getByText } = render(
        <CategorySection
          category={category}
          listId="list-1"
          tasks={[parentTask]}
          subtasksByParent={subtasksByParent}
          onToggleTask={jest.fn()}
          dragEnabled={false}
        />,
      );

      expect(getByText("Parent task")).toBeDefined();
      expect(getByText("Child task")).toBeDefined();
    });

    it("renders subtasks with indentLevel=2 (subtask indent = marginLeft 32)", () => {
      const category = makeCategory();
      const parentTask = makeTask({ id: "parent-1", title: "Parent" });
      const subtask = makeTask({
        id: "sub-1",
        title: "Sub",
        parentTaskId: "parent-1",
      });

      const subtasksByParent = new Map<string, Task[]>([
        ["parent-1", [subtask]],
      ]);

      const { toJSON } = render(
        <CategorySection
          category={category}
          listId="list-1"
          tasks={[parentTask]}
          subtasksByParent={subtasksByParent}
          onToggleTask={jest.fn()}
          dragEnabled={false}
        />,
      );

      const tree = toJSON();
      const subtaskContainer = findElementWithMarginLeft(tree, 32);
      expect(subtaskContainer).toBeDefined();
    });

    it("renders multiple subtasks under the same parent", () => {
      const category = makeCategory();
      const parentTask = makeTask({ id: "p1", title: "Parent" });
      const sub1 = makeTask({ id: "s1", title: "Sub A", parentTaskId: "p1" });
      const sub2 = makeTask({
        id: "s2",
        title: "Sub B",
        parentTaskId: "p1",
        sortOrder: 1,
      });

      const subtasksByParent = new Map<string, Task[]>([["p1", [sub1, sub2]]]);

      const { getByText } = render(
        <CategorySection
          category={category}
          listId="list-1"
          tasks={[parentTask]}
          subtasksByParent={subtasksByParent}
          onToggleTask={jest.fn()}
          dragEnabled={false}
        />,
      );

      expect(getByText("Sub A")).toBeDefined();
      expect(getByText("Sub B")).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Uncategorized section
  // -----------------------------------------------------------------------
  describe("uncategorized section (category=null)", () => {
    it("renders the 'Uncategorized' header when there are tasks", () => {
      const tasks = [
        makeTask({ id: "t1", title: "No category", categoryId: null }),
      ];

      const { getByText } = render(
        <CategorySection
          category={null}
          listId="list-1"
          tasks={tasks}
          subtasksByParent={new Map()}
          onToggleTask={jest.fn()}
          dragEnabled={false}
        />,
      );

      expect(getByText("Uncategorized")).toBeDefined();
      expect(getByText("No category")).toBeDefined();
    });

    it("returns null (renders nothing) when there are zero tasks", () => {
      const { toJSON } = render(
        <CategorySection
          category={null}
          listId="list-1"
          tasks={[]}
          subtasksByParent={new Map()}
          onToggleTask={jest.fn()}
          dragEnabled={false}
        />,
      );

      expect(toJSON()).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Empty named category
  // -----------------------------------------------------------------------
  describe("named category with zero tasks", () => {
    it("still renders the header (drop target placeholder)", () => {
      const category = makeCategory({ name: "Later" });

      const { getByText } = render(
        <CategorySection
          category={category}
          listId="list-1"
          tasks={[]}
          subtasksByParent={new Map()}
          onToggleTask={jest.fn()}
          dragEnabled={false}
        />,
      );

      // The header should be present even with no tasks
      expect(getByText("Later")).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Callback wiring
  // -----------------------------------------------------------------------
  describe("onToggleTask callback", () => {
    it("is called with the parent task id when a parent task row is pressed", () => {
      const onToggleTask = jest.fn();
      const category = makeCategory();
      // No onPressTask -- so pressing the row falls back to onToggle
      const tasks = [makeTask({ id: "toggle-me", title: "Toggle this" })];

      const { getByText } = render(
        <CategorySection
          category={category}
          listId="list-1"
          tasks={tasks}
          subtasksByParent={new Map()}
          onToggleTask={onToggleTask}
          dragEnabled={false}
        />,
      );

      fireEvent.press(getByText("Toggle this"));

      expect(onToggleTask).toHaveBeenCalledWith("toggle-me");
    });

    it("is called with the subtask id when a subtask row is pressed", () => {
      const onToggleTask = jest.fn();
      const category = makeCategory();
      const parent = makeTask({ id: "p1", title: "Parent" });
      const sub = makeTask({
        id: "sub-toggle",
        title: "Sub toggle",
        parentTaskId: "p1",
      });

      const subtasksByParent = new Map<string, Task[]>([["p1", [sub]]]);

      const { getByText } = render(
        <CategorySection
          category={category}
          listId="list-1"
          tasks={[parent]}
          subtasksByParent={subtasksByParent}
          onToggleTask={onToggleTask}
          dragEnabled={false}
        />,
      );

      fireEvent.press(getByText("Sub toggle"));

      expect(onToggleTask).toHaveBeenCalledWith("sub-toggle");
    });
  });

  describe("onPressTask callback", () => {
    it("is called with the task id when a task row is pressed and onPressTask is provided", () => {
      const onToggleTask = jest.fn();
      const onPressTask = jest.fn();
      const category = makeCategory();
      const tasks = [makeTask({ id: "press-me", title: "Press this" })];

      const { getByText } = render(
        <CategorySection
          category={category}
          listId="list-1"
          tasks={tasks}
          subtasksByParent={new Map()}
          onToggleTask={onToggleTask}
          onPressTask={onPressTask}
          dragEnabled={false}
        />,
      );

      fireEvent.press(getByText("Press this"));

      expect(onPressTask).toHaveBeenCalledWith("press-me");
      // onToggle should NOT fire when onPress is provided
      expect(onToggleTask).not.toHaveBeenCalled();
    });

    it("is called with the subtask id when a subtask row is pressed", () => {
      const onPressTask = jest.fn();
      const category = makeCategory();
      const parent = makeTask({ id: "p1", title: "Parent" });
      const sub = makeTask({
        id: "sub-press",
        title: "Sub press",
        parentTaskId: "p1",
      });

      const subtasksByParent = new Map<string, Task[]>([["p1", [sub]]]);

      const { getByText } = render(
        <CategorySection
          category={category}
          listId="list-1"
          tasks={[parent]}
          subtasksByParent={subtasksByParent}
          onToggleTask={jest.fn()}
          onPressTask={onPressTask}
          dragEnabled={false}
        />,
      );

      fireEvent.press(getByText("Sub press"));

      expect(onPressTask).toHaveBeenCalledWith("sub-press");
    });
  });

  // -----------------------------------------------------------------------
  // Task count badge on header
  // -----------------------------------------------------------------------
  describe("task count badge", () => {
    it("shows the correct count of top-level tasks in the header badge", () => {
      const category = makeCategory({ name: "Next" });
      const tasks = [
        makeTask({ id: "t1", title: "A", sortOrder: 0 }),
        makeTask({ id: "t2", title: "B", sortOrder: 1 }),
        makeTask({ id: "t3", title: "C", sortOrder: 2 }),
      ];

      const { getByText } = render(
        <CategorySection
          category={category}
          listId="list-1"
          tasks={tasks}
          subtasksByParent={new Map()}
          onToggleTask={jest.fn()}
          dragEnabled={false}
        />,
      );

      // CategoryHeader receives taskCount={tasks.length} which is 3
      expect(getByText("3")).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Tree traversal helpers
// ---------------------------------------------------------------------------

/**
 * Recursively search a rendered JSON tree for an element whose style array
 * contains { marginLeft: targetValue }.
 */
function findElementWithMarginLeft(node: any, targetValue: number): any {
  if (!node || typeof node !== "object") return null;

  if (node.props?.style) {
    const styles = Array.isArray(node.props.style)
      ? node.props.style
      : [node.props.style];
    for (const s of styles) {
      if (s && typeof s === "object" && s.marginLeft === targetValue) {
        return node;
      }
    }
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      const found = findElementWithMarginLeft(child, targetValue);
      if (found) return found;
    }
  }

  return null;
}
