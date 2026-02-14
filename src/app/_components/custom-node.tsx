"use client";

import { memo, useState } from "react";
import { Handle, Position, NodeResizer, useStore, type NodeProps } from "@xyflow/react";
import { Layers, ChevronLeft, ChevronRight } from "lucide-react";
import { MarkdownRenderer } from "@affanhamid/markdown-renderer";

type CardData = {
  id: string;
  state: string;
  dueDate: string | null;
  stability: number;
};

type QaPairData = {
  id: string;
  question: string;
  answer: string;
  order: number;
  card: CardData | null;
};

type LayerData = {
  id: string;
  type: "fact" | "intuition" | "proof";
  title: string | null;
  order: number;
  qaPairs: QaPairData[];
};

export type CompositeNodeData = {
  label: string;
  subGraphId?: string | null;
  layers: LayerData[];
  onResizeEnd?: (width: number, height: number) => void;
};

const LAYER_LABELS: Record<string, string> = {
  fact: "F",
  intuition: "I",
  proof: "P",
};

const LAYER_COLORS: Record<string, { active: string; inactive: string }> = {
  fact: { active: "bg-blue-500 text-white", inactive: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
  intuition: { active: "bg-amber-500 text-white", inactive: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
  proof: { active: "bg-emerald-500 text-white", inactive: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
};

function getSrsColor(card: CardData | null): string {
  if (!card) return "bg-gray-300"; // no card
  if (card.state === "new") return "bg-gray-400";
  if (!card.dueDate) return "bg-gray-400";

  const now = Date.now();
  const due = new Date(card.dueDate).getTime();
  const hoursUntilDue = (due - now) / (1000 * 60 * 60);

  if (hoursUntilDue < 0) return "bg-red-500"; // overdue
  if (hoursUntilDue < 24) return "bg-yellow-500"; // due soon
  return "bg-green-500"; // not due
}

const ZOOM_DETAIL_THRESHOLD = 0.5;

function CompositeNodeComponent({ id, data, selected }: NodeProps & { data: CompositeNodeData }) {
  const [activeLayerIndex, setActiveLayerIndex] = useState(0);
  const [activeQaIndex, setActiveQaIndex] = useState(0);
  const isOverview = useStore((s) => s.transform[2] < ZOOM_DETAIL_THRESHOLD);

  const sortedLayers = [...data.layers].sort((a, b) => a.order - b.order);
  const activeLayer = sortedLayers[activeLayerIndex];
  const qaPairs = activeLayer?.qaPairs.sort((a, b) => a.order - b.order) ?? [];
  const activeQa = qaPairs[activeQaIndex];

  // Reset QA index when switching layers
  const handleLayerSwitch = (index: number) => {
    setActiveLayerIndex(index);
    setActiveQaIndex(0);
  };

  return (
    <div
      className={`relative flex h-full w-full flex-col rounded-lg border bg-white shadow-sm transition-shadow dark:bg-gray-900 ${
        selected ? "border-blue-500 shadow-md" : "border-gray-200 dark:border-gray-700"
      }`}
      style={{
        minWidth: isOverview ? undefined : 200,
        minHeight: isOverview ? undefined : 100,
        ...(isOverview ? { width: "max-content", borderWidth: 4 } : {}),
      }}
    >
      <NodeResizer
        color="#3b82f6"
        isVisible={selected}
        minWidth={200}
        minHeight={100}
        handleStyle={{ width: 12, height: 12 }}
        lineStyle={{ borderWidth: 4 }}
        onResizeEnd={(_event, params) => {
          data.onResizeEnd?.(params.width, params.height);
        }}
      />

      {/* Handles */}
      <Handle type="target" position={Position.Top} id="top-target" className="!bg-gray-400 dark:!bg-gray-500" />
      <Handle type="source" position={Position.Top} id="top-source" className="!bg-gray-400 dark:!bg-gray-500" />
      <Handle type="target" position={Position.Right} id="right-target" className="!bg-gray-400 dark:!bg-gray-500" />
      <Handle type="source" position={Position.Right} id="right-source" className="!bg-gray-400 dark:!bg-gray-500" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!bg-gray-400 dark:!bg-gray-500" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!bg-gray-400 dark:!bg-gray-500" />
      <Handle type="target" position={Position.Left} id="left-target" className="!bg-gray-400 dark:!bg-gray-500" />
      <Handle type="source" position={Position.Left} id="left-source" className="!bg-gray-400 dark:!bg-gray-500" />

      {/* Header */}
      <div
        className={`flex items-center justify-between ${isOverview ? "px-4 py-3" : "border-b border-gray-100 px-3 py-2 dark:border-gray-800"}`}
      >
        <div
          className={`font-semibold text-gray-900 dark:text-gray-100 ${isOverview ? "text-3xl whitespace-nowrap" : "text-sm"}`}
        >
          {data.label}
        </div>
        {data.subGraphId && (
          <Layers className="ml-2 h-3.5 w-3.5 shrink-0 text-blue-500" />
        )}
      </div>

      {/* Everything below the header is hidden when zoomed out */}
      {!isOverview && (
        <>
          {/* Layer tabs */}
          {sortedLayers.length > 0 && (
            <div className="flex gap-1 border-b border-gray-100 px-3 py-1.5 dark:border-gray-800">
              {sortedLayers.map((layer, i) => {
                const colors = LAYER_COLORS[layer.type] ?? LAYER_COLORS.fact!;
                return (
                  <button
                    key={layer.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLayerSwitch(i);
                    }}
                    className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                      i === activeLayerIndex ? colors.active : colors.inactive
                    }`}
                    title={layer.title ?? layer.type}
                  >
                    {LAYER_LABELS[layer.type] ?? layer.type[0]?.toUpperCase()}
                  </button>
                );
              })}
            </div>
          )}

          {/* QA Content */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {activeQa ? (
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Q</span>
                  <div className="text-xs text-gray-800 dark:text-gray-200">
                    <MarkdownRenderer markdown={activeQa.question} />
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-2 dark:border-gray-800">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">A</span>
                  <div className="text-xs text-gray-800 dark:text-gray-200">
                    <MarkdownRenderer markdown={activeQa.answer} />
                  </div>
                </div>
              </div>
            ) : sortedLayers.length === 0 ? (
              <p className="text-xs italic text-gray-400 dark:text-gray-500">No layers yet</p>
            ) : (
              <p className="text-xs italic text-gray-400 dark:text-gray-500">No Q&amp;A pairs in this layer</p>
            )}
          </div>

          {/* Footer: QA navigation + SRS dots */}
          {qaPairs.length > 0 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-3 py-1.5 dark:border-gray-800">
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveQaIndex((prev) => (prev > 0 ? prev - 1 : qaPairs.length - 1));
                  }}
                  className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <span className="text-[10px] tabular-nums text-gray-500 dark:text-gray-400">
                  {activeQaIndex + 1}/{qaPairs.length}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveQaIndex((prev) => (prev < qaPairs.length - 1 ? prev + 1 : 0));
                  }}
                  className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="flex gap-1">
                {qaPairs.map((qa, i) => (
                  <button
                    key={qa.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveQaIndex(i);
                    }}
                    className={`h-2 w-2 rounded-full transition-transform ${getSrsColor(qa.card)} ${
                      i === activeQaIndex ? "scale-125 ring-1 ring-gray-300 dark:ring-gray-600" : ""
                    }`}
                    title={qa.card?.state ?? "no card"}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export const CustomNode = memo(CompositeNodeComponent);
