"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { FlowEditor } from "~/app/_components/flow-editor";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import type { Node as RFNode, Edge as RFEdge } from "@xyflow/react";

export default function GraphPage() {
  const { id } = useParams<{ id: string }>();
  const { data: graph } = api.graphs.getById.useQuery({ id });
  const { data: breadcrumbs } = api.graphs.getBreadcrumbs.useQuery({ graphId: id });
  const updateGraph = api.graphs.update.useMutation();

  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [flowNodes, setFlowNodes] = useState<RFNode[]>([]);
  const [flowEdges, setFlowEdges] = useState<RFEdge[]>([]);

  useEffect(() => {
    if (graph) setTitle(graph.title);
  }, [graph]);

  const saveTitle = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== graph?.title) {
      updateGraph.mutate({ id, title: trimmed });
    }
    setEditing(false);
  };

  const handleStateChange = useCallback(
    (nodes: RFNode[], edges: RFEdge[]) => {
      setFlowNodes(nodes);
      setFlowEdges(edges);
    },
    [],
  );

  return (
    <div className="flex h-screen flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
        <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          {graph && (
            <Link href={`/folders/${graph.folderId}`} className="hover:text-gray-700 dark:hover:text-gray-300">
              Folder
            </Link>
          )}
          {breadcrumbs?.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <span key={crumb.graphId} className="flex items-center gap-1">
                <span className="text-gray-300 dark:text-gray-600">/</span>
                {isLast ? (
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{crumb.graphTitle}</span>
                ) : (
                  <Link href={`/graphs/${crumb.graphId}`} className="hover:text-gray-700 dark:hover:text-gray-300">
                    {crumb.graphTitle}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === "Enter" && saveTitle()}
            className="rounded border border-gray-300 px-2 py-1 text-sm font-semibold focus:border-gray-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-gray-500"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-sm font-semibold text-gray-900 hover:text-gray-600 dark:text-gray-100 dark:hover:text-gray-400"
          >
            {graph?.title ?? "Loading..."}
          </button>
        )}

        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setJsonOpen(true)}
          >
            JSON
          </Button>
        </div>
      </div>

      {/* React Flow canvas */}
      <div className="flex-1">
        <FlowEditor graphId={id} parentFolderId={graph?.folderId ?? ""} onStateChange={handleStateChange} />
      </div>

      {/* JSON sidebar */}
      <Sheet open={jsonOpen} onOpenChange={setJsonOpen}>
        <SheetContent side="right" className="w-[400px] sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle>Graph JSON</SheetTitle>
            <SheetDescription>
              Raw nodes and edges data for this graph.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 px-4 pb-4">
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Nodes ({flowNodes.length})
                </h4>
                <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                  {JSON.stringify(flowNodes, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Edges ({flowEdges.length})
                </h4>
                <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                  {JSON.stringify(flowEdges, null, 2)}
                </pre>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
