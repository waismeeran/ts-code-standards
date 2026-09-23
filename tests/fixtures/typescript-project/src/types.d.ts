interface SharedType {
  value: string;
}

namespace JSX {
  interface Element {
    readonly __jsxElement: unique symbol;
  }

  interface IntrinsicElements {
    main: Record<string, unknown>;
  }
}
