import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

interface RouterValue {
  path: string;
  search: string;
  navigate: (to: string, replace?: boolean) => void;
}

const RouterContext = createContext<RouterValue | null>(null);

const currentLocation = () => ({
  path: window.location.pathname,
  search: window.location.search,
});

export function AppRouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState(currentLocation);

  useEffect(() => {
    const onPopState = () => setLocation(currentLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((to: string, replace = false) => {
    const target = new URL(to, window.location.origin);
    if (replace) {
      window.history.replaceState({}, "", `${target.pathname}${target.search}`);
    } else {
      window.history.pushState({}, "", `${target.pathname}${target.search}`);
    }
    setLocation({ path: target.pathname, search: target.search });
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const value = useMemo(
    () => ({ ...location, navigate }),
    [location, navigate],
  );
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export const useAppRouter = () => {
  const value = useContext(RouterContext);
  if (!value) throw new Error("useAppRouter must be used within AppRouterProvider");
  return value;
};

export function AppLink({
  to,
  onClick,
  children,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
}) {
  const { navigate } = useAppRouter();
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    navigate(to);
  };
  return (
    <a href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
