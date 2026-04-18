// src/components/QuestionList.tsx
"use client";

import React from "react";
import { PlusIcon, MinusIcon } from "@heroicons/react/24/outline";

import { KeyboardButton } from "@/components/KeyboardButton";
import { FileCopy, PlusOne } from "@mui/icons-material";
/**
 * A single question object persisted in DB or passed around in the app.
 * `id` and `order` are optional because client-created questions won't have an id yet.
 */
export type Question = {
  id?: number;
  text: string;
  order?: number;
};

type QuestionListProps = {
  // initial list can be plain strings (backwards compat) or typed Question objects
  initial?: Array<string | Question>;
  // onChange receives the full typed Question[] whenever the list changes
  onChange?: (questions: Question[]) => void;

  showSaveModal?: (show: boolean) => void; // callback to control save modal visibility
};

export default function QuestionList({
  initial,
  onChange,
  showSaveModal,
}: QuestionListProps) {
  // normalize the incoming initial value into Question[]
  const normalizeInitial = React.useCallback(
    (init?: Array<string | Question>): Question[] => {
      if (!init || init.length === 0) {
        // default: 4 empty questions
        return Array.from({ length: 4 }).map((_, i) => ({
          text: "",
          order: i,
        }));
      }
      return init.map((item, i) =>
        typeof item === "string"
          ? { text: item, order: i }
          : { id: item.id, text: item.text ?? "", order: item.order ?? i },
      );
    },
    [],
  );

  const [questions, setQuestions] = React.useState<Question[]>(() =>
    normalizeInitial(initial),
  );

  // keep a ref of current questions to allow comparisons without adding `questions` as a dep
  const questionsRef = React.useRef<Question[]>(questions);
  React.useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  // helper: shallow-equality for string arrays
  const stringArrayEqual = React.useCallback((a: string[], b: string[]) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }, []);

  // remember the last normalized initial as an array of texts (stable)
  const lastNormalizedTextsRef = React.useRef<string[] | null>(null);

  // PENDING approach: when incoming `initial` changes meaningfully, set it as pending
  // (do NOT immediately call setQuestions here).
  const [pendingInitial, setPendingInitial] = React.useState<Question[] | null>(
    null,
  );

  React.useEffect(() => {
    const normalized = normalizeInitial(initial);
    const normalizedTexts = normalized.map((q) => q.text ?? "");

    // If we've already processed this same normalized initial, do nothing.
    if (
      lastNormalizedTextsRef.current &&
      stringArrayEqual(lastNormalizedTextsRef.current, normalizedTexts)
    ) {
      return;
    }

    // If normalized texts equal the current internal texts, remember and do nothing.
    const currentTexts = questionsRef.current.map((q) => q.text ?? "");
    if (stringArrayEqual(currentTexts, normalizedTexts)) {
      lastNormalizedTextsRef.current = normalizedTexts;
      return;
    }

    // Otherwise schedule a pending load. The actual assignment to local state
    // happens in the "apply pending" effect below.
    setPendingInitial(normalized);
    // do NOT update lastNormalizedTextsRef here until apply happens
  }, [initial, normalizeInitial, stringArrayEqual]);

  // Apply pendingInitial exactly once (if present) — but only if it still differs
  // from the current internal texts (safety guard).
  React.useEffect(() => {
    if (!pendingInitial) return;

    const normalizedTexts = pendingInitial.map((q) => q.text ?? "");
    const currentTexts = questionsRef.current.map((q) => q.text ?? "");

    if (stringArrayEqual(currentTexts, normalizedTexts)) {
      // nothing to do, but remember we saw this initial
      lastNormalizedTextsRef.current = normalizedTexts;
      setPendingInitial(null);
      return;
    }

    // apply the load
    setQuestions(pendingInitial);
    lastNormalizedTextsRef.current = normalizedTexts;
    setPendingInitial(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingInitial, stringArrayEqual]);

  // emit changes with stable order values to the parent
  // don't emit when the internal questions exactly match the last normalized initial
  // (that would just re-send what the parent already sent and can cause a loop).
  React.useEffect(() => {
    const withOrder = questions.map((q, i) => ({ ...q, order: i }));
    const currentTexts = withOrder.map((q) => q.text ?? "");

    if (
      lastNormalizedTextsRef.current &&
      stringArrayEqual(lastNormalizedTextsRef.current, currentTexts)
    ) {
      return;
    }

    onChange?.(withOrder);
  }, [questions, onChange, stringArrayEqual]);

  function updateAt(index: number, value: string) {
    setQuestions((prev) => {
      const copy = prev.slice();
      copy[index] = { ...copy[index], text: value };
      return copy;
    });
  }

  function insertAt(index: number) {
    setQuestions((prev) => {
      const copy = prev.slice();
      // insert new empty question after index
      copy.splice(index + 1, 0, { text: "", order: index + 1 });
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
    setQuestions((prev) => [...prev, { text: "", order: prev.length }]);
  }

  return (
    <div>
      <h3 className="text-lg font-medium mb-3">Therapy questions</h3>
      <p className="text-sm text-gray-500 mb-4">
        Edit the list of questions you want to use during the session.
      </p>

      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={`${q.id ?? "n"}-${i}`} className="flex items-start gap-2">
            <div className="flex-1">
              <label className="sr-only">Question {i + 1}</label>
              <input
                value={q.text}
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

      <div className="mt- ">
        <KeyboardButton
          onClick={append}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
          text1="Add question"
          text2="Add question"
          icon={<PlusOne className="h-4 w-4" />}
        />

        <KeyboardButton
          onClick={() => showSaveModal && showSaveModal(true)}
          className="inline-flex items-center gap-2 px-3 py-2  rounded-md bg-green-600 text-white hover:bg-green-700 ml-6"
          text1="Save questions"
          text2="Save questions"
          icon={<FileCopy className="h-4 w-4 " />}
        />
      </div>
    </div>
  );
}

// // src/components/QuestionList.tsx
// "use client";

// import React from "react";
// import { PlusIcon, MinusIcon } from "@heroicons/react/24/outline";

// type QuestionListProps = {
//   initial?: string[]; // optional initial list
//   onChange?: (questions: string[]) => void; // optional callback
// };

// export default function QuestionList({ initial, onChange }: QuestionListProps) {
//   const [questions, setQuestions] = React.useState<string[]>(() =>
//     initial && initial.length > 0
//       ? initial.slice()
//       : Array.from({ length: 4 }).map(() => ""),
//   );

//   React.useEffect(() => {
//     onChange?.(questions);
//   }, [questions, onChange]);

//   function updateAt(index: number, value: string) {
//     setQuestions((prev) => {
//       const copy = prev.slice();
//       copy[index] = value;
//       return copy;
//     });
//   }

//   function insertAt(index: number) {
//     setQuestions((prev) => {
//       const copy = prev.slice();
//       copy.splice(index + 1, 0, "");
//       return copy;
//     });
//   }

//   function removeAt(index: number) {
//     setQuestions((prev) => {
//       if (prev.length <= 1) return prev; // keep at least one
//       const copy = prev.slice();
//       copy.splice(index, 1);
//       return copy;
//     });
//   }

//   function append() {
//     setQuestions((prev) => [...prev, ""]);
//   }

//   return (
//     <div>
//       <h3 className="text-lg font-medium mb-3">Therapy questions</h3>
//       <p className="text-sm text-gray-500 mb-4">
//         Edit the list of questions you want to use during the session.
//       </p>

//       <div className="space-y-3">
//         {questions.map((q, i) => (
//           <div key={i} className="flex items-start gap-2">
//             <div className="flex-1">
//               <label className="sr-only">Question {i + 1}</label>
//               <input
//                 value={q}
//                 onChange={(e) => updateAt(i, e.target.value)}
//                 placeholder={`Question ${i + 1}`}
//                 className="w-full rounded-md border border-gray-200 p-2 focus:ring-2 focus:ring-indigo-300"
//               />
//             </div>

//             <div className="flex flex-col gap-1">
//               <button
//                 type="button"
//                 title="Insert after"
//                 onClick={() => insertAt(i)}
//                 className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
//               >
//                 <PlusIcon className="h-4 w-4 text-gray-600" />
//               </button>

//               <button
//                 type="button"
//                 title="Remove"
//                 onClick={() => removeAt(i)}
//                 className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
//                 disabled={questions.length <= 1}
//               >
//                 <MinusIcon className="h-4 w-4 text-gray-600" />
//               </button>
//             </div>
//           </div>
//         ))}
//       </div>

//       <div className="mt-4">
//         <button
//           onClick={append}
//           className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
//         >
//           <PlusIcon className="h-4 w-4" />
//           Add question
//         </button>
//       </div>
//     </div>
//   );
// }
