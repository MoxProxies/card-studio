/** True if a keyboard event's target is a text-entry element, so global
 * shortcuts (delete, arrow-nudge, space-to-pan, ...) don't fire while the
 * user is typing in a field that happens to share the same key. */
export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}
