"use client";

import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  reconnectEdge,
  useNodesState,
  useEdgesState,
  type ReactFlowInstance,
  type Connection,
  type Node as RFNode,
  type Edge as RFEdge,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { CustomNode, type CompositeNodeData } from "./custom-node";
import { CustomEdge, EdgeContext } from "./custom-edge";

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

type DbNode = {
  id: string;
  graphId: string;
  label: string;
  type: string;
  positionX: number;
  positionY: number;
  width: number | null;
  height: number | null;
  subGraphId: string | null;
  createdAt: string;
  updatedAt: string;
  layers: LayerData[];
};

type DbEdge = {
  id: string;
  graphId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string | null;
  targetHandle: string | null;
  label: string | null;
  type: string;
  createdAt: string;
};

function dbNodesToFlow(dbNodes: DbNode[], graphId: string, makeResizeHandler: (id: string) => (w: number, h: number) => void): RFNode[] {
  return dbNodes.map((n) => ({
    id: n.id,
    type: "custom",
    position: { x: n.positionX, y: n.positionY },
    ...(n.width != null && n.height != null
      ? { width: n.width, height: n.height, style: { width: n.width, height: n.height } }
      : {}),
    data: {
      label: n.label,
      subGraphId: n.subGraphId,
      layers: n.layers,
      graphId,
      onResizeEnd: makeResizeHandler(n.id),
    } satisfies CompositeNodeData,
  }));
}

function dbEdgesToFlow(dbEdges: DbEdge[]): RFEdge[] {
  return dbEdges.map((e) => ({
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    label: e.label ?? undefined,
    type: "custom",
  }));
}

const nodeTypes = { custom: CustomNode };
const edgeTypes = { custom: CustomEdge };

const LAYER_TYPES = ["fact", "intuition", "proof"] as const;
type LayerType = (typeof LAYER_TYPES)[number];

type FlowEditorProps = {
  graphId: string;
  parentFolderId: string;
  onStateChange?: (nodes: RFNode[], edges: RFEdge[]) => void;
};

export function FlowEditor({ graphId, parentFolderId, onStateChange }: FlowEditorProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const { data: dbNodes } = api.nodes.listByGraph.useQuery({ graphId });
  const { data: dbEdges } = api.edges.listByGraph.useQuery({ graphId });

  const createNode = api.nodes.create.useMutation();
  const updateNode = api.nodes.update.useMutation();
  const deleteNode = api.nodes.delete.useMutation();
  const createEdge = api.edges.create.useMutation();
  const updateEdgeMutation = api.edges.update.useMutation();
  const deleteEdge = api.edges.delete.useMutation();
  const createGraph = api.graphs.create.useMutation();

  // Layer & QA mutations
  const createLayer = api.nodeLayers.create.useMutation();
  const deleteLayer = api.nodeLayers.delete.useMutation();
  const createQaPair = api.qaPairs.create.useMutation();
  const updateQaPair = api.qaPairs.update.useMutation();
  const deleteQaPair = api.qaPairs.delete.useMutation();

  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([]);
  const [selectedNode, setSelectedNode] = useState<RFNode | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [panelWidth, setPanelWidth] = useState(288);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);

  // Layer/QA editing state
  const [newLayerType, setNewLayerType] = useState<LayerType>("fact");
  const [editingQaId, setEditingQaId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [addingToLayerId, setAddingToLayerId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileDrop = useCallback(
    async (
      e: React.DragEvent<HTMLTextAreaElement>,
      setter: React.Dispatch<React.SetStateAction<string>>,
    ) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (!files.length) return;

      setIsUploading(true);
      try {
        for (const file of Array.from(files)) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("type", "images");

          const res = await fetch("/api/upload", { method: "POST", body: formData });
          if (!res.ok) continue;
          const data = (await res.json()) as { filePath: string; fileName: string };

          const markdownLink = file.type.startsWith("image/")
            ? `![${data.fileName}](/api/files/${data.filePath})`
            : `[${data.fileName}](/api/files/${data.filePath})`;

          setter((prev) => (prev ? prev + "\n" + markdownLink : markdownLink));
        }
      } finally {
        setIsUploading(false);
      }
    },
    [],
  );

  const panelDragRef = useRef<{ axis: "x" | "y" | "xy"; startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!panelDragRef.current) return;
      const { axis, startX, startY, startWidth, startHeight } = panelDragRef.current;
      if (axis === "x" || axis === "xy") {
        const delta = startX - e.clientX;
        setPanelWidth(Math.min(Math.max(startWidth + delta, 256), window.innerWidth * 0.8));
      }
      if (axis === "y" || axis === "xy") {
        const delta = e.clientY - startY;
        setPanelHeight(Math.min(Math.max(startHeight + delta, 200), window.innerHeight * 0.9));
      }
    };
    const onMouseUp = () => {
      panelDragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dataFileInputRef = useRef<HTMLInputElement>(null);
  const generateFromPdf = api.graphs.generateFromPdf.useMutation();

  const [filesOpen, setFilesOpen] = useState(false);
  const { data: graphFilesList, refetch: refetchFiles } =
    api.graphFiles.listByGraph.useQuery({ graphId });
  const addGraphFile = api.graphFiles.add.useMutation();
  const deleteGraphFile = api.graphFiles.delete.useMutation();

  const initializedRef = useRef(false);
  const connectStartRef = useRef<{ nodeId: string; handleId: string | null } | null>(null);
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  const updateNodeRef = useRef(updateNode);
  updateNodeRef.current = updateNode;

  const makeResizeHandler = useCallback(
    (nodeId: string) => (width: number, height: number) => {
      updateNodeRef.current.mutate({ id: nodeId, width, height });
    },
    [],
  );

  const handleDataFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "data");
      formData.append("graphId", graphId);

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) return;
        const { filePath, fileName, mimeType, fileSizeBytes } = (await res.json()) as {
          filePath: string;
          fileName: string;
          mimeType: string;
          fileSizeBytes: number;
        };
        await addGraphFile.mutateAsync({
          graphId,
          fileName,
          filePath,
          fileSizeBytes,
          mimeType,
        });
        await refetchFiles();
      } catch (err) {
        console.error("Data file upload failed:", err);
      }
    },
    [graphId, addGraphFile, refetchFiles],
  );

  const handleDataFileDelete = useCallback(
    async (fileId: string) => {
      await deleteGraphFile.mutateAsync({ id: fileId });
      await refetchFiles();
    },
    [deleteGraphFile, refetchFiles],
  );

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(nodes, edges);
  }, [nodes, edges, onStateChange]);

  // Load DB data into React Flow state on first load, sync data updates after
  const dbNodesRef = useRef(dbNodes);
  useEffect(() => {
    if (!dbNodes || !dbEdges) return;

    if (!initializedRef.current) {
      // First load — set positions and everything
      const flowNodes = dbNodesToFlow(dbNodes as DbNode[], graphId, makeResizeHandler);
      setNodes(flowNodes);
      setEdges(dbEdgesToFlow(dbEdges));
      initializedRef.current = true;
      dbNodesRef.current = dbNodes;
    } else if (dbNodes !== dbNodesRef.current) {
      // Subsequent data updates (e.g. after layer/QA mutations) — update data only, preserve positions
      dbNodesRef.current = dbNodes;
      setNodes((currentNodes) =>
        currentNodes.map((rfNode) => {
          const dbNode = (dbNodes as DbNode[]).find((n) => n.id === rfNode.id);
          if (!dbNode) return rfNode;
          return {
            ...rfNode,
            data: {
              label: dbNode.label,
              subGraphId: dbNode.subGraphId,
              layers: dbNode.layers,
              graphId,
              onResizeEnd: makeResizeHandler(rfNode.id),
            } satisfies CompositeNodeData,
          };
        }),
      );
    }
  }, [dbNodes, dbEdges, setNodes, setEdges, makeResizeHandler]);

  // Debounced save for node position changes
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);

      for (const change of changes) {
        if (change.type === "position" && change.position && !change.dragging) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(() => {
            updateNode.mutate({
              id: change.id,
              positionX: change.position!.x,
              positionY: change.position!.y,
            });
          }, 300);
        }
        if (change.type === "remove") {
          deleteNode.mutate({ id: change.id });
        }
      }
    },
    [onNodesChange, updateNode, deleteNode],
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      for (const change of changes) {
        if (change.type === "remove") {
          deleteEdge.mutate({ id: change.id });
        }
      }
    },
    [onEdgesChange, deleteEdge],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      setEdges((eds) => addEdge({ ...connection, type: "custom" }, eds));
      createEdge.mutate({
        graphId,
        sourceNodeId: connection.source,
        targetNodeId: connection.target,
        sourceHandle: connection.sourceHandle ?? null,
        targetHandle: connection.targetHandle ?? null,
      });
    },
    [setEdges, createEdge, graphId],
  );

  const onConnectStart = useCallback(
    (_: MouseEvent | TouchEvent, params: { nodeId: string | null; handleId: string | null }) => {
      connectStartRef.current = params.nodeId
        ? { nodeId: params.nodeId, handleId: params.handleId }
        : null;
    },
    [],
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const source = connectStartRef.current;
      connectStartRef.current = null;
      if (!source || !rfInstanceRef.current) return;

      const target = event.target as HTMLElement;
      if (target.closest(".react-flow__handle") || target.closest(".react-flow__node")) return;

      const clientX = "changedTouches" in event ? event.changedTouches[0]!.clientX : event.clientX;
      const clientY = "changedTouches" in event ? event.changedTouches[0]!.clientY : event.clientY;
      const position = rfInstanceRef.current.screenToFlowPosition({ x: clientX, y: clientY });

      createNode.mutate(
        { graphId, label: "New Node", positionX: position.x, positionY: position.y },
        {
          onSuccess: (result) => {
            const newNode: RFNode = {
              id: result.id,
              type: "custom",
              position,
              data: {
                label: "New Node",
                subGraphId: null,
                layers: [],
                graphId,
                onResizeEnd: makeResizeHandler(result.id),
              } satisfies CompositeNodeData,
            };
            setNodes((nds) => [...nds, newNode]);

            const edgeConnection = {
              source: source.nodeId,
              target: result.id,
              sourceHandle: source.handleId,
              targetHandle: null,
            };
            setEdges((eds) => addEdge({ ...edgeConnection, type: "custom" }, eds));
            createEdge.mutate({
              graphId,
              sourceNodeId: source.nodeId,
              targetNodeId: result.id,
              sourceHandle: source.handleId ?? null,
              targetHandle: null,
            });
          },
        },
      );
    },
    [createNode, createEdge, graphId, setNodes, setEdges, makeResizeHandler],
  );

  const addNewNode = useCallback(() => {
    const x = Math.random() * 400 + 100;
    const y = Math.random() * 400 + 100;
    createNode.mutate(
      { graphId, label: "New Node", positionX: x, positionY: y },
      {
        onSuccess: (result) => {
          setNodes((nds) => [
            ...nds,
            {
              id: result.id,
              type: "custom",
              position: { x, y },
              data: {
                label: "New Node",
                subGraphId: null,
                layers: [],
                graphId,
                onResizeEnd: makeResizeHandler(result.id),
              } satisfies CompositeNodeData,
            },
          ]);
        },
      },
    );
  }, [createNode, graphId, setNodes, makeResizeHandler]);

  const cleanUpLayout = useCallback(() => {
    // Step 1: strip explicit sizes so nodes auto-fit their content
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        width: undefined,
        height: undefined,
        style: { ...n.style, width: undefined, height: undefined },
      })),
    );

    // Step 2: wait for React Flow to measure natural sizes, then run dagre
    requestAnimationFrame(() => {
      setTimeout(() => {
        const rf = rfInstanceRef.current;
        if (!rf) return;
        const currentNodes = rf.getNodes();
        const currentEdges = rf.getEdges();

        const g = new dagre.graphlib.Graph();
        g.setGraph({ rankdir: "TB", nodesep: 30, ranksep: 50 });
        g.setDefaultEdgeLabel(() => ({}));

        for (const node of currentNodes) {
          const w = node.measured?.width ?? 250;
          const h = node.measured?.height ?? 150;
          g.setNode(node.id, { width: w, height: h });
        }
        for (const edge of currentEdges) {
          g.setEdge(edge.source, edge.target);
        }

        dagre.layout(g);

        // Build a map of positioned nodes (top-left coords + dimensions)
        const positionedNodes = new Map<string, { x: number; y: number; w: number; h: number }>();

        setNodes((nds) =>
          nds.map((n) => {
            const pos = g.node(n.id);
            if (!pos) return n;
            const w = pos.width;
            const h = pos.height;
            // dagre returns center coords, React Flow uses top-left
            const x = pos.x - w / 2;
            const y = pos.y - h / 2;

            positionedNodes.set(n.id, { x, y, w, h });

            // persist to DB
            updateNode.mutate({ id: n.id, positionX: x, positionY: y, width: null, height: null });

            return {
              ...n,
              position: { x, y },
              width: undefined,
              height: undefined,
              style: { ...n.style, width: undefined, height: undefined },
            };
          }),
        );

        // Optimize edge handles: pick the (sourceSide, targetSide) pair with shortest distance
        const sides = ["top", "right", "bottom", "left"] as const;
        const getHandlePoint = (rect: { x: number; y: number; w: number; h: number }, side: typeof sides[number]) => {
          const cx = rect.x + rect.w / 2;
          const cy = rect.y + rect.h / 2;
          switch (side) {
            case "top": return { x: cx, y: rect.y };
            case "right": return { x: rect.x + rect.w, y: cy };
            case "bottom": return { x: cx, y: rect.y + rect.h };
            case "left": return { x: rect.x, y: cy };
          }
        };

        for (const edge of currentEdges) {
          const srcRect = positionedNodes.get(edge.source);
          const tgtRect = positionedNodes.get(edge.target);
          if (!srcRect || !tgtRect) continue;

          let bestSourceHandle = "bottom-source";
          let bestTargetHandle = "top-target";
          let minDist = Infinity;

          for (const srcSide of sides) {
            const sp = getHandlePoint(srcRect, srcSide);
            for (const tgtSide of sides) {
              const tp = getHandlePoint(tgtRect, tgtSide);
              const dist = Math.hypot(sp.x - tp.x, sp.y - tp.y);
              if (dist < minDist) {
                minDist = dist;
                bestSourceHandle = `${srcSide}-source`;
                bestTargetHandle = `${tgtSide}-target`;
              }
            }
          }

          // Update edge in React Flow state
          setEdges((eds) =>
            eds.map((e) =>
              e.id === edge.id
                ? { ...e, sourceHandle: bestSourceHandle, targetHandle: bestTargetHandle }
                : e,
            ),
          );

          // Persist to DB
          updateEdgeMutation.mutate({ id: edge.id, sourceHandle: bestSourceHandle, targetHandle: bestTargetHandle });
        }

        // fit the viewport to the new layout
        setTimeout(() => rf.fitView({ padding: 0.1 }), 50);
      }, 100);
    });
  }, [setNodes, setEdges, updateNode, updateEdgeMutation]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      setSelectedNode(node);
      setEditLabel((node.data as CompositeNodeData).label);
      setEditingQaId(null);
      setAddingToLayerId(null);
    },
    [],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_, node) => {
      const subGraphId = (node.data as CompositeNodeData).subGraphId;
      if (subGraphId) {
        router.push(`/graphs/${subGraphId}`);
      }
    },
    [router],
  );

  // Edge label editing
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);

  const handleEdgeLabelChange = useCallback(
    (edgeId: string, newLabel: string | null) => {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edgeId ? { ...e, label: newLabel ?? undefined } : e,
        ),
      );
      updateEdgeMutation.mutate({ id: edgeId, label: newLabel });
    },
    [setEdges, updateEdgeMutation],
  );

  const clearEditing = useCallback(() => {
    setEditingEdgeId(null);
  }, []);

  const onEdgeDoubleClick = useCallback(
    (_: React.MouseEvent, edge: RFEdge) => {
      setEditingEdgeId(edge.id);
    },
    [],
  );

  const edgeContextValue = useMemo(
    () => ({ editingEdgeId, onLabelChange: handleEdgeLabelChange, clearEditing }),
    [editingEdgeId, handleEdgeLabelChange, clearEditing],
  );

  // Delete edge on drop (reconnect handlers)
  const edgeReconnectSuccessful = useRef(true);

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect = useCallback(
    (oldEdge: RFEdge, newConnection: Connection) => {
      edgeReconnectSuccessful.current = true;
      setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
      updateEdgeMutation.mutate({
        id: oldEdge.id,
        sourceNodeId: newConnection.source,
        targetNodeId: newConnection.target,
        sourceHandle: newConnection.sourceHandle ?? null,
        targetHandle: newConnection.targetHandle ?? null,
      });
    },
    [setEdges, updateEdgeMutation],
  );

  const onReconnectEnd = useCallback(
    (_: MouseEvent | TouchEvent, edge: RFEdge) => {
      if (!edgeReconnectSuccessful.current) {
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        deleteEdge.mutate({ id: edge.id });
      }
      edgeReconnectSuccessful.current = true;
    },
    [setEdges, deleteEdge],
  );

  const saveNodeLabel = useCallback(() => {
    if (!selectedNode) return;
    const label = editLabel.trim() || "Untitled";
    updateNode.mutate({ id: selectedNode.id, label });
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, label } }
          : n,
      ),
    );
  }, [selectedNode, editLabel, updateNode, setNodes]);

  // Layer mutations
  const handleAddLayer = useCallback(async () => {
    if (!selectedNode) return;
    const nodeLayers = (selectedNode.data as CompositeNodeData).layers;
    await createLayer.mutateAsync({
      nodeId: selectedNode.id,
      type: newLayerType,
      order: nodeLayers.length,
    });
    await utils.nodes.listByGraph.invalidate({ graphId });
  }, [selectedNode, newLayerType, createLayer, utils.nodes.listByGraph, graphId]);

  const handleDeleteLayer = useCallback(async (layerId: string) => {
    await deleteLayer.mutateAsync({ id: layerId });
    await utils.nodes.listByGraph.invalidate({ graphId });
  }, [deleteLayer, utils.nodes.listByGraph, graphId]);

  // QA pair mutations
  const handleAddQaPair = useCallback(async (layerId: string) => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    const layer = (selectedNode?.data as CompositeNodeData)?.layers.find((l) => l.id === layerId);
    await createQaPair.mutateAsync({
      layerId,
      question: newQuestion.trim(),
      answer: newAnswer.trim(),
      order: layer?.qaPairs.length ?? 0,
    });
    setNewQuestion("");
    setNewAnswer("");
    setAddingToLayerId(null);
    await utils.nodes.listByGraph.invalidate({ graphId });
  }, [selectedNode, newQuestion, newAnswer, createQaPair, utils.nodes.listByGraph, graphId]);

  const handleUpdateQaPair = useCallback(async (qaId: string) => {
    if (!editQuestion.trim() || !editAnswer.trim()) return;
    await updateQaPair.mutateAsync({
      id: qaId,
      question: editQuestion.trim(),
      answer: editAnswer.trim(),
    });
    setEditingQaId(null);
    await utils.nodes.listByGraph.invalidate({ graphId });
  }, [editQuestion, editAnswer, updateQaPair, utils.nodes.listByGraph, graphId]);

  const handleDeleteQaPair = useCallback(async (qaId: string) => {
    await deleteQaPair.mutateAsync({ id: qaId });
    await utils.nodes.listByGraph.invalidate({ graphId });
  }, [deleteQaPair, utils.nodes.listByGraph, graphId]);

  const handlePdfUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      setIsGenerating(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "sources");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) throw new Error("Upload failed");
        const { filePath, mimeType } = (await uploadRes.json()) as {
          filePath: string;
          mimeType: string;
        };

        const result = await generateFromPdf.mutateAsync({
          graphId,
          filePath,
          mimeType,
        });

        const newNodes: RFNode[] = result.nodes.map((n: { id: string; label: string; positionX: number; positionY: number }) => ({
          id: n.id,
          type: "custom" as const,
          position: { x: n.positionX, y: n.positionY },
          data: {
            label: n.label,
            subGraphId: null,
            layers: [],
            graphId,
            onResizeEnd: makeResizeHandler(n.id),
          } satisfies CompositeNodeData,
        }));
        const newEdges: RFEdge[] = result.edges.map((e: { id: string; sourceNodeId: string; targetNodeId: string; label?: string | null }) => ({
          id: e.id,
          source: e.sourceNodeId,
          target: e.targetNodeId,
          label: e.label ?? undefined,
          type: "custom" as const,
        }));

        setNodes((nds) => [...nds, ...newNodes]);
        setEdges((eds) => [...eds, ...newEdges]);
      } catch (err) {
        console.error("PDF generation failed:", err);
      } finally {
        setIsGenerating(false);
      }
    },
    [graphId, generateFromPdf, setNodes, setEdges, makeResizeHandler],
  );

  // Get selected node's layers from the latest data
  const selectedNodeData = selectedNode
    ? (nodes.find((n) => n.id === selectedNode.id)?.data as CompositeNodeData | undefined)
    : undefined;

  return (
    <div className="relative h-full w-full">
      <EdgeContext.Provider value={edgeContextValue}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onInit={(instance) => { rfInstanceRef.current = instance; }}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onPaneClick={onPaneClick}
          onReconnectStart={onReconnectStart}
          onReconnect={onReconnect}
          onReconnectEnd={onReconnectEnd}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          deleteKeyCode={["Delete", "Backspace"]}
          panOnScroll={true}
          panOnDrag={[1, 2]}
          zoomOnScroll={false}
          minZoom={0.01}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </EdgeContext.Provider>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handlePdfUpload}
      />
      <input
        ref={dataFileInputRef}
        type="file"
        className="hidden"
        onChange={handleDataFileUpload}
      />

      {/* Data Files panel */}
      {filesOpen && (
        <div className="absolute bottom-16 left-6 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Data Files</h4>
            <button
              onClick={() => dataFileInputRef.current?.click()}
              className="rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Upload
            </button>
          </div>
          {graphFilesList && graphFilesList.length > 0 ? (
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {graphFilesList.map((f) => (
                <li key={f.id} className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-xs dark:bg-gray-800">
                  <span className="truncate text-gray-700 dark:text-gray-300" title={f.fileName}>
                    {f.fileName}
                  </span>
                  <button
                    onClick={() => handleDataFileDelete(f.id)}
                    className="ml-2 shrink-0 text-red-500 hover:text-red-700"
                  >
                    x
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">No files uploaded yet.</p>
          )}
        </div>
      )}

      {/* Bottom action buttons */}
      <div className="absolute bottom-6 right-6 flex gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isGenerating}
          className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          {isGenerating ? "Generating..." : "Generate from PDF"}
        </button>
        <button
          onClick={cleanUpLayout}
          className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          Clean Up
        </button>
        <button
          onClick={addNewNode}
          className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          + Add Node
        </button>
      </div>
      <div className="absolute bottom-6 left-6">
        <button
          onClick={() => setFilesOpen((o) => !o)}
          className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          Data Files
        </button>
      </div>

      {/* Node inspector panel */}
      {selectedNode && selectedNodeData && (
        <div
          style={{ width: panelWidth, ...(panelHeight != null ? { height: panelHeight } : {}) }}
          className="absolute right-4 top-4 overflow-auto rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {/* Left-edge resize handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-gray-300 active:bg-gray-400 rounded-l-lg dark:hover:bg-gray-600 dark:active:bg-gray-500"
            onMouseDown={(e) => {
              e.preventDefault();
              const h = (e.currentTarget.parentElement as HTMLElement).offsetHeight;
              panelDragRef.current = { axis: "x", startX: e.clientX, startY: e.clientY, startWidth: panelWidth, startHeight: panelHeight ?? h };
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";
            }}
          />
          {/* Bottom-edge resize handle */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1.5 cursor-row-resize hover:bg-gray-300 active:bg-gray-400 rounded-b-lg dark:hover:bg-gray-600 dark:active:bg-gray-500"
            onMouseDown={(e) => {
              e.preventDefault();
              const h = (e.currentTarget.parentElement as HTMLElement).offsetHeight;
              panelDragRef.current = { axis: "y", startX: e.clientX, startY: e.clientY, startWidth: panelWidth, startHeight: panelHeight ?? h };
              document.body.style.cursor = "row-resize";
              document.body.style.userSelect = "none";
            }}
          />
          {/* Bottom-left corner resize handle */}
          <div
            className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize hover:bg-gray-300 active:bg-gray-400 rounded-bl-lg dark:hover:bg-gray-600 dark:active:bg-gray-500"
            onMouseDown={(e) => {
              e.preventDefault();
              const h = (e.currentTarget.parentElement as HTMLElement).offsetHeight;
              panelDragRef.current = { axis: "xy", startX: e.clientX, startY: e.clientY, startWidth: panelWidth, startHeight: panelHeight ?? h };
              document.body.style.cursor = "nesw-resize";
              document.body.style.userSelect = "none";
            }}
          />

          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Edit Node</h3>

          {/* Label */}
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Label</label>
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-gray-500"
            />
            <button
              onClick={saveNodeLabel}
              className="rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Save
            </button>
          </div>

          {/* Subgraph section */}
          <div className="mb-3 border-t border-gray-200 pt-3 dark:border-gray-700">
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Subgraph</label>
            {selectedNodeData.subGraphId ? (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    router.push(`/graphs/${selectedNodeData.subGraphId}`);
                  }}
                  className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                >
                  Open Subgraph
                </button>
                <button
                  onClick={() => {
                    updateNode.mutate({ id: selectedNode.id, subGraphId: null });
                    setNodes((nds) =>
                      nds.map((n) =>
                        n.id === selectedNode.id
                          ? { ...n, data: { ...n.data, subGraphId: null } }
                          : n,
                      ),
                    );
                  }}
                  className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Unlink
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  createGraph.mutate(
                    {
                      folderId: parentFolderId,
                      title: `${selectedNodeData.label} - Subgraph`,
                    },
                    {
                      onSuccess: (result) => {
                        updateNode.mutate({ id: selectedNode.id, subGraphId: result.id });
                        setNodes((nds) =>
                          nds.map((n) =>
                            n.id === selectedNode.id
                              ? { ...n, data: { ...n.data, subGraphId: result.id } }
                              : n,
                          ),
                        );
                      },
                    },
                  );
                }}
                className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Create Subgraph
              </button>
            )}
          </div>

          {/* Layers section */}
          <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Layers</label>
              <div className="flex items-center gap-1">
                <select
                  value={newLayerType}
                  onChange={(e) => setNewLayerType(e.target.value as LayerType)}
                  className="rounded border border-gray-300 px-1.5 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                >
                  {LAYER_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddLayer}
                  disabled={createLayer.isPending}
                  className="rounded bg-gray-900 px-2 py-0.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                >
                  + Add
                </button>
              </div>
            </div>

            {selectedNodeData.layers.length === 0 ? (
              <p className="text-xs italic text-gray-400 dark:text-gray-500">No layers yet. Add one above.</p>
            ) : (
              <div className="space-y-3">
                {[...selectedNodeData.layers]
                  .sort((a, b) => a.order - b.order)
                  .map((layer) => (
                    <div key={layer.id} className="rounded border border-gray-200 p-2 dark:border-gray-700">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-medium capitalize text-gray-700 dark:text-gray-300">
                          {layer.type}
                          {layer.title ? ` — ${layer.title}` : ""}
                        </span>
                        <button
                          onClick={() => handleDeleteLayer(layer.id)}
                          disabled={deleteLayer.isPending}
                          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>

                      {/* QA pairs */}
                      {layer.qaPairs.length > 0 && (
                        <div className="space-y-1.5">
                          {[...layer.qaPairs]
                            .sort((a, b) => a.order - b.order)
                            .map((qa) => (
                              <div key={qa.id} className="rounded bg-gray-50 p-1.5 dark:bg-gray-800">
                                {editingQaId === qa.id ? (
                                  <div className="space-y-1">
                                    <input
                                      type="text"
                                      value={editQuestion}
                                      onChange={(e) => setEditQuestion(e.target.value)}
                                      placeholder="Question"
                                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                    />
                                    <textarea
                                      value={editAnswer}
                                      onChange={(e) => setEditAnswer(e.target.value)}
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={(e) => void handleFileDrop(e, setEditAnswer)}
                                      placeholder={isUploading ? "Uploading..." : "Answer (drop files here)"}
                                      rows={3}
                                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                    />
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => handleUpdateQaPair(qa.id)}
                                        disabled={updateQaPair.isPending}
                                        className="rounded bg-gray-900 px-2 py-0.5 text-xs text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingQaId(null)}
                                        className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between gap-1">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium text-gray-700 truncate dark:text-gray-300">Q: {qa.question}</p>
                                      <p className="text-xs text-gray-500 truncate dark:text-gray-400">A: {qa.answer}</p>
                                    </div>
                                    <div className="flex shrink-0 gap-1">
                                      <button
                                        onClick={() => {
                                          setEditingQaId(qa.id);
                                          setEditQuestion(qa.question);
                                          setEditAnswer(qa.answer);
                                        }}
                                        className="text-xs text-blue-500 hover:text-blue-700"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteQaPair(qa.id)}
                                        disabled={deleteQaPair.isPending}
                                        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                                      >
                                        Del
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Add QA pair form */}
                      {addingToLayerId === layer.id ? (
                        <div className="mt-1.5 space-y-1">
                          <input
                            type="text"
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            placeholder="Question"
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                          />
                          <textarea
                            value={newAnswer}
                            onChange={(e) => setNewAnswer(e.target.value)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => void handleFileDrop(e, setNewAnswer)}
                            placeholder={isUploading ? "Uploading..." : "Answer (supports markdown, drop files here)"}
                            rows={3}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleAddQaPair(layer.id)}
                              disabled={createQaPair.isPending}
                              className="rounded bg-gray-900 px-2 py-0.5 text-xs text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => {
                                setAddingToLayerId(null);
                                setNewQuestion("");
                                setNewAnswer("");
                              }}
                              className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingToLayerId(layer.id)}
                          className="mt-1.5 w-full rounded border border-dashed border-gray-300 py-1 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-300"
                        >
                          + Add Q&A Pair
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Close button */}
          <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
            <button
              onClick={() => setSelectedNode(null)}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
