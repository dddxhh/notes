import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tiptap/react", () => ({
  ReactNodeViewRenderer: vi.fn((component) => component),
}));

vi.mock("../../src/components/shared/VideoRenderer", () => ({
  default: vi.fn(() => null),
  __esModule: true,
}));

import { CustomVideo } from "../../src/lib/CustomVideo";

describe("CustomVideo TipTap Node", () => {
  let node: typeof CustomVideo;

  beforeEach(() => {
    node = CustomVideo;
  });

  describe("node definition", () => {
    it("should have name 'customVideo'", () => {
      expect(node.name).toBe("customVideo");
    });

    it("should be a block node", () => {
      expect(node.config.group).toBe("block");
    });

    it("should not be inline", () => {
      expect(node.config.inline).toBe(false);
    });

    it("should be draggable", () => {
      expect(node.config.draggable).toBe(true);
    });
  });

  describe("attributes", () => {
    it("should have src attribute with default null", () => {
      const attrs = node.config.addAttributes();
      expect(attrs.src).toBeDefined();
      expect(attrs.src.default).toBeNull();
    });

    it("should have title attribute with default null", () => {
      const attrs = node.config.addAttributes();
      expect(attrs.title).toBeDefined();
      expect(attrs.title.default).toBeNull();
    });

    it("should have width attribute with default null", () => {
      const attrs = node.config.addAttributes();
      expect(attrs.width).toBeDefined();
      expect(attrs.width.default).toBeNull();
    });

    it("should have height attribute with default null", () => {
      const attrs = node.config.addAttributes();
      expect(attrs.height).toBeDefined();
      expect(attrs.height.default).toBeNull();
    });
  });

  describe("parseHTML", () => {
    it("should match video[src] tag", () => {
      const rules = node.config.parseHTML();
      expect(rules).toHaveLength(1);
      expect(rules[0].tag).toBe("video[src]");
    });
  });

  describe("renderHTML", () => {
    it("should render video element with controls", () => {
      const mockThis = { options: { HTMLAttributes: {} } };
      const result = node.config.renderHTML.call(mockThis, { HTMLAttributes: { src: "attachment://abc123" } });
      expect(result[0]).toBe("video");
      expect(result[1].controls).toBe("true");
      expect(result[1].src).toBe("attachment://abc123");
    });
  });

  describe("addNodeView", () => {
    it("should provide a node view renderer", () => {
      const nodeView = node.config.addNodeView();
      expect(nodeView).toBeDefined();
    });
  });

  describe("addCommands", () => {
    it("should define setCustomVideo command", () => {
      const commands = node.config.addCommands();
      expect(commands.setCustomVideo).toBeDefined();
    });

    it("setCustomVideo should insert content with correct type and attrs", () => {
      const commands = node.config.addCommands();
      const mockCommands = {
        insertContent: vi.fn(),
      };
      const setCustomVideo = commands.setCustomVideo({ src: "attachment://vid1", title: "My Video" });
      setCustomVideo(mockCommands);
      expect(mockCommands.insertContent).toHaveBeenCalledWith({
        type: "customVideo",
        attrs: { src: "attachment://vid1", title: "My Video" },
      });
    });

    it("setCustomVideo should work with only src", () => {
      const commands = node.config.addCommands();
      const mockCommands = {
        insertContent: vi.fn(),
      };
      const setCustomVideo = commands.setCustomVideo({ src: "attachment://vid2" });
      setCustomVideo(mockCommands);
      expect(mockCommands.insertContent).toHaveBeenCalledWith({
        type: "customVideo",
        attrs: { src: "attachment://vid2" },
      });
    });
  });

  describe("options", () => {
    it("should have default HTMLAttributes as empty object", () => {
      const options = node.config.addOptions();
      expect(options.HTMLAttributes).toEqual({});
    });
  });
});