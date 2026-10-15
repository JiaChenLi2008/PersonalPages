import { useCallback, useState } from "react";

/** Props for one reveal pair: a `<button aria-expanded aria-controls>` trigger and
    the answer panel it controls (BLUEPRINT §4#3–#5, §6.2). The panel is never
    unmounted — it starts `hidden` and loses that attribute on reveal — and the
    trigger is the only path to it, so pointer and keyboard take the same route.
    Ids are literal strings at the call sites, so server and client agree. */
export type RevealPair = {
  triggerProps: {
    "aria-controls": string;
    "aria-expanded": boolean;
    onClick: () => void;
  };
  panelProps: {
    id: string;
    hidden: boolean;
  };
};

export function useReveal(panelId: string): RevealPair {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((wasOpen) => !wasOpen), []);

  return {
    triggerProps: { "aria-controls": panelId, "aria-expanded": open, onClick: toggle },
    panelProps: { id: panelId, hidden: !open },
  };
}
