/**
 * ListTab regression tests
 *
 * ListTab is a pure visual component for a tab in the horizontal list tab bar.
 * It shows the list name, reflects active/inactive state via styling, and
 * conditionally renders a settings ellipsis button.
 *
 * Gestures (tap, double-tap, drag) are handled by the wrapping DraggableTab,
 * NOT by ListTab itself. ListTab only owns the ellipsis onPress for settings.
 *
 * Behaviours under test:
 *   1. Renders the list name
 *   2. Does not render the ellipsis when onOpenSettings is not provided
 *   3. Renders the ellipsis when onOpenSettings is provided
 *   4. Calls onOpenSettings when the ellipsis is pressed
 *   5. Active tab uses "list-tab-active" testID
 *   6. Inactive tab uses "list-tab" testID
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ListTab } from "../ListTab";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ListTab", () => {
  // -----------------------------------------------------------------------
  // Basic rendering
  // -----------------------------------------------------------------------
  it("renders the provided list name", () => {
    const { getByText } = render(<ListTab name="Work" isActive={false} />);

    expect(getByText("Work")).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // Settings ellipsis presence / absence
  // -----------------------------------------------------------------------
  describe("settings ellipsis button", () => {
    it("is NOT rendered when onOpenSettings is not provided", () => {
      const { queryByText } = render(
        <ListTab name="NoSettings" isActive={false} />,
      );

      // The ellipsis icon is rendered by FontAwesome with name="ellipsis-v".
      // Our mock renders it as <Text testID="icon-fontawesome">ellipsis-v</Text>.
      // If onOpenSettings is omitted, the entire settings Pressable is not rendered.
      expect(queryByText("ellipsis-v")).toBeNull();
    });

    it("IS rendered when onOpenSettings is provided", () => {
      const { getByText } = render(
        <ListTab
          name="WithSettings"
          isActive={false}
          onOpenSettings={jest.fn()}
        />,
      );

      // The mock FontAwesome component renders the icon name as text content
      expect(getByText("ellipsis-v")).toBeDefined();
    });

    it("calls onOpenSettings when the ellipsis is pressed", () => {
      const onOpenSettings = jest.fn();

      const { getByText } = render(
        <ListTab
          name="SettingsTab"
          isActive={false}
          onOpenSettings={onOpenSettings}
        />,
      );

      // Press the ellipsis icon text (the mock renders "ellipsis-v")
      fireEvent.press(getByText("ellipsis-v"));

      expect(onOpenSettings).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // Active / inactive testID
  // -----------------------------------------------------------------------
  describe("active state", () => {
    it("active tab has testID 'list-tab-active'", () => {
      const { getByTestId } = render(<ListTab name="Active" isActive={true} />);

      expect(getByTestId("list-tab-active")).toBeDefined();
    });

    it("inactive tab has testID 'list-tab'", () => {
      const { getByTestId } = render(
        <ListTab name="Inactive" isActive={false} />,
      );

      expect(getByTestId("list-tab")).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Ellipsis icon colour reflects active state
  // -----------------------------------------------------------------------
  describe("ellipsis icon colour", () => {
    function findIconColor(tree: any): string | undefined {
      if (!tree || typeof tree !== "object") return undefined;

      // Our mock FontAwesome has testID="icon-fontawesome"
      if (tree.props?.testID === "icon-fontawesome") {
        return tree.props?.color;
      }

      if (Array.isArray(tree.children)) {
        for (const child of tree.children) {
          const result = findIconColor(child);
          if (result) return result;
        }
      }

      return undefined;
    }

    it("ellipsis is white (#fff) on an active tab", () => {
      const { toJSON } = render(
        <ListTab name="Active" isActive={true} onOpenSettings={jest.fn()} />,
      );

      expect(findIconColor(toJSON())).toBe("#fff");
    });

    it("ellipsis is grey on an inactive tab", () => {
      const { toJSON } = render(
        <ListTab name="Inactive" isActive={false} onOpenSettings={jest.fn()} />,
      );

      // Inactive color is now a CSS variable reference
      const color = findIconColor(toJSON());
      expect(color).toBeDefined();
      expect(color).not.toBe("#fff");
    });
  });

  // -----------------------------------------------------------------------
  // isDragged visual feedback
  // -----------------------------------------------------------------------
  describe("isDragged prop", () => {
    it("applies reduced opacity when isDragged is true", () => {
      const { getByTestId } = render(
        <ListTab name="Dragged" isActive={true} isDragged={true} />,
      );

      const tab = getByTestId("list-tab-active");
      const styles = Array.isArray(tab.props.style)
        ? tab.props.style
        : [tab.props.style];
      const hasReducedOpacity = styles.some(
        (s: any) => s && typeof s === "object" && s.opacity === 0.5,
      );
      expect(hasReducedOpacity).toBe(true);
    });

    it("does not apply reduced opacity when isDragged is false", () => {
      const { getByTestId } = render(
        <ListTab name="NotDragged" isActive={true} isDragged={false} />,
      );

      const tab = getByTestId("list-tab-active");
      const styles = Array.isArray(tab.props.style)
        ? tab.props.style
        : [tab.props.style];
      const hasReducedOpacity = styles.some(
        (s: any) => s && typeof s === "object" && s.opacity === 0.5,
      );
      expect(hasReducedOpacity).toBe(false);
    });
  });
});
