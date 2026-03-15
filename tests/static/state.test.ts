import { describe, it, expect } from "vitest";
import { state } from "@/state";

describe("state", () => {
    it("has initial values", () => {
        expect(state.allProjects).toEqual([]);
        expect(state.logsCurrentPage).toBe(0);
        expect(state.logsTotalCount).toBe(0);
        expect(state.logsFilterStatus).toBeNull();
        expect(state.logsFilterProject).toBe("");
        expect(state.autoRefreshInterval).toBeNull();
        expect(state.pmsgProjectId).toBeNull();
    });

    it("is mutable", () => {
        state.logsCurrentPage = 5;
        expect(state.logsCurrentPage).toBe(5);
        state.logsCurrentPage = 0;
    });
});
