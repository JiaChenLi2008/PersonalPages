import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Frame bound on the anchor-sync ring. 90 frames is 1.5s at 60fps, twice the
 * longest grid-row transition (--dur-2), so it is only ever reached when no
 * `transitionend` arrives at all.
 */
const SYNC_MAX_FRAMES = 90;

/**
 * group -> panel id -> "close this panel". Module scope, so one panel can close its
 * group siblings without a provider, and groups never see each other.
 */
const GROUP_MEMBERS = new Map<string, Map<string, () => void>>();

export type RevealPanelOptions = {
  /** The panel element's id; the trigger's `aria-controls` points at it. */
  panelId: string;
  /** The trigger element's id; the panel's `aria-labelledby` points back at it. */
  triggerId: string;
  /** Mutual exclusion: opening a panel closes the other members of this group. Panels
      in other groups are untouched, and a group may end up with none open. */
  group: string;
};

export type RevealTriggerProps = {
  id: string;
  ref: RefObject<HTMLButtonElement | null>;
  "aria-controls": string;
  "aria-expanded": boolean;
  "data-state": "open" | "closed";
  onClick: () => void;
};

export type RevealPanelProps = {
  id: string;
  ref: RefObject<HTMLDivElement | null>;
  role: "region";
  "aria-labelledby": string;
  "data-reveal-panel": string;
  "data-state": "open" | "closed";
};

export type RevealPanel = {
  open: boolean;
  triggerProps: RevealTriggerProps;
  panelProps: RevealPanelProps;
};

/** True when this environment must not animate: SSR, or the user asked for reduced motion. */
function prefersReducedMotion(): boolean {
  return typeof window === "undefined" || window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Scrolls now. The page sets `scroll-behavior: smooth` (Nav.css), which would animate
 * every frame's correction and let the anchor drift; engines that predate the "instant"
 * value throw on the options dictionary, so they scroll plainly instead.
 */
function scrollNow(delta: number): void {
  try {
    window.scrollBy({ top: delta, behavior: "instant" });
  } catch {
    window.scrollBy(0, delta);
  }
}

/**
 * Shared reveal skeleton (BLUEPRINT §4 #3/#5): one trigger/panel pair, group exclusion
 * and the anchor-sync ring. The panel's height is CSS driven (motion.css:
 * `[data-reveal-panel]` goes grid-template-rows 0fr → 1fr), so this hook writes no
 * inline height and no inline transition — the terminal state lives in `aria-expanded`
 * and `data-state` alone, and a second click during a transition just reverses it.
 *
 * While a panel moves, the revealed answer and the collapsing sibling shift the page
 * under the clicked trigger, so the ring holds that trigger in place: one read of its
 * rect per frame and at most one scroll write, ended by the panel's `transitionend` or
 * by SYNC_MAX_FRAMES. The measurement is batched once before the state change, which is
 * also what restarts the ring cleanly when a click interrupts a running one.
 * The wrapper of a group carries `.motion-reveal-group` (motion.css): the browser's own
 * scroll anchoring is off there, so the two corrections cannot add up.
 *
 * Ceiling: the ring holds the trigger for the length of the transition, so a scroll the
 * user starts inside that window is corrected away too. Stop the ring on the first
 * user input if that ever matters.
 */
export function useRevealPanel({ panelId, triggerId, group }: RevealPanelOptions): RevealPanel {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /** The trigger's viewport position, read before the state change the ring tracks. */
  const anchorTop = useRef<number | null>(null);

  useEffect(() => {
    const members = GROUP_MEMBERS.get(group) ?? new Map<string, () => void>();
    GROUP_MEMBERS.set(group, members);
    members.set(panelId, () => setOpen(false));
    return () => {
      members.delete(panelId);
      if (members.size === 0) {
        GROUP_MEMBERS.delete(group);
      }
    };
  }, [group, panelId]);

  const toggle = useCallback(() => {
    /* One batched read before the DOM changes: this is the position the ring holds. */
    const trigger = triggerRef.current;
    anchorTop.current = trigger === null ? null : trigger.getBoundingClientRect().top;
    if (!open) {
      for (const [id, close] of GROUP_MEMBERS.get(group) ?? []) {
        if (id !== panelId) {
          close();
        }
      }
    }
    setOpen((wasOpen) => !wasOpen);
  }, [group, open, panelId]);

  useEffect(() => {
    const start = anchorTop.current;
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    anchorTop.current = null;
    if (start === null || trigger === null) {
      return;
    }

    let frame: number | null = null;
    let frames = 0;
    /* Reduced motion has no transition to track: the height changes in one frame, and
       one measured correction is the whole ring. */
    const reduced = prefersReducedMotion();

    const stop = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      panel?.removeEventListener("transitionend", onTransitionEnd);
    };

    /* Only the panel's own row transition ends the ring; the layered answers bubble
       their own transitionend up from the panel's children and run longer. */
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target === panel) {
        stop();
      }
    };

    const step = () => {
      frame = null;
      const delta = trigger.getBoundingClientRect().top - start;
      if (delta !== 0) {
        scrollNow(delta);
      }
      frames += 1;
      if (reduced || frames >= SYNC_MAX_FRAMES) {
        stop();
        return;
      }
      frame = requestAnimationFrame(step);
    };

    panel?.addEventListener("transitionend", onTransitionEnd);
    frame = requestAnimationFrame(step);
    return stop;
  }, [open]);

  const state = open ? "open" : "closed";

  return {
    open,
    triggerProps: {
      id: triggerId,
      ref: triggerRef,
      "aria-controls": panelId,
      "aria-expanded": open,
      "data-state": state,
      onClick: toggle,
    },
    panelProps: {
      id: panelId,
      ref: panelRef,
      role: "region",
      "aria-labelledby": triggerId,
      "data-reveal-panel": "",
      "data-state": state,
    },
  };
}
