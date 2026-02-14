"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function FolderPage() {
  const { id } = useParams<{ id: string }>();
  const { data: folder } = api.folders.getById.useQuery({ id });
  const { data: graphs, refetch } = api.graphs.listByFolder.useQuery({
    folderId: id,
  });
  const createGraph = api.graphs.create.useMutation({
    onSuccess: () => refetch(),
  });
  const deleteGraph = api.graphs.delete.useMutation({
    onSuccess: () => refetch(),
  });
  const updateGraph = api.graphs.update.useMutation({
    onSuccess: () => refetch(),
  });
  const [newTitle, setNewTitle] = useState("");
  const [editingGraphId, setEditingGraphId] = useState<string | null>(null);
  const [editGraphTitle, setEditGraphTitle] = useState("");

  const handleCreate = () => {
    const title = newTitle.trim();
    if (!title) return;
    createGraph.mutate({ folderId: id, title });
    setNewTitle("");
  };

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href="/"
          className="mb-4 inline-block text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          &larr; Back to folders
        </Link>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">
          {folder?.name ?? "Loading..."}
        </h1>
        <p className="mb-8 text-gray-500 dark:text-gray-400">Graphs in this folder</p>

        {/* Create graph */}
        <div className="mb-8 flex gap-3">
          <input
            type="text"
            placeholder="New graph title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-gray-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-gray-500"
          />
          <button
            onClick={handleCreate}
            disabled={!newTitle.trim() || createGraph.isPending}
            className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            Create Graph
          </button>
        </div>

        {/* Graph list */}
        {graphs && graphs.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {graphs.map((graph) => (
              <div
                key={graph.id}
                className="group relative rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600"
              >
                {editingGraphId === graph.id ? (
                  <input
                    autoFocus
                    value={editGraphTitle}
                    onChange={(e) => setEditGraphTitle(e.target.value)}
                    onBlur={() => {
                      const trimmed = editGraphTitle.trim();
                      if (trimmed && trimmed !== graph.title) {
                        updateGraph.mutate({ id: graph.id, title: trimmed });
                      }
                      setEditingGraphId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") setEditingGraphId(null);
                    }}
                    className="mb-1 w-full rounded border border-gray-300 px-2 py-1 text-sm font-semibold focus:border-gray-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-gray-500"
                  />
                ) : (
                  <Link href={`/graphs/${graph.id}`} className="block">
                    <h3 className="mb-1 font-semibold">{graph.title}</h3>
                  </Link>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(graph.createdAt).toLocaleDateString()}
                </p>
                <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => {
                      setEditingGraphId(graph.id);
                      setEditGraphTitle(graph.title);
                    }}
                    className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => deleteGraph.mutate({ id: graph.id })}
                    className="text-sm text-gray-400 hover:text-red-500 dark:text-gray-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400 dark:text-gray-500">
            No graphs yet. Create one to get started.
          </p>
        )}
      </div>
    </main>
  );
}
