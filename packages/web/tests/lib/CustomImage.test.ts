import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tiptap/react", () => ({
  ReactNodeViewRenderer: vi.fn((component) => component),
}));

vi.mock("../../src/components/shared/AttachmentRenderer", () => ({
  default: vi.fn(() => null),
  __esModule: true,
}));

import { CustomImage } from "../../src/lib/CustomImage";

describe("CustomImage TipTap Node", () => {
  let node: typeof CustomImage;

  beforeEach(() => {
    node = CustomImage;
  });

  describe("node definition", () => {
    it("should have name 'customImage'", () => {
      expect(node.name).toBe("customImage");
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

    it("should have alt attribute with default null", () => {
      const attrs = node.config.addAttributes();
      expect(attrs.alt).toBeDefined();
      expect(attrs.alt.default).toBeNull();
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
    it("should match img[src] tag", () => {
      const rules = node.config.parseHTML();
      expect(rules).toHaveLength(1);
      expect(rules[0].tag).toBe("img[src]");
    });
  });

  describe("renderHTML", () => {
    it("should render img element with attributes", () => {
      const result = node.config.renderHTML.call(node, { HTMLAttributes: { src: "attachment://abc123" } });
      expect(result[0]).toBe("img");
      expect(result[1].src).toBe("attachment://abc123");
    });

    it("should merge HTMLAttributes with options", () => {
      const result = node.config.renderHTML.call(node, {
        HTMLAttributes: { src: "attachment://abc123", alt: "photo" },
      });
      expect(result[0]).toBe("img");
      expect(result[1].src).toBe("attachment://abc123");
      expect(result[1].alt).toBe("photo");
    });
  });

  describe("addNodeView", () => {
    it("should provide a node view renderer", () => {
      const nodeView = node.config.addNodeView();
      expect(nodeView).toBeDefined();
    });
  });

  describe("addCommands", () => {
    it("should define setCustomImage command", () => {
      const commands = node.config.addCommands();
      expect(commands.setCustomImage).toBeDefined();
    });

    it("setCustomImage should insert content with correct type and attrs", () => {
      const commands = node.config.addCommands();
      const mockChain = {
        insertContent: vi.fn().mockReturnThis(),
        run: vi.fn().mockReturnValue(true),
      };
      const setCustomImage = commands.setCustomImage({
        src: "attachment://img1",
        alt: "My Image",
      });
      setCustomImage({ chain: () => mockChain });
      expect(mockChain.insertContent).toHaveBeenCalledWith({
        type: "customImage",
        attrs: { src: "attachment://img1", alt: "My Image" },
      });
    });

    it("setCustomImage should work with only src", () => {
      const commands = node.config.addCommands();
      const mockChain = {
        insertContent: vi.fn().mockReturnThis(),
        run: vi.fn().mockReturnValue(true),
      };
      const setCustomImage = commands.setCustomImage({ src: "attachment://img2" });
      setCustomImage({ chain: () => mockChain });
      expect(mockChain.insertContent).toHaveBeenCalledWith({
        type: "customImage",
        attrs: { src: "attachment://img2" },
      });
    });

    it("setCustomImage should work with src, alt, and title", () => {
      const commands = node.config.addCommands();
      const mockChain = {
        insertContent: vi.fn().mockReturnThis(),
        run: vi.fn().mockReturnValue(true),
      };
      const setCustomImage = commands.setCustomImage({
        src: "attachment://img3",
        alt: "description",
        title: "Image Title",
      });
      setCustomImage({ chain: () => mockChain });
      expect(mockChain.insertContent).toHaveBeenCalledWith({
        type: "customImage",
        attrs: { src: "attachment://img3", alt: "description", title: "Image Title" },
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