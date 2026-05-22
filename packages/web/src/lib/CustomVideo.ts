import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import VideoRenderer from "../components/shared/VideoRenderer";

export interface CustomVideoOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    customVideo: {
      setCustomVideo: (options: { src: string; title?: string }) => ReturnType;
    };
  }
}

export const CustomVideo = Node.create<CustomVideoOptions>({
  name: "customVideo",
  group: "block",
  inline: false,
  draggable: true,
  addOptions() {
    return { HTMLAttributes: {} };
  },
  addAttributes() {
    return {
      src: { default: null },
      title: { default: null },
      width: { default: null },
      height: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "video[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["video", mergeAttributes(this.options.HTMLAttributes, { controls: "true" }, HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(VideoRenderer);
  },
  addCommands() {
    return {
      setCustomVideo:
        (options: { src: string; title?: string }) =>
        ({ chain }) => {
          return chain().insertContent({
            type: this.name,
            attrs: options,
          }).run();
        },
    };
  },
});