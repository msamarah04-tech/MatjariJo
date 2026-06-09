import { useSearchParams } from 'react-router-dom';

/**
 * Read/clear a `?focus=<id>` style deep-link param (used to auto-open detail
 * drawers or scroll+highlight a row). Shared by the platform and admin areas.
 */
export function useFocusParam(key = 'focus'): [string | null, () => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key);
  const clear = () => {
    const next = new URLSearchParams(params);
    next.delete(key);
    setParams(next, { replace: true });
  };
  return [value, clear];
}
