type MetaArgs = Record<string, unknown>;

export function meta({}: MetaArgs) {
  return [
    { title: "Settings | FlowBoard" },
    { name: "description", content: "Settings" },
  ];
}

export default function SettingsPage() {
  return (
    <div className="min-h-full">
      <header className="flex h-16 items-center border-b border-[var(--border-muted)] px-6">
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-[var(--text)]">
          Settings
        </h1>
      </header>
      <div className="p-8">
        <p className="text-[13px] text-[var(--text-muted)]">Account and app settings — coming soon.</p>
      </div>
    </div>
  );
}
