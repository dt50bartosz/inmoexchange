"use client";

import { useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { FILE_INPUT_ACCEPT } from "@/lib/images/config";
import { uploadBlogImage } from "./upload-blog-image";

type Props = {
  id: string;
  /** HTML. "" when empty. */
  value: string;
  onChange: (html: string) => void;
  invalid?: boolean;
  describedBy?: string;
};

/** Word-style editor for blog posts. Only makes what the server keeps (see cleanHtml in lib/server/blog.ts). */
export default function RichTextEditor({ id, value, onChange, invalid, describedBy }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      Image,
    ],
    content: value,
    immediatelyRender: false, // rendered on the server first; avoids a hydration mismatch
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-invalid": String(!!invalid),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        class: "blog-content min-h-80 px-4 py-3 outline-none",
      },
    },
  });

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-background focus-within:ring-2 focus-within:ring-ring ${
        invalid ? "border-destructive" : "border-input"
      }`}
    >
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link address (leave empty to remove the link)", previous ?? "https://");
    if (url === null) return;
    if (url.trim() === "" || url.trim() === "https://") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const addImage = async (file: File) => {
    setUploading(true);
    try {
      const src = await uploadBlogImage(file);
      const alt = window.prompt("Describe the image for people who can't see it (alt text)", "") ?? "";
      editor.chain().focus().setImage({ src, alt }).run();
    } catch {
      toast.error("Couldn't upload the image. Use a JPG, PNG, WebP or HEIC photo up to 20 MB.");
    } finally {
      setUploading(false);
    }
  };

  const c = () => editor.chain().focus();
  const buttons = [
    { label: "Bold", icon: Bold, active: s.bold, run: () => c().toggleBold().run() },
    { label: "Italic", icon: Italic, active: s.italic, run: () => c().toggleItalic().run() },
    { label: "Underline", icon: Underline, active: s.underline, run: () => c().toggleUnderline().run() },
    { label: "Strikethrough", icon: Strikethrough, active: s.strike, run: () => c().toggleStrike().run() },
    null,
    { label: "Heading", icon: Heading2, active: s.h2, run: () => c().toggleHeading({ level: 2 }).run() },
    { label: "Subheading", icon: Heading3, active: s.h3, run: () => c().toggleHeading({ level: 3 }).run() },
    { label: "Bulleted list", icon: List, active: s.bullet, run: () => c().toggleBulletList().run() },
    { label: "Numbered list", icon: ListOrdered, active: s.ordered, run: () => c().toggleOrderedList().run() },
    { label: "Quote", icon: Quote, active: s.quote, run: () => c().toggleBlockquote().run() },
    { label: "Divider", icon: Minus, active: false, run: () => c().setHorizontalRule().run() },
    null,
    { label: "Link", icon: Link2, active: s.link, run: setLink },
    { label: uploading ? "Uploading image…" : "Image", icon: uploading ? Loader2 : ImagePlus, active: false, run: () => fileRef.current?.click(), disabled: uploading },
    null,
    { label: "Undo", icon: Undo2, active: false, run: () => c().undo().run(), disabled: !s.canUndo },
    { label: "Redo", icon: Redo2, active: false, run: () => c().redo().run(), disabled: !s.canRedo },
  ];

  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 p-1.5">
      {buttons.map((b, i) =>
        b === null ? (
          <span key={i} aria-hidden className="mx-1 h-5 w-px bg-border" />
        ) : (
          <button
            key={b.label}
            type="button"
            title={b.label}
            aria-label={b.label}
            aria-pressed={b.active}
            disabled={b.disabled}
            onMouseDown={(e) => e.preventDefault()} // keep the text selection
            onClick={b.run}
            className={`inline-flex size-8 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 ${
              b.active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <b.icon aria-hidden className={`size-4 ${b.icon === Loader2 ? "animate-spin" : ""}`} />
          </button>
        )
      )}
      <input
        ref={fileRef}
        type="file"
        accept={FILE_INPUT_ACCEPT}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void addImage(file);
        }}
      />
    </div>
  );
}
