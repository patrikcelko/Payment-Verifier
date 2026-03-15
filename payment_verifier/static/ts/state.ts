import type { Project } from "./types";

export const state = {
    allProjects: [] as Project[],
    logsCurrentPage: 0,
    logsTotalCount: 0,
    logsFilterStatus: null as number | null,
    logsFilterProject: "",
    autoRefreshInterval: null as ReturnType<typeof setInterval> | null,
    pmsgProjectId: null as number | null,
};
