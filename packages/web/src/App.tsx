import { useEffect, useState } from "react";
import { initStorage } from "./lib";

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initStorage().then(() => setReady(true));
  }, []);

  if (!ready) return <div>正在初始化...</div>;

  return <div>笔记应用 - 数据层就绪</div>;
}