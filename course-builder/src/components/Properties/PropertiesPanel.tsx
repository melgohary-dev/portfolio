import { useSelectedBlock } from "../../hooks/useAutoSave";
import { useCourseStore } from "../../store/course";
import { BLOCK_LABELS } from "../../lib/constants";
import { getLocalized, setLocalized } from "../../lib/localization";
import { createId } from "../../lib/defaults";
import { X } from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import type { QuizQuestion } from "../../types";

export default function PropertiesPanel() {
  const selection = useSelectedBlock();
  const updateBlock = useCourseStore((s) => s.updateBlock);
  const deselectBlock = useCourseStore((s) => s.deselectBlock);
  const currentLanguage = useCourseStore((s) => s.currentLanguage);

  if (!selection) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-[var(--color-muted)]">
          Select a block on the canvas to edit its properties
        </p>
      </div>
    );
  }

  const { block, module: mod, lesson } = selection;

  const handleUpdate = (updates: Record<string, unknown>) => {
    updateBlock(mod.id, lesson.id, block.id, updates);
  };

  const handleMetadataUpdate = (key: string, value: unknown) => {
    updateBlock(mod.id, lesson.id, block.id, {
      metadata: { ...block.metadata, [key]: value },
    });
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">
            {BLOCK_LABELS[block.type]} Properties
          </h2>
        </div>
        <button
          onClick={deselectBlock}
          aria-label="Close properties panel"
          className="focus-ring rounded p-1.5 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          <X size={16} />
        </button>
      </div>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
          Title
        </span>
        <input
          type="text"
          value={getLocalized(block.title, currentLanguage)}
          onChange={(e) =>
            handleUpdate({
              title: setLocalized(block.title, currentLanguage, e.target.value),
            })
          }
          className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
        />
      </label>

      {block.type !== "divider" && (
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
            Duration (minutes)
          </span>
          <input
            type="number"
            min={0}
            value={block.duration ?? ""}
            onChange={(e) =>
              handleUpdate({
                duration: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
          />
        </label>
      )}

      {block.type === "text" && (
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
            Content
          </span>
          <RichTextEditor
            content={getLocalized(block.content, currentLanguage)}
            onChange={(html) =>
              handleUpdate({
                content: setLocalized(block.content, currentLanguage, html),
              })
            }
            placeholder="Write your content here..."
          />
        </label>
      )}

      {block.type === "video" && (
        <>
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
              Video URL
            </span>
            <input
              type="url"
              value={(block.metadata.url as string) ?? ""}
              onChange={(e) => handleMetadataUpdate("url", e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
            />
          </label>
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
              Description
            </span>
            <textarea
              value={getLocalized(block.content, currentLanguage)}
              onChange={(e) =>
                handleUpdate({
                  content: setLocalized(block.content, currentLanguage, e.target.value),
                })
              }
              rows={3}
              className="w-full resize-y rounded-lg border border-[var(--color-line)] bg-[var(--color-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
            />
          </label>
        </>
      )}

      {block.type === "quiz" && (
        <QuizEditor
          questions={(block.metadata.questions as unknown[]) ?? []}
          onChange={(questions) => handleMetadataUpdate("questions", questions)}
        />
      )}

      {block.type === "image" && (
        <>
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
              Image URL
            </span>
            <input
              type="url"
              value={(block.metadata.src as string) ?? ""}
              onChange={(e) => handleMetadataUpdate("src", e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
            />
          </label>
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
              Caption
            </span>
            <input
              type="text"
              value={(block.metadata.caption as string) ?? ""}
              onChange={(e) => handleMetadataUpdate("caption", e.target.value)}
              className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
            />
          </label>
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
              Alt text (accessibility)
            </span>
            <input
              type="text"
              value={(block.metadata.alt as string) ?? ""}
              onChange={(e) => handleMetadataUpdate("alt", e.target.value)}
              className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
            />
          </label>
        </>
      )}

      {block.type === "assignment" && (
        <>
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
              Instructions
            </span>
            <textarea
              value={getLocalized(block.content, currentLanguage)}
              onChange={(e) =>
                handleUpdate({
                  content: setLocalized(block.content, currentLanguage, e.target.value),
                })
              }
              rows={5}
              className="w-full resize-y rounded-lg border border-[var(--color-line)] bg-[var(--color-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
            />
          </label>
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
              Max Score
            </span>
            <input
              type="number"
              min={0}
              value={(block.metadata.maxScore as number) ?? 100}
              onChange={(e) =>
                handleMetadataUpdate("maxScore", Number(e.target.value))
              }
              className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
            />
          </label>
        </>
      )}

      {block.type === "divider" && (
        <p className="text-xs text-[var(--color-muted)]">
          Divider blocks are visual separators with no editable content.
        </p>
      )}
    </div>
  );
}

function QuizEditor({
  questions,
  onChange,
}: {
  questions: unknown[];
  onChange: (q: unknown[]) => void;
}) {
  const typed = questions as QuizQuestion[];

  const addQuestion = () => {
    onChange([
      ...typed,
      {
        id: createId(),
        text: "New question",
        options: ["Option 1", "Option 2", "Option 3", "Option 4"] as [string, string, string, string],
        correctIndex: 0,
      },
    ]);
  };

  const updateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
    const next = typed.map((q, i) => (i === index ? { ...q, ...updates } : q));
    onChange(next);
  };

  const removeQuestion = (index: number) => {
    onChange(typed.filter((_, i) => i !== index));
  };

  return (
    <div className="mb-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-muted)]">
          Questions ({typed.length})
        </span>
        <button
          onClick={addQuestion}
          aria-label="Add question"
          className="focus-ring rounded bg-[var(--color-brand)] px-2 py-1 text-[10px] font-medium text-white hover:bg-[var(--color-brand-hover)]"
        >
          + Add
        </button>
      </div>
      {typed.map((q, qi) => (
        <div
          key={q.id}
          className="mb-2 rounded-lg border border-[var(--color-line)] p-2"
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[var(--color-muted)]">
              Q{qi + 1}
            </span>
            <button
              onClick={() => removeQuestion(qi)}
              aria-label={`Remove question ${qi + 1}`}
              className="text-[10px] text-[var(--color-danger)] hover:underline p-1"
            >
              Remove
            </button>
          </div>
          <input
            type="text"
            value={q.text}
            onChange={(e) => updateQuestion(qi, { text: e.target.value })}
            className="mb-1 w-full rounded border border-[var(--color-line)] bg-[var(--color-elevated)] px-2 py-1 text-xs outline-none focus:border-[var(--color-brand)]"
          />
          {q.options.map((opt, oi) => (
            <label key={oi} className="flex items-center gap-1.5 text-[10px]">
              <input
                type="radio"
                name={`correct-${qi}`}
                checked={q.correctIndex === oi}
                onChange={() => updateQuestion(qi, { correctIndex: oi })}
                className="accent-[var(--color-brand)]"
              />
              <input
                type="text"
                value={opt}
                onChange={(e) => {
                  const newOpts = [...q.options] as [string, string, string, string];
                  newOpts[oi] = e.target.value;
                  updateQuestion(qi, { options: newOpts });
                }}
                className="flex-1 border-none bg-transparent text-[10px] outline-none"
              />
            </label>
          ))}
        </div>
      ))}
      {typed.length === 0 && (
        <p className="py-2 text-center text-[10px] text-[var(--color-muted)]">
          No questions yet. Click + Add to create one.
        </p>
      )}
    </div>
  );
}
