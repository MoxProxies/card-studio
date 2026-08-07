import type { MouseEvent as ReactMouseEvent } from "react";

/** A thin draggable divider between two flex panels. Reports the raw
 * horizontal drag delta each frame; the caller decides how to apply it
 * (which panel grows/shrinks) — this component has no opinion on layout. */
export function ResizeHandle({ onDrag }: { onDrag: (deltaX: number) => void }) {
  const handleMouseDown = (e: ReactMouseEvent) => {
    e.preventDefault();
    let lastX = e.clientX;

    const handleMouseMove = (ev: MouseEvent) => {
      onDrag(ev.clientX - lastX);
      lastX = ev.clientX;
    };
    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      className="cs-resize-handle"
      style={{ width: 6, flex: "none", cursor: "col-resize", position: "relative" }}
    >
      <div style={{ position: "absolute", inset: "0 2px" }} />
    </div>
  );
}
