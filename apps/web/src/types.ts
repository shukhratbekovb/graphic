export type User = { id: number; name: string; username: string; role: string };
export type Link = { from: string; type: "FS" | "SS" | "FF"; lag: number };
export type Task = {
  id: string;
  title: string;
  specialty: string;
  department: string;
  author: string;
  start: string;
  end: string;
  cost: string | null;
  dependencies: Link[];
  milestone?: boolean;
  position?: string;
  recipient?: string;
};
export type CalendarData = {
  id: number;
  title: string;
  start: string;
  end: string;
  holidays: string[];
  working_days: string[];
  is_demo: boolean;
  source?: string;
};
export type Payload = {
  start: string;
  end: string;
  budget: string;
  calendar: CalendarData;
  model_code: string;
  tasks: Task[];
};
export type Fact = {
  progress: number;
  actual_start: string | null;
  actual_end: string | null;
  reason: string;
  effective_date: string;
  recorded_at: string;
};
export type Schedule = {
  id: string;
  number: string;
  title: string;
  project: { id: string; code: string; title: string };
  stage: string;
  phase: string;
  gip: string;
  gip_id: number;
  revision: {
    id: number;
    number: number;
    status: string;
    edit_version: number;
    reason: string;
    author_id: number;
    approver_id: number | null;
  };
  data: Payload;
  facts: Record<string, Fact>;
  calculation: {
    nodes: Record<
      string,
      {
        duration: number;
        float: number;
        critical: boolean;
        deadline_float: number;
      }
    >;
    edges: { from: string; to: string; type: string; critical: boolean }[];
    length: number;
    duration: number;
    valid: boolean;
    errors: string[];
  };
  progress: number;
  state: string;
  overdue_count: number;
  incomplete_facts: number;
  as_of: string;
  versions: {
    id: number;
    number: number;
    status: string;
    approved_at: string | null;
    reason: string;
  }[];
  baseline: Payload | null;
};
export type Boot = {
  user: User;
  today: string;
  users: User[];
  projects: { id: string; code: string; title: string; gip_id: number }[];
  templates: {
    id: number;
    code: string;
    title: string;
    is_demo: boolean;
    tasks: Task[];
  }[];
  calendars: {
    id: number;
    title: string;
    is_demo: boolean;
    data: CalendarData;
  }[];
};
