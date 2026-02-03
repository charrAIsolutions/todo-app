/**
 * CategoryHeader regression tests
 *
 * CategoryHeader and UncategorizedHeader are pure display components.  They
 * render a section header row with a name and an optional task count badge.
 * These tests pin down the rendering contract.
 *
 * Behaviours under test:
 *   CategoryHeader
 *     1. Renders the category name
 *     2. Renders the task count when provided
 *     3. Does NOT render a count badge when taskCount is omitted
 *     4. Applies the category's custom background color when color is set
 *     5. Falls back to the default background when color is undefined
 *
 *   UncategorizedHeader
 *     6. Renders the literal text "Uncategorized"
 *     7. Renders the task count when provided
 *     8. Does NOT render a count badge when taskCount is omitted
 */

import React from "react";
import { render } from "@testing-library/react-native";
import { CategoryHeader, UncategorizedHeader } from "../CategoryHeader";
import type { Category } from "@/types/todo";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "cat-1",
    name: "Now",
    sortOrder: 0,
    ...overrides,
  };
}

/**
 * Pull the backgroundColor out of a rendered element's style prop.
 * Handles both plain objects and arrays of style objects (StyleSheet pattern).
 */
function extractBackgroundColor(styleValue: unknown): string | undefined {
  if (!styleValue) return undefined;

  const styles = Array.isArray(styleValue) ? styleValue : [styleValue];
  // Iterate in reverse so that later entries (inline overrides) win,
  // matching React Native's style merge semantics
  for (let i = styles.length - 1; i >= 0; i--) {
    const s = styles[i];
    if (s && typeof s === "object" && "backgroundColor" in s) {
      return (s as { backgroundColor: string }).backgroundColor;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// CategoryHeader tests
// ---------------------------------------------------------------------------

describe("CategoryHeader", () => {
  it("renders the category name", () => {
    const category = makeCategory({ name: "Later" });
    const { getByText } = render(<CategoryHeader category={category} />);

    expect(getByText("Later")).toBeDefined();
  });

  it("renders the task count badge when taskCount is provided", () => {
    const category = makeCategory({ name: "Now" });
    const { getByText } = render(
      <CategoryHeader category={category} taskCount={5} />,
    );

    expect(getByText("5")).toBeDefined();
  });

  it("does not render a count badge when taskCount is omitted", () => {
    const category = makeCategory({ name: "Now" });
    const { toJSON } = render(<CategoryHeader category={category} />);
    const tree = toJSON();

    // The count badge is a <Text> that renders only the number.
    // When taskCount is undefined, that Text element should not appear.
    // We verify by confirming no child text node equals a bare number string.
    const textNodes = findAllTextContent(tree);
    // The only text should be the category name; no numeric-only string
    expect(textNodes).toEqual(["Now"]);
  });

  describe("background color", () => {
    it("uses the category color when color is provided", () => {
      const category = makeCategory({ color: "#FF5733" });
      const { toJSON } = render(<CategoryHeader category={category} />);
      const tree = toJSON();

      // The root element is the container View with the conditional bg style
      const bg = extractBackgroundColor(tree?.props?.style);
      expect(bg).toBe("#FF5733");
    });

    it("falls back to the default background when color is not set", () => {
      const category = makeCategory({ color: undefined });
      const { toJSON } = render(<CategoryHeader category={category} />);
      const tree = toJSON();

      const bg = extractBackgroundColor(tree?.props?.style);
      // The StyleSheet default is "#f0f0f0"; if no inline color override
      // exists, we should NOT see a custom color
      expect(bg).toBe("#f0f0f0");
    });
  });
});

// ---------------------------------------------------------------------------
// UncategorizedHeader tests
// ---------------------------------------------------------------------------

describe("UncategorizedHeader", () => {
  it("renders the text 'Uncategorized'", () => {
    const { getByText } = render(<UncategorizedHeader />);

    expect(getByText("Uncategorized")).toBeDefined();
  });

  it("renders the task count badge when taskCount is provided", () => {
    const { getByText } = render(<UncategorizedHeader taskCount={3} />);

    expect(getByText("3")).toBeDefined();
  });

  it("does not render a count badge when taskCount is omitted", () => {
    const { toJSON } = render(<UncategorizedHeader />);
    const tree = toJSON();

    const textNodes = findAllTextContent(tree);
    expect(textNodes).toEqual(["Uncategorized"]);
  });
});

// ---------------------------------------------------------------------------
// Utility: recursively collect all text content from a rendered JSON tree
// ---------------------------------------------------------------------------

function findAllTextContent(node: any): string[] {
  if (!node) return [];
  if (typeof node === "string") return [node];

  const results: string[] = [];

  // If this is a Text element, collect its direct string children
  if (node.type === "Text" && Array.isArray(node.children)) {
    for (const child of node.children) {
      if (typeof child === "string") {
        results.push(child);
      }
    }
    return results;
  }

  // Otherwise recurse into children
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      results.push(...findAllTextContent(child));
    }
  }

  return results;
}
