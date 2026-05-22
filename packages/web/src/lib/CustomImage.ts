import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import AttachmentRenderer from "../components/shared/AttachmentRenderer";

export interface CustomImageOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    customImage: {
      setCustomImage: (options: { src: string; alt?: string; title?: string }) => ReturnType;
    };
  }
}

export const CustomImage = Node.create<CustomImageOptions>({
  name: "customImage",
  group: "block",
  inline: false,
  draggable: true,
  addOptions() {
    return { HTMLAttributes: {} };
  },
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: null },
      height: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "img[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(AttachmentRenderer);
  },
  addCommands() {
    return {
      setCustomImage:
        (options: { src: string; alt?: string; title?: string }) =>
        ({ chain }) => {
          return chain().insertContent({
            type: this.name,
            attrs: options,
          }).run();
        },
    };
  },
});