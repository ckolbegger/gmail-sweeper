declare module 'react' {
  export type ReactElement = unknown;

  export function createElement(
    type: unknown,
    props?: Record<string, unknown> | null,
    ...children: unknown[]
  ): ReactElement;

  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: unknown[]): T;
  export function useMemo<T>(factory: () => T, deps: unknown[]): T;
  export function useState<S>(
    initialState: S | (() => S)
  ): [S, (nextState: S | ((currentState: S) => S)) => void];
}
