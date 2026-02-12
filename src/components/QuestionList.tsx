// src/components/QuestionList.tsx
"use client";

import React from "react";
import { PlusIcon, MinusIcon } from "@heroicons/react/24/outline";

type QuestionListProps = {
  initial?: string[]; // optional initial list
  onChange?: (questions: string[]) => void; // optional callback
};

export default function QuestionList({ initial, onChange }: QuestionListProps) {
  const [questions, setQuestions] = React.useState<string[]>(() =>
    initial && initial.length > 0
      ? initial.slice()
      : Array.from({ length: 4 }).map(() => ""),
  );

  React.useEffect(() => {
    onChange?.(questions);
  }, [questions, onChange]);

  function updateAt(index: number, value: string) {
    setQuestions((prev) => {
      const copy = prev.slice();
      copy[index] = value;
      return copy;
    });
  }

  function insertAt(index: number) {
    setQuestions((prev) => {
      const copy = prev.slice();
      copy.splice(index + 1, 0, "");
      return copy;
    });
  }

  function removeAt(index: number) {
    setQuestions((prev) => {
      if (prev.length <= 1) return prev; // keep at least one
      const copy = prev.slice();
      copy.splice(index, 1);
      return copy;
    });
  }

  function append() {
    setQuestions((prev) => [...prev, ""]);
  }

  return (
    <div>
      <h3 className="text-lg font-medium mb-3">Therapy questions</h3>
      <p className="text-sm text-gray-500 mb-4">
        Edit the list of questions you want to use during the session.
      </p>

      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1">
              <label className="sr-only">Question {i + 1}</label>
              <input
                value={q}
                onChange={(e) => updateAt(i, e.target.value)}
                placeholder={`Question ${i + 1}`}
                className="w-full rounded-md border border-gray-200 p-2 focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            <div className="flex flex-col gap-1">
              <button
                type="button"
                title="Insert after"
                onClick={() => insertAt(i)}
                className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
              >
                <PlusIcon className="h-4 w-4 text-gray-600" />
              </button>

              <button
                type="button"
                title="Remove"
                onClick={() => removeAt(i)}
                className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                disabled={questions.length <= 1}
              >
                <MinusIcon className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <button
          onClick={append}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4" />
          Add question
        </button>
      </div>
    </div>
  );
}
