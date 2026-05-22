import { describe, it, expect } from "vitest";
import type { Tag } from "@notes/core";
import { useTagsStore } from "../../src/stores/tagsStore";

const mockTag1: Tag = { id: "id1", name: "work" };
const mockTag2: Tag = { id: "id2", name: "personal" };
const mockTag3: Tag = { id: "id3", name: "important" };

describe("useTagsStore", () => {
  it("has correct initial state", () => {
    const state = useTagsStore.getState();
    expect(state.tags).toEqual([]);
    expect(state.loading).toBe(false);
  });

  it("setTags replaces the tags list", () => {
    useTagsStore.getState().setTags([mockTag1, mockTag2]);
    const state = useTagsStore.getState();
    expect(state.tags).toEqual([mockTag1, mockTag2]);

    useTagsStore.setState({ tags: [], loading: false });
  });

  it("addTag appends to existing list", () => {
    useTagsStore.getState().setTags([mockTag1, mockTag2]);
    useTagsStore.getState().addTag(mockTag3);
    const state = useTagsStore.getState();
    expect(state.tags).toEqual([mockTag1, mockTag2, mockTag3]);

    useTagsStore.setState({ tags: [], loading: false });
  });

  it("removeTag filters out the tag with matching id", () => {
    useTagsStore.getState().setTags([mockTag1, mockTag2, mockTag3]);
    useTagsStore.getState().removeTag("id1");
    const state = useTagsStore.getState();
    expect(state.tags).toEqual([mockTag2, mockTag3]);

    useTagsStore.setState({ tags: [], loading: false });
  });

  it("setLoading sets loading to true", () => {
    useTagsStore.getState().setLoading(true);
    const state = useTagsStore.getState();
    expect(state.loading).toBe(true);

    useTagsStore.setState({ tags: [], loading: false });
  });

  it("setLoading sets loading to false", () => {
    useTagsStore.setState({ loading: true });
    useTagsStore.getState().setLoading(false);
    const state = useTagsStore.getState();
    expect(state.loading).toBe(false);

    useTagsStore.setState({ tags: [], loading: false });
  });
});
