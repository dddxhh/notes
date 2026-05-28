import ThemeToggle from "../shared/ThemeToggle";
import ModeToggle from "../shared/ModeToggle";
import ExportPanel from "../shared/ExportPanel";
import ImportPanel from "../shared/ImportPanel";
import SyncSettingsPanel from "../shared/SyncSettingsPanel";

export default function MobileSettings() {
  return (
    <div
      className="flex flex-col h-screen p-4 space-y-6"
      style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <h2 className="text-lg font-bold">设置</h2>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">主题</h3>
        <ThemeToggle />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">编辑模式</h3>
        <ModeToggle />
      </div>
      <div
        className="space-y-3 p-3 rounded-md"
        style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-color)" }}
      >
        <SyncSettingsPanel />
      </div>
      <div
        className="space-y-3 p-3 rounded-md"
        style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-color)" }}
      >
        <ExportPanel />
        <div className="border-t" style={{ borderColor: "var(--border-color)" }} />
        <ImportPanel />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">关于</h3>
        <div className="p-3 rounded-md" style={{ backgroundColor: "var(--bg-secondary)" }}>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Notes App v0.0.1
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            本地优先 · 私密安全
          </p>
        </div>
      </div>
    </div>
  );
}
