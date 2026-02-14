"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function Home() {
  const { data: folders, refetch } = api.folders.list.useQuery();
  const createFolder = api.folders.create.useMutation({ onSuccess: () => refetch() });
  const deleteFolder = api.folders.delete.useMutation({ onSuccess: () => refetch() });
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    createFolder.mutate({ name });
    setNewName("");
  };

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">
          Knowledge Engine
        </h1>
        <p className="mb-10 text-gray-500 dark:text-gray-400">
          Visual note-taking with interactive knowledge graphs
        </p>

        {/* Create folder */}
        <div className="mb-8 flex gap-3">
          <input
            type="text"
            placeholder="New folder name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-gray-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-gray-500"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || createFolder.isPending}
            className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            Create Folder
          </button>
        </div>

        {/* Folder grid */}
        {folders && folders.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="group relative rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600"
              >
                <Link href={`/folders/${folder.id}`} className="block">
                  <h3 className="mb-1 font-semibold">{folder.name}</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(folder.createdAt).toLocaleDateString()}
                  </p>
                </Link>
                <button
                  onClick={() => deleteFolder.mutate({ id: folder.id })}
                  className="absolute right-3 top-3 text-sm text-gray-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-gray-500"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400 dark:text-gray-500">
            No folders yet. Create one to get started.
          </p>
        )}
      </div>
    </main>
  );
}
