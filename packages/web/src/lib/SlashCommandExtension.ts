import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionProps } from "@tiptap/suggestion";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { SlashCommandPanel } from "../components/shared/SlashCommandPanel";
import { SlashCommandItems, filterItems } from "../lib/SlashCommand";

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
          props.command({ editor, range });
        },
        items: filterItems,
        render: () => {
          let component: SlashCommandPanel | null = null;
          let popup: TippyInstance | null = null;

          return {
            onStart: (props: SuggestionProps<any>) => {
              component = new SlashCommandPanel({
                items: props.items,
                onClick: (item) => {
                  props.command(item);
                  if (popup) popup.hide();
                },
              });

              if (!props.editor.view.dom.parentElement) return;

              popup = tippy(props.editor.view.dom.parentElement, {
                getReferenceClientRect: props.clientRect as any,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },

            onUpdate(props: SuggestionProps<any>) {
              if (!component) return;
              component.updateProps({ items: props.items });

              if (popup) {
                popup.setProps({
                  getReferenceClientRect: props.clientRect as any,
                });
              }
            },

            onKeyDown(props: { event: KeyboardEvent }) {
              if (props.event.key === "Escape") {
                if (popup) popup.hide();
                return true;
              }

              if (!component) return false;
              return component.onKeyDown(props);
            },

            onExit() {
              if (popup) popup.destroy();
              if (component) component.destroy();
              popup = null;
              component = null;
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
