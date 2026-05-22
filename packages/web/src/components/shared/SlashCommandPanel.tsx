export interface SlashCommandItem {
  title: string;
  description: string;
  icon?: string;
  command: (props: { editor: any; range: any }) => void;
}

interface SlashCommandPanelOptions {
  items: SlashCommandItem[];
  onClick: (item: SlashCommandItem) => void;
}

export class SlashCommandPanel {
  element: HTMLElement;
  items: SlashCommandItem[];
  selectedIndex: number;
  onClick: (item: SlashCommandItem) => void;

  constructor(options: SlashCommandPanelOptions) {
    this.items = options.items;
    this.selectedIndex = 0;
    this.onClick = options.onClick;
    this.element = document.createElement("div");
    this.element.classList.add("slash-command-panel");
    this.render();
  }

  updateProps(props: { items: SlashCommandItem[] }) {
    this.items = props.items;
    this.selectedIndex = 0;
    this.render();
  }

  onKeyDown(props: { event: KeyboardEvent }): boolean {
    if (props.event.key === "ArrowUp") {
      this.selectedIndex = (this.selectedIndex + this.items.length - 1) % this.items.length;
      this.render();
      return true;
    }

    if (props.event.key === "ArrowDown") {
      this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
      this.render();
      return true;
    }

    if (props.event.key === "Enter") {
      if (this.items[this.selectedIndex]) {
        this.onClick(this.items[this.selectedIndex]);
      }
      return true;
    }

    return false;
  }

  render() {
    this.element.innerHTML = "";
    this.items.forEach((item, index) => {
      const div = document.createElement("div");
      div.classList.add("slash-command-item");
      if (index === this.selectedIndex) {
        div.classList.add("is-selected");
      }

      const title = document.createElement("span");
      title.classList.add("slash-command-item-title");
      title.textContent = item.title;

      const description = document.createElement("span");
      description.classList.add("slash-command-item-description");
      description.textContent = item.description;

      div.appendChild(title);
      div.appendChild(description);

      div.addEventListener("click", () => {
        this.onClick(item);
      });

      this.element.appendChild(div);
    });
  }

  destroy() {
    this.element.innerHTML = "";
  }
}
