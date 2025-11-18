"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StaterKit from "@tiptap/starter-kit";
import { MenuBar } from "./MenuBar";
import TextAlign from "@tiptap/extension-text-align";

function toHtmlContent(value?: string) {
  if (!value) {
    return "<p></p>";
  }

  const sanitized = value
    .split("\n")
    .map((line) => line || "&nbsp;")
    .map((line) => `<p>${line}</p>`)
    .join("");

  return sanitized || "<p></p>";
}

export function RichTextEditor({
  field,
}: {
  field: { value?: string; onChange: (value: string) => void };
}) {
  const editor = useEditor({
    extensions: [
      StaterKit,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],

    editorProps: {
      attributes: {
        class:
          "h-[300px] p-4 focus:outline-none prose prose-sm sm:prose lg:prose-lg dark:prose-invert !w-full !max-w-none overflow-y-auto",
      },
    },

    onUpdate: ({ editor }) => {
      const plainText = editor.getText();
      field.onChange(plainText);
    },

    content: toHtmlContent(field.value),
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;

    const incoming = field.value ?? "";
    const current = editor.getText();

    if (incoming === current) {
      return;
    }

    editor.commands.setContent(toHtmlContent(incoming));

  }, [editor, field.value]);

  return (
    <div className="w-full border border-input rounded-lg overflow-hidden dark:bg-input/30">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
