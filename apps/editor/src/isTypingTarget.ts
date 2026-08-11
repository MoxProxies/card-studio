/** True if a keyboard event's target is a text-entry element, so global
 * shortcuts (delete, arrow-nudge, space-to-pan, ...) don't fire while the
 * user is typing in a field that happens to share the same key.
 *
 * Takes the event itself, not `e.target` — both call sites listen on
 * `window`, which sits *outside* the shadow root the embed renders into
 * (see embed.ts). A listener outside a shadow boundary sees `e.target`
 * retargeted to the shadow host (`<card-studio-editor>`, never an actual
 * INPUT/TEXTAREA) for any event that originated inside it, so reading
 * `e.target` directly would make this always return false inside the
 * embed — every keystroke while typing in a text field would also fire
 * global shortcuts (Delete removing the selected layer instead of a
 * character, Ctrl+Z undoing instead of the browser's own undo, ...).
 * `e.composedPath()[0]` is the real innermost target regardless of
 * shadow boundaries; falls back to `e.target` for a synthetic/manually
 * dispatched event with no composed path. */
export function isTypingTarget(e: Event): boolean {
  const target = e.composedPath()[0] ?? e.target;
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}
