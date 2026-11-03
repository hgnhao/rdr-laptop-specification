import { useSyncExternalStore } from "react";
import { SYSTEM_DARK, THEME_KEY as KEY } from "./themeScript";

export type Theme = "light" | "dark";

const EVENT = "themechange";

function current(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  const media = matchMedia(SYSTEM_DARK);
  const onSystemChange = () => {
    if (!localStorage.getItem(KEY)) apply(media.matches ? "dark" : "light");
  };
  window.addEventListener(EVENT, callback);
  media.addEventListener("change", onSystemChange);
  return () => {
    window.removeEventListener(EVENT, callback);
    media.removeEventListener("change", onSystemChange);
  };
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {}
  if ("startViewTransition" in document) {
    document.startViewTransition(() => apply(theme));
  } else {
    apply(theme);
  }
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, current, () => "light");
}
