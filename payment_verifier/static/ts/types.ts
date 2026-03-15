export interface Project {
    id: number;
    name: string;
    status: string;
    api_token: string;
    customer_name: string | null;
    customer_address: string | null;
    project_url: string | null;
    contact_person: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    created_at: string;
    updated_at: string;
    last_queried_at: string | null;
}

export interface LogStats {
    total: number;
    "200": number;
    "402": number;
    "404": number;
}

export type Status = "OK" | "UNPAID" | "PENDING" | "OVERDUE" | "PARTIAL" | "SUSPENDED";

export const STATUSES: Status[] = ["OK", "UNPAID", "PENDING", "OVERDUE", "PARTIAL", "SUSPENDED"];
