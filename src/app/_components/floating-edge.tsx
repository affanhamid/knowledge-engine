"use client";

import { getBezierPath, Position, useInternalNode } from "@xyflow/react";

function getNodeIntersection(
  intersectionNode: { measured: { width: number; height: number }; internals: { positionAbsolute: { x: number; y: number } } },
  targetNode: { measured: { width: number; height: number }; internals: { positionAbsolute: { x: number; y: number } } },
) {
  const { width: iW, height: iH } = intersectionNode.measured;
  const iPos = intersectionNode.internals.positionAbsolute;
  const tPos = targetNode.internals.positionAbsolute;

  const w = iW / 2;
  const h = iH / 2;
  const x2 = iPos.x + w;
  const y2 = iPos.y + h;
  const x1 = tPos.x + targetNode.measured.width / 2;
  const y1 = tPos.y + targetNode.measured.height / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1) || 1);
  const xx3 = a * xx1;
  const yy3 = a * yy1;

  return { x: w * (xx3 + yy3) + x2, y: h * (-xx3 + yy3) + y2 };
}

function getEdgePosition(
  node: { measured: { width: number; height: number }; internals: { positionAbsolute: { x: number; y: number } } },
  intersectionPoint: { x: number; y: number },
) {
  const nx = Math.round(node.internals.positionAbsolute.x);
  const ny = Math.round(node.internals.positionAbsolute.y);
  const px = Math.round(intersectionPoint.x);
  const py = Math.round(intersectionPoint.y);

  if (px <= nx + 1) return Position.Left;
  if (px >= nx + node.measured.width - 1) return Position.Right;
  if (py <= ny + 1) return Position.Top;
  if (py >= ny + node.measured.height - 1) return Position.Bottom;
  return Position.Top;
}

function getEdgeParams(
  source: { measured: { width: number; height: number }; internals: { positionAbsolute: { x: number; y: number } } },
  target: { measured: { width: number; height: number }; internals: { positionAbsolute: { x: number; y: number } } },
) {
  const sourceIntersection = getNodeIntersection(source, target);
  const targetIntersection = getNodeIntersection(target, source);
  return {
    sx: sourceIntersection.x,
    sy: sourceIntersection.y,
    tx: targetIntersection.x,
    ty: targetIntersection.y,
    sourcePos: getEdgePosition(source, sourceIntersection),
    targetPos: getEdgePosition(target, targetIntersection),
  };
}

type FloatingEdgeProps = {
  id: string;
  source: string;
  target: string;
  markerEnd?: string;
  style?: React.CSSProperties;
};

export function FloatingEdge({ id, source, target, markerEnd, style }: FloatingEdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) return null;

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetPosition: targetPos,
    targetX: tx,
    targetY: ty,
  });

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      markerEnd={markerEnd}
      style={{ stroke: "#a8a29e", strokeWidth: 1.5, strokeDasharray: "6 3", ...style }}
    />
  );
}
