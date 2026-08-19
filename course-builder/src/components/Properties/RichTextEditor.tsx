import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, LinkIcon, Undo2, Redo2 } from "lucide-react";
import { useEffect, useCallback, useRef } from "react";
import { cn } from "../../lib/cn";
import { isSafeUrl } from "../../lib/security";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "focus-ring rounded p-1.5 text-xs transition-colors",
        isActive
          ? "bg-[var(--color-brand)] text-white"
          : "text-[var(--color-muted)] hover:bg-[var(--color-sunken)] hover:text-[var(--color-ink)]",
        disabled && "opacity-30",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL (https://...)", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!isSafeUrl(url)) {
      window.alert("Only https, http, and mailto links are allowed.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="mb-2 flex flex-wrap items-center gap-0.5 rounded-t-lg border border-b-0 border-[var(--color-line)] bg-[var(--color-sunken)] px-2 py-1.5" role="toolbar" aria-label="Formatting toolbar">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        ariaLabel="Toggle bold"
      >
        <Bold size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        ariaLabel="Toggle italic"
      >
        <Italic size={14} />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-[var(--color-line)]" aria-hidden="true" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        ariaLabel="Toggle heading 2"
      >
        <Heading1 size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        ariaLabel="Toggle heading 3"
      >
        <Heading2 size={14} />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-[var(--color-line)]" aria-hidden="true" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        ariaLabel="Toggle bullet list"
      >
        <List size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        ariaLabel="Toggle numbered list"
      >
        <ListOrdered size={14} />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-[var(--color-line)]" aria-hidden="true" />

      <ToolbarButton onClick={setLink} isActive={editor.isActive("link")} ariaLabel="Insert link">
        <LinkIcon size={14} />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-[var(--color-line)]" aria-hidden="true" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        ariaLabel="Undo"
      >
        <Undo2 size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        ariaLabel="Redo"
      >
        <Redo2 size={14} />
      </ToolbarButton>
    </div>
  );
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Start writing...",
}: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-[var(--color-brand)] underline" },
        validate: (url: string) => isSafeUrl(url),
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChangeRef.current(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: "min-h-[120px] rounded-b-lg border border-[var(--color-line)] bg-[var(--color-elevated)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": placeholder,
      },
    },
  });

  // Sync external content changes (e.g. language switch)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  return (
    <div className="rich-text-editor">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
