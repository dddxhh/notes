import { useState, useEffect } from "react";
import MarkdownIt from "markdown-it";

interface PublicShareViewProps {
  token: string;
}

const md = new MarkdownIt({ html: false, linkify: true, breaks: true });

export default function PublicShareView({ token }: PublicShareViewProps) {
  const [title, setTitle] = useState("");
  const [html, setHtml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [submittedPassword, setSubmittedPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNote = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL(`/api/v1/shares/public/${token}`, window.location.origin);
        if (submittedPassword) url.searchParams.set("password", submittedPassword);

        const res = await fetch(url.toString());

        if (res.status === 401) {
          const body = await res.json();
          if (body.needsPassword) {
            setNeedsPassword(true);
            setLoading(false);
            return;
          }
          throw new Error(body.error || "认证失败");
        }

        if (res.status === 410) {
          throw new Error("分享已过期");
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "加载失败");
        }

        const data = await res.json();
        setTitle(data.title || "未命名笔记");
        setHtml(md.render(data.mdText || ""));
        setNeedsPassword(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    };

    fetchNote();
  }, [token, submittedPassword]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ color: "var(--text-secondary)" }}
      >
        加载中...
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div
          className="w-80 p-6 rounded-lg shadow-lg"
          style={{ backgroundColor: "var(--bg-secondary)" }}
        >
          <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            需要密码
          </h2>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="输入密码"
            className="w-full px-3 py-2 rounded border mb-3"
            style={{
              borderColor: "var(--border-color)",
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-primary)",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSubmittedPassword(passwordInput);
            }}
          />
          {error && (
            <p className="text-sm mb-2" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ color: "var(--danger)" }}>
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        {title}
      </h1>
      <div
        className="prose prose-lg max-w-none"
        style={{ color: "var(--text-primary)" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <p className="mt-8 text-xs" style={{ color: "var(--text-tertiary)" }}>
        此笔记通过公开链接分享
      </p>
    </div>
  );
}
