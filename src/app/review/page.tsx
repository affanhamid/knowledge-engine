"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { MarkdownRenderer } from "@affanhamid/markdown-renderer";

export default function ReviewPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const { data: dueCards, refetch } = api.cards.listDue.useQuery({ limit: 50 });
  const reviewMutation = api.cards.review.useMutation();

  const currentCard = dueCards?.[currentIndex];

  const handleRate = async (rating: number) => {
    if (!currentCard) return;
    await reviewMutation.mutateAsync({ cardId: currentCard.card.id, rating });
    setShowAnswer(false);

    if (currentIndex + 1 < (dueCards?.length ?? 0)) {
      setCurrentIndex((i) => i + 1);
    } else {
      // Refetch to check for more due cards
      await refetch();
      setCurrentIndex(0);
    }
  };

  if (!dueCards) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (dueCards.length === 0 || currentIndex >= dueCards.length) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">All caught up!</h1>
        <p className="text-gray-500 dark:text-gray-400">No cards due for review.</p>
        <a href="/" className="rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200">
          Back to Home
        </a>
      </div>
    );
  }

  if (!currentCard) return null;
  const { qaPair, layer, node } = currentCard;

  return (
    <div className="flex h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <span>{node.label}</span>
          <span>/</span>
          <span className="capitalize">{layer.type}</span>
          <span className="ml-auto">
            {currentIndex + 1} / {dueCards.length}
          </span>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          {/* Question */}
          <div className="mb-6">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Question
            </span>
            <div className="text-lg text-gray-900 dark:text-gray-100">
              <MarkdownRenderer markdown={qaPair.question} />
            </div>
          </div>

          {/* Answer */}
          {showAnswer ? (
            <div className="border-t border-gray-100 pt-6 dark:border-gray-800">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Answer
              </span>
              <div className="text-base text-gray-800 dark:text-gray-200">
                <MarkdownRenderer markdown={qaPair.answer} />
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAnswer(true)}
              className="w-full rounded-lg border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Show Answer
            </button>
          )}
        </div>

        {/* Rating buttons */}
        {showAnswer && (
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => handleRate(1)}
              disabled={reviewMutation.isPending}
              className="rounded-lg bg-red-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              Again
            </button>
            <button
              onClick={() => handleRate(2)}
              disabled={reviewMutation.isPending}
              className="rounded-lg bg-orange-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              Hard
            </button>
            <button
              onClick={() => handleRate(3)}
              disabled={reviewMutation.isPending}
              className="rounded-lg bg-blue-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              Good
            </button>
            <button
              onClick={() => handleRate(4)}
              disabled={reviewMutation.isPending}
              className="rounded-lg bg-green-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
            >
              Easy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
