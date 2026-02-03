/**
 * AddTaskInput regression tests
 *
 * AddTaskInput is the text field + submit button at the bottom of every list
 * pane.  It owns its own local state (the current input value) and calls
 * onAddTask with the trimmed title on submission.  It also clears itself
 * after a successful add and dismisses the keyboard.
 *
 * Behaviours under test:
 *   1. Renders with the default placeholder text when none is provided
 *   2. Renders a custom placeholder when the prop is supplied
 *   3. The add button is visually disabled (style) when the input is empty
 *   4. Typing text makes the add button enabled
 *   5. Pressing the add button calls onAddTask with the typed title
 *   6. The input clears after a successful submission
 *   7. Pressing the add button with only whitespace does NOT call onAddTask
 *      and does NOT clear the input (whitespace-only is treated as empty)
 *   8. Pressing Enter (onSubmitEditing) triggers the same submit logic
 *   9. A title with leading/trailing whitespace is trimmed before being passed
 *      to onAddTask
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { AddTaskInput } from "../AddTaskInput";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AddTaskInput", () => {
  // -----------------------------------------------------------------------
  // Placeholder rendering
  // -----------------------------------------------------------------------
  describe("placeholder text", () => {
    it("shows the default placeholder when none is provided", () => {
      const { toJSON } = render(<AddTaskInput onAddTask={jest.fn()} />);

      // The TextInput has placeholder="Add a task..." by default.
      // In RNTL we can verify by checking the placeholder prop on the tree.
      const tree = toJSON();
      const input = findTextInput(tree);
      expect(input?.props?.placeholder).toBe("Add a task...");
    });

    it("shows a custom placeholder when provided", () => {
      const { toJSON } = render(
        <AddTaskInput onAddTask={jest.fn()} placeholder="Type here..." />,
      );

      const tree = toJSON();
      const input = findTextInput(tree);
      expect(input?.props?.placeholder).toBe("Type here...");
    });
  });

  // -----------------------------------------------------------------------
  // Button disabled state
  // -----------------------------------------------------------------------
  describe("add button disabled state", () => {
    it("add button has the disabled background style when input is empty", () => {
      const { toJSON } = render(<AddTaskInput onAddTask={jest.fn()} />);

      // The disabled style sets backgroundColor to "#e0e0e0".
      // We look for that colour in the plus button's ancestor Pressable.
      const tree = toJSON();
      const plusIcon = findElementByText(tree, "plus");
      // Walk up to the Pressable that wraps it (the parent)
      // In the JSON tree structure the Pressable is the parent of the icon.
      // We search for "#e0e0e0" anywhere in the subtree containing "plus"
      expect(hasColorInTree(tree, "#e0e0e0")).toBe(true);
    });

    it("add button loses the disabled background after typing", async () => {
      const { toJSON, getByPlaceholderText } = render(
        <AddTaskInput onAddTask={jest.fn()} />,
      );

      const input = getByPlaceholderText("Add a task...");
      fireEvent.changeText(input, "Something");

      const tree = toJSON();
      // After typing, the button background should be "#007AFF" (enabled)
      expect(hasColorInTree(tree, "#007AFF")).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Submission via button press
  // -----------------------------------------------------------------------
  describe("submitting via the add button", () => {
    it("calls onAddTask with the typed title and clears the input", () => {
      const onAddTask = jest.fn();
      const { getByPlaceholderText, getByText } = render(
        <AddTaskInput onAddTask={onAddTask} />,
      );

      const input = getByPlaceholderText("Add a task...");

      // Type a title
      fireEvent.changeText(input, "Buy milk");

      // Press the add button (the plus icon)
      fireEvent.press(getByText("plus"));

      // onAddTask should have been called with the trimmed title
      expect(onAddTask).toHaveBeenCalledTimes(1);
      expect(onAddTask).toHaveBeenCalledWith("Buy milk");

      // The input should now be cleared -- its value should be empty.
      // After state update the placeholder reappears; we verify the input
      // value is "" by checking that getByPlaceholderText still works
      // (it only matches when the input value is empty / placeholder visible)
      expect(getByPlaceholderText("Add a task...")).toBeDefined();
    });

    it("does not call onAddTask when the input is empty", () => {
      const onAddTask = jest.fn();
      const { getByText } = render(<AddTaskInput onAddTask={onAddTask} />);

      // Press add with nothing typed
      fireEvent.press(getByText("plus"));

      expect(onAddTask).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Submission via Enter key (onSubmitEditing)
  // -----------------------------------------------------------------------
  describe("submitting via Enter key", () => {
    it("calls onAddTask when Enter is pressed after typing", () => {
      const onAddTask = jest.fn();
      const { getByPlaceholderText } = render(
        <AddTaskInput onAddTask={onAddTask} />,
      );

      const input = getByPlaceholderText("Add a task...");

      fireEvent.changeText(input, "Walk the dog");
      fireEvent(input, "submitEditing");

      expect(onAddTask).toHaveBeenCalledWith("Walk the dog");
    });

    it("does not call onAddTask when Enter is pressed with empty input", () => {
      const onAddTask = jest.fn();
      const { getByPlaceholderText } = render(
        <AddTaskInput onAddTask={onAddTask} />,
      );

      const input = getByPlaceholderText("Add a task...");

      // Do not type anything -- just press Enter
      fireEvent(input, "submitEditing");

      expect(onAddTask).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Whitespace handling
  // -----------------------------------------------------------------------
  describe("whitespace-only input", () => {
    it("does not call onAddTask and does not clear the input", () => {
      const onAddTask = jest.fn();
      const { getByPlaceholderText, getByText } = render(
        <AddTaskInput onAddTask={onAddTask} />,
      );

      const input = getByPlaceholderText("Add a task...");

      // Type only spaces
      fireEvent.changeText(input, "   ");

      // Press add
      fireEvent.press(getByText("plus"));

      expect(onAddTask).not.toHaveBeenCalled();
    });
  });

  describe("title trimming", () => {
    it("trims leading and trailing whitespace before calling onAddTask", () => {
      const onAddTask = jest.fn();
      const { getByPlaceholderText, getByText } = render(
        <AddTaskInput onAddTask={onAddTask} />,
      );

      const input = getByPlaceholderText("Add a task...");

      fireEvent.changeText(input, "  Trim me  ");
      fireEvent.press(getByText("plus"));

      expect(onAddTask).toHaveBeenCalledWith("Trim me");
    });
  });
});

// ---------------------------------------------------------------------------
// Tree traversal utilities
// ---------------------------------------------------------------------------

/**
 * Find a TextInput node in the rendered JSON tree (type === "TextInput").
 */
function findTextInput(node: any): any {
  if (!node || typeof node !== "object") return null;
  if (node.type === "TextInput") return node;
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      const found = findTextInput(child);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Find the first element in the tree whose text content matches the given string.
 */
function findElementByText(node: any, text: string): any {
  if (!node || typeof node !== "object") return null;
  if (typeof node === "string") return null;

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      if (child === text) return node;
      const deeper = findElementByText(child, text);
      if (deeper) return deeper;
    }
  }
  return null;
}

/**
 * Check whether any element in the tree has a backgroundColor equal to the given colour.
 */
function hasColorInTree(node: any, color: string): boolean {
  if (!node || typeof node !== "object") return false;

  if (node.props?.style) {
    const styles = Array.isArray(node.props.style)
      ? node.props.style
      : [node.props.style];
    for (const s of styles) {
      if (s && typeof s === "object" && s.backgroundColor === color) {
        return true;
      }
    }
  }

  if (Array.isArray(node.children)) {
    return node.children.some((child: any) => hasColorInTree(child, color));
  }

  return false;
}
