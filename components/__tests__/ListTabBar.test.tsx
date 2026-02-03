/**
 * ListTabBar regression tests
 *
 * ListTabBar is the horizontal scrollable tab strip.  It renders one ListTab
 * per TodoList (sorted by sortOrder) plus a "+" add-list button.  On web it
 * drives multi-select behaviour; on mobile it drives single-select.  The
 * active/selected state logic lives in the props -- ListTabBar just passes
 * the right flags down to each ListTab.
 *
 * Behaviours under test:
 *   1. All list names appear as tabs
 *   2. Lists are rendered in sortOrder order (not insertion order)
 *   3. The "+" button is rendered (icon "plus" appears)
 *   4. Tapping "+" calls onAddList
 *   5. Single-select mode: when selectedListIds is empty, tapping a tab
 *      calls onSelectList with that list's id
 *   6. Multi-select mode: when selectedListIds is non-empty, tapping a tab
 *      calls onToggleList with that list's id
 *   7. A list whose id is in selectedListIds is rendered as active (isActive=true)
 *   8. When selectedListIds is empty, the list matching activeListId is active
 *   9. onOpenSettings is wired through to each ListTab
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ListTabBar } from "../ListTabBar";
import type { TodoList } from "@/types/todo";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeList(id: string, name: string, sortOrder: number): TodoList {
  return {
    id,
    name,
    sortOrder,
    categories: [],
    showOnOpen: false,
    createdAt: "2026-01-15T10:00:00.000Z",
  };
}

// A default set of three lists in non-alphabetical sortOrder to verify sorting
const THREE_LISTS = [
  makeList("list-c", "Chores", 2),
  makeList("list-a", "Work", 0), // sortOrder 0 -- should appear first
  makeList("list-b", "Personal", 1),
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ListTabBar", () => {
  // -----------------------------------------------------------------------
  // Basic rendering
  // -----------------------------------------------------------------------
  it("renders a tab for every list", () => {
    const { getByText } = render(
      <ListTabBar
        lists={THREE_LISTS}
        activeListId="list-a"
        selectedListIds={[]}
        onSelectList={jest.fn()}
        onToggleList={jest.fn()}
        onAddList={jest.fn()}
      />,
    );

    expect(getByText("Work")).toBeDefined();
    expect(getByText("Personal")).toBeDefined();
    expect(getByText("Chores")).toBeDefined();
  });

  it("renders the add-list button (plus icon)", () => {
    const { getByText } = render(
      <ListTabBar
        lists={[makeList("list-1", "Only", 0)]}
        activeListId="list-1"
        selectedListIds={[]}
        onSelectList={jest.fn()}
        onToggleList={jest.fn()}
        onAddList={jest.fn()}
      />,
    );

    // Our FontAwesome mock renders the icon name as text
    expect(getByText("plus")).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // Sort order
  // -----------------------------------------------------------------------
  it("renders tabs in ascending sortOrder, not array insertion order", () => {
    const { toJSON } = render(
      <ListTabBar
        lists={THREE_LISTS}
        activeListId="list-a"
        selectedListIds={[]}
        onSelectList={jest.fn()}
        onToggleList={jest.fn()}
        onAddList={jest.fn()}
      />,
    );

    // Collect all Text nodes that match list names and verify their order
    const names = collectTextContent(toJSON()).filter((t) =>
      ["Work", "Personal", "Chores"].includes(t),
    );

    expect(names).toEqual(["Work", "Personal", "Chores"]);
  });

  // -----------------------------------------------------------------------
  // Add list button
  // -----------------------------------------------------------------------
  it("calls onAddList when the plus button is pressed", () => {
    const onAddList = jest.fn();

    const { getByText } = render(
      <ListTabBar
        lists={[makeList("list-1", "Only", 0)]}
        activeListId="list-1"
        selectedListIds={[]}
        onSelectList={jest.fn()}
        onToggleList={jest.fn()}
        onAddList={onAddList}
      />,
    );

    fireEvent.press(getByText("plus"));

    expect(onAddList).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // Single-select mode (selectedListIds is empty -- mobile behaviour)
  // -----------------------------------------------------------------------
  describe("single-select mode (selectedListIds empty)", () => {
    it("calls onSelectList with the tapped list id", () => {
      const onSelectList = jest.fn();
      const onToggleList = jest.fn();

      const { getByText } = render(
        <ListTabBar
          lists={THREE_LISTS}
          activeListId="list-a"
          selectedListIds={[]}
          onSelectList={onSelectList}
          onToggleList={onToggleList}
          onAddList={jest.fn()}
        />,
      );

      fireEvent.press(getByText("Personal"));

      expect(onSelectList).toHaveBeenCalledWith("list-b");
      expect(onToggleList).not.toHaveBeenCalled();
    });

    it("marks the activeListId tab as active", () => {
      // We verify via testID: active tabs get testID="list-tab-active"
      const { getAllByTestId, queryAllByTestId, getByText } = render(
        <ListTabBar
          lists={THREE_LISTS}
          activeListId="list-b"
          selectedListIds={[]}
          onSelectList={jest.fn()}
          onToggleList={jest.fn()}
          onAddList={jest.fn()}
        />,
      );

      // There should be exactly one active tab
      const activeTabs = getAllByTestId("list-tab-active");
      expect(activeTabs.length).toBe(1);

      // The inactive tabs should not have the active testID
      const inactiveTabs = queryAllByTestId("list-tab");
      expect(inactiveTabs.length).toBe(2); // Work and Chores
    });
  });

  // -----------------------------------------------------------------------
  // Multi-select mode (selectedListIds non-empty -- web split-view)
  // -----------------------------------------------------------------------
  describe("multi-select mode (selectedListIds non-empty)", () => {
    it("calls onToggleList with the tapped list id", () => {
      const onSelectList = jest.fn();
      const onToggleList = jest.fn();

      const { getByText } = render(
        <ListTabBar
          lists={THREE_LISTS}
          activeListId="list-a"
          selectedListIds={["list-a"]}
          onSelectList={onSelectList}
          onToggleList={onToggleList}
          onAddList={jest.fn()}
        />,
      );

      // Tap "Chores" which is NOT yet selected
      fireEvent.press(getByText("Chores"));

      expect(onToggleList).toHaveBeenCalledWith("list-c");
      expect(onSelectList).not.toHaveBeenCalled();
    });

    it("marks selected list ids as active tabs", () => {
      // We verify via testID: active tabs get testID="list-tab-active"
      const { getAllByTestId, queryAllByTestId } = render(
        <ListTabBar
          lists={THREE_LISTS}
          activeListId="list-a"
          selectedListIds={["list-a", "list-c"]}
          onSelectList={jest.fn()}
          onToggleList={jest.fn()}
          onAddList={jest.fn()}
        />,
      );

      // "Work" (list-a) and "Chores" (list-c) should be active
      const activeTabs = getAllByTestId("list-tab-active");
      expect(activeTabs.length).toBe(2);

      // "Personal" (list-b) is NOT in selectedListIds -- should not be active
      const inactiveTabs = queryAllByTestId("list-tab");
      expect(inactiveTabs.length).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // onOpenSettings wiring
  // -----------------------------------------------------------------------
  it("passes onOpenSettings through to each ListTab", () => {
    const onOpenSettings = jest.fn();

    const { getAllByText } = render(
      <ListTabBar
        lists={[makeList("list-1", "Settings Test", 0)]}
        activeListId="list-1"
        selectedListIds={[]}
        onSelectList={jest.fn()}
        onToggleList={jest.fn()}
        onAddList={jest.fn()}
        onOpenSettings={onOpenSettings}
      />,
    );

    // Each tab with onOpenSettings renders the ellipsis-v icon
    const ellipsisButtons = getAllByText("ellipsis-v");
    expect(ellipsisButtons.length).toBe(1);

    fireEvent.press(ellipsisButtons[0]);

    expect(onOpenSettings).toHaveBeenCalledWith("list-1");
  });

  // -----------------------------------------------------------------------
  // Edge case: empty list array
  // -----------------------------------------------------------------------
  it("renders only the plus button when there are no lists", () => {
    const { getByText, queryByText } = render(
      <ListTabBar
        lists={[]}
        activeListId={null}
        selectedListIds={[]}
        onSelectList={jest.fn()}
        onToggleList={jest.fn()}
        onAddList={jest.fn()}
      />,
    );

    expect(getByText("plus")).toBeDefined();
    // No list tabs should exist -- verify no spurious text
    expect(queryByText("Work")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tree traversal utilities
// ---------------------------------------------------------------------------

/**
 * Recursively collect all leaf text strings from a rendered JSON tree.
 */
function collectTextContent(node: any): string[] {
  if (!node) return [];
  if (typeof node === "string") return [node];

  const results: string[] = [];
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      results.push(...collectTextContent(child));
    }
  }
  return results;
}

/**
 * Find the subtree rooted at a direct child of the ScrollView's content
 * that contains the given list name.  This isolates one tab's rendered output.
 */
function findTabContaining(root: any, name: string): any {
  if (!root || typeof root !== "object") return null;

  // If this node's text content includes the name, return it
  if (containsText(root, name)) {
    // But only return if this is a "leaf-ish" tab node (has the name
    // directly rather than being a high-level wrapper).  We walk down
    // until we find the shallowest node that still contains the name
    // but whose children do NOT all contain the name -- i.e. the tab wrapper.
    if (Array.isArray(root.children)) {
      for (const child of root.children) {
        const deeper = findTabContaining(child, name);
        if (deeper) return deeper;
      }
    }
    // No child matched individually -- this node is the shallowest container
    return root;
  }

  return null;
}

function containsText(node: any, text: string): boolean {
  if (!node) return false;
  if (typeof node === "string") return node === text;
  if (Array.isArray(node.children)) {
    return node.children.some((c: any) => containsText(c, text));
  }
  return false;
}

/**
 * Check whether a subtree contains a backgroundColor style with the given value.
 */
function hasColor(node: any, color: string): boolean {
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
    return node.children.some((child: any) => hasColor(child, color));
  }

  return false;
}
