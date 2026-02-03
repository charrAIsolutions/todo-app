// =============================================================================
// Global test mocks -- runs before each test worker via jest.config setupFiles
// =============================================================================
// Every jest.mock() call here applies to the entire test suite.  The rationale
// for each mock is documented inline so that future contributors understand
// WHY, not just WHAT.

// ---------------------------------------------------------------------------
// @expo/vector-icons -- ships native binaries; the icon components just need
// to render something recognisable in snapshots / queries.
// ---------------------------------------------------------------------------
jest.mock("@expo/vector-icons/FontAwesome", () => {
  const React = require("react");
  return function MockFontAwesome(props) {
    // Pass size and color through so tests can assert on icon styling
    return React.createElement(
      "Text",
      { testID: "icon-fontawesome", color: props.color, size: props.size },
      props.name || "icon",
    );
  };
});

// ---------------------------------------------------------------------------
// react-native-reanimated -- heavily tied to the native UI thread via
// SharedValue / worklets.  The official mock (jestUtils) is the supported path,
// but we replicate the essentials here so tests run without the full native
// module.  Animated.View needs to forward refs and render children.
// ---------------------------------------------------------------------------
jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const { View, Text, ScrollView, Image } = require("react-native");

  // SharedValue stub -- .value reads/writes work synchronously in tests
  function createSharedValue(initialValue) {
    return { value: initialValue };
  }

  // useSharedValue returns a plain object with a .value property
  function useSharedValue(initialValue) {
    const ref = React.useRef({ value: initialValue });
    return ref.current;
  }

  // useAnimatedStyle -- just call the style factory once and return the result
  function useAnimatedStyle(styleFactory) {
    return styleFactory();
  }

  // Animation helpers -- return the value unchanged; tests don't run timers
  function withSpring(value) {
    return value;
  }
  function withTiming(value) {
    return value;
  }
  function runOnJS(fn) {
    return fn;
  }

  // Animated namespace -- wrap each RN primitive in React.forwardRef so that
  // <Animated.View ref={...}> works without crashing
  const Animated = {
    View: React.forwardRef((props, ref) =>
      React.createElement(View, { ...props, ref }),
    ),
    Text: React.forwardRef((props, ref) =>
      React.createElement(Text, { ...props, ref }),
    ),
    ScrollView: React.forwardRef((props, ref) =>
      React.createElement(ScrollView, { ...props, ref }),
    ),
    Image: React.forwardRef((props, ref) =>
      React.createElement(Image, { ...props, ref }),
    ),
    createAnimatedComponent: (Component) =>
      React.forwardRef((props, ref) =>
        React.createElement(Component, { ...props, ref }),
      ),
  };

  return {
    __esModule: true,
    default: Animated,
    Animated,
    useSharedValue,
    useAnimatedStyle,
    useAnimatedProps: () => ({}),
    useAnimatedScrollProps: () => ({}),
    withSpring,
    withTiming,
    runOnJS,
    SharedValue: createSharedValue, // rarely used directly
    Easing: { linear: (t) => t, ease: (t) => t },
  };
});

// ---------------------------------------------------------------------------
// react-native-gesture-handler -- gesture primitives have no meaning outside
// a native window.  GestureDetector just renders its child; Gesture.Pan()
// returns a chainable stub so that .activeOffsetX(...).onStart(...) etc.
// do not crash.
// ---------------------------------------------------------------------------
jest.mock("react-native-gesture-handler", () => {
  const React = require("react");
  const { View } = require("react-native");

  // Chainable stub for Gesture.Pan() -- every method returns `this`
  class GestureStub {
    activeOffsetX() {
      return this;
    }
    activeOffsetY() {
      return this;
    }
    onStart() {
      return this;
    }
    onUpdate() {
      return this;
    }
    onEnd() {
      return this;
    }
    onFinalize() {
      return this;
    }
  }

  const Gesture = {
    Pan: () => new GestureStub(),
  };

  // GestureDetector wraps a single child -- it does nothing in tests
  function GestureDetector({ children }) {
    return React.Children.only(children);
  }

  // GestureHandlerRootView is just a transparent wrapper
  const GestureHandlerRootView = React.forwardRef((props, ref) =>
    React.createElement(View, { ...props, ref }),
  );

  return {
    __esModule: true,
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
  };
});

// ---------------------------------------------------------------------------
// expo-haptics -- calls into a native haptic engine; no-op in tests
// ---------------------------------------------------------------------------
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: "Light", Medium: "Medium", Heavy: "Heavy" },
  NotificationFeedbackType: {
    Success: "Success",
    Warning: "Warning",
    Error: "Error",
  },
}));

// ---------------------------------------------------------------------------
// expo-router -- useRouter is consumed by the main screen; we only need a
// stub with push/replace/back as jest.fn() so tests can assert navigation
// ---------------------------------------------------------------------------
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  }),
  Link: require("react").forwardRef((props, ref) =>
    require("react").createElement("View", { ...props, ref }),
  ),
}));

// ---------------------------------------------------------------------------
// @react-native-async-storage/async-storage -- uses native storage.  We
// provide an in-memory mock so that any code path that touches storage
// (like useAppData hydration) does not throw.
// ---------------------------------------------------------------------------
jest.mock("@react-native-async-storage/async-storage", () => {
  let store = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key) => Promise.resolve(store[key] ?? null)),
      setItem: jest.fn((key, value) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
        return Promise.resolve();
      }),
      multiRemove: jest.fn((keys) => {
        keys.forEach((k) => delete store[k]);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store = {};
        return Promise.resolve();
      }),
      // Helper exposed so tests can reset between runs
      __reset: () => {
        store = {};
      },
    },
  };
});

// ---------------------------------------------------------------------------
// Keyboard mock -- AddTaskInput calls Keyboard.dismiss() after submitting.
// We can't easily mock just Keyboard from react-native, so we rely on the
// component being defensive (using optional chaining) or mock at test level.
// ---------------------------------------------------------------------------
