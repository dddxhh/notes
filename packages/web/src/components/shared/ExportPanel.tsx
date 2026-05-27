import { useState } from "react";
import { useStorage } from "../../hooks";
import { exportAsJSON, exportAsMarkdownZip } from "../../lib/export";

export default function ExportPanel() {
  const { dumpAll } = useStorage();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExportJSON = async () => {
    setExporting(true);
    setError(null);
    try {
      const dump = await dumpAll();
      exportAsJSON(dump);
    } catch (e) {
      setError(e instanceof Error ? e.message : "导出失败");
    } finally {
      setExporting(false);
    }
  };

  const handleExportMarkdown = async () => {
    setExporting(true);
    setError(null);
    try {
      const dump = await dumpAll();
      exportAsMarkdownZip(dump);
    } catch (e) {
      setError(e instanceof Error ? e.message : "导出失败");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">数据导出</h3>
      {exporting && (
        <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
          正在导出...
        </div>
      )}
      {error && (
        <div className="text-sm p-2 rounded" style={{ color: "var(--danger)" }}>
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleExportJSON}
          disabled={exporting}
          className="text-sm px-3 py-1.5 rounded-md hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)", color: "white" }}
        >
          JSON 备份
        </button>
        <button
          onClick={handleExportMarkdown}
          disabled={exporting}
          className="text-sm px-3 py-1.5 rounded-md hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)", color: "white" }}
        >
          Markdown 包
        </button>
      </div>
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        JSON 备份包含完整数据（可恢复）。Markdown 包兼容 Obsidian 格式。
      </p>
    </div>
  );
}
