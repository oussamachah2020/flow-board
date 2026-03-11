/** Priority and type colors for tasks — use in inline style (e.g. backgroundColor, borderColor). CSS vars work there. */
export const PRIORITY_COLORS: Record<string, string> = {
  LOW: "var(--text-subtle)",
  MEDIUM: "var(--blue)",
  HIGH: "var(--amber)",
  URGENT: "var(--red)",
};

export const TYPE_COLORS: Record<string, string> = {
  TASK: "var(--text-subtle)",
  BUG: "var(--red)",
  HOTFIX: "var(--amber)",
  FEATURE: "var(--blue)",
  IMPROVEMENT: "var(--green)",
  TEST: "var(--purple)",
};
