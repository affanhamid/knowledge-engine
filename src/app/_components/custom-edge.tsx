"use client";

import {
  memo,
  useState,
  useCallback,
  useRef,
  useEffect,
  createContext,
  useContext,
} from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";

export const EdgeContext = createContext<{
  editingEdgeId: string | null;
  onLabelChange: (id: string, label: string | null) => void;
  clearEditing: () => void;
}>({
  editingEdgeId: null,
  onLabelChange: () => {},
  clearEditing: () => {},
});

function CustomEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  selected,
}: EdgeProps) {
  const { editingEdgeId, onLabelChange, clearEditing } =
    useContext(EdgeContext);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Triggered by onEdgeDoubleClick from parent (for clicks on the SVG path)
  useEffect(() => {
    if (editingEdgeId === id && !isEditing) {
      setEditValue(String(label ?? ""));
      setIsEditing(true);
      clearEditing();
    }
  }, [editingEdgeId, id, isEditing, label, clearEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditValue(String(label ?? ""));
      setIsEditing(true);
    },
    [label],
  );

  const handleSave = useCallback(() => {
    setIsEditing(false);
    const trimmed = editValue.trim();
    onLabelChange(id, trimmed || null);
  }, [editValue, id, onLabelChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSave();
      if (e.key === "Escape") setIsEditing(false);
    },
    [handleSave],
  );

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
          onDoubleClick={handleDoubleClick}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="rounded border border-blue-400 bg-white px-2 py-0.5 text-xs text-gray-800 shadow-sm focus:outline-none dark:bg-gray-900 dark:text-gray-200"
              style={{ minWidth: 60 }}
            />
          ) : label ? (
            <div
              className={`cursor-pointer rounded border bg-white px-2 py-0.5 text-xs dark:bg-gray-900 ${
                selected
                  ? "border-blue-400 text-blue-700 dark:text-blue-400"
                  : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400"
              }`}
            >
              {label}
            </div>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const CustomEdge = memo(CustomEdgeComponent);
