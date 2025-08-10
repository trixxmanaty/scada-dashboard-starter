"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Card from "@/components/Card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type Telemetry = {
  ts: number;
  rpm: number;
  t_exhaust_c: number;
  combustor_p_r: number;
  load_mw: number;
  vib_mm_s: number;
  alarm?: string;
};

type Status = "connecting" | "connected" | "disconnected" | "demo";

function makeSample(ts = Date.now()): Telemetry {
  const base = Math.sin(ts / 5000);
  return {
    ts,
    rpm: 3600 + Math.round(base * 50 + Math.random() * 5),
    t_exhaust_c: 480 + Math.round(base * 10 + Math.random() * 2),
    combustor_p_r: 12 + Math.random() * 0.3,
    load_mw: 45 + Math.round(base * 5 + Math.random() * 1),
    vib_mm_s: 2 + Math.random() * 0.5,
    alarm: Math.random() < 0.002 ? "HIGH_VIBRATION" : undefined,
  };
}

export default function Page() {
  const wsRef = useRef<WebSocket | null>(null);
  const demoTimer = useRef<NodeJS.Timer | null>(null);

  // URL priority: ?ws=... > localStorage > env > empty
  const initialWs = (() => {
    if (typeof window !== "undefined") {
      const qp = new URLSearchParams(window.location.search).get("ws");
      if (qp) return qp;
      const stored = localStorage.getItem("wsUrl");
      if (stored) return stored;
    }
    return process.env.NEXT_PUBLIC_WS_URL || "";
  })();

  const [wsUrl, setWsUrl] = useState<string>(initialWs);
  const [status, setStatus] = useState<Status>(initialWs ? "connecting" : "demo");
  const [data, setData] = useState<Telemetry[]>([]);
  const latest = data[data.length - 1];

  // --- DEMO MODE ---
  const startDemo = () => {
    stopAll();
    setStatus("demo");
    // seed with 30 samples so chart isn't empty
    const now = Date.now();
    const seed: Telemetry[] = Array.from({ length: 30 }, (_, i) =>
      makeSample(now - (30 - i) * 1000)
    );
    setData(seed);
    demoTimer.current = setInterval(() => {
      setData((p) => [...p.slice(-120), makeSample()]);
    }, 1000);
  };

  // --- WS MODE ---
  const connect = (url: string) => {
    stopAll();
    if (!url) {
      startDemo();
      return;
    }
    try {
      setStatus("connecting");
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setStatus("connected");
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.ts) setData((p) => [...p.slice(-120), msg as Telemetry]);
        } catch {}
      };
      ws.onerror = () => {
        setStatus("disconnected");
        // graceful fallback after a moment
        setTimeout(startDemo, 800);
      };
      ws.onclose = () => {
        setStatus("disconnected");
        setTimeout(startDemo, 800);
      };
    } catch {
      setStatus("disconnected");
      startDemo();
    }
  };

  const stopAll = () => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    if (demoTimer.current) {
      clearInterval(demoTimer.current);
      demoTimer.current = null;
    }
  };

  // Connect on first render
  useEffect(() => {
    if (wsUrl) connect(wsUrl);
    else startDemo();
    return stopAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chart data
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        name: new Date(d.ts).toLocaleTimeString(),
        RPM: d.rpm,
        "T_exhaust(°C)": d.t_exhaust_c,
        "Load(MW)": d.load_mw,
      })),
    [data]
  );

  // Save URL
  const handleConnect = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("wsUrl", wsUrl);
    }
    connect(wsUrl);
  };

  const pill =
    status === "connected"
      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
      : status === "connecting"
      ? "bg-amber-100 text-amber-800 border-amber-300"
      : status === "demo"
      ? "bg-indigo-100 text-indigo-800 border-indigo-300"
      : "bg-rose-100 text-rose-800 border-rose-300";

  return (
    <main className="min-h-screen p-6 bg-gradient-to-b from-primary/10 to-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <h1 className="text-3xl font-bold">Turbine Dashboard</h1>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${pill}`}>
            <span
              className={`h-2 w-2 rounded-full ${
                status === "connected"
                  ? "bg-emerald-500"
                  : status === "connecting"
                  ? "bg-amber-500"
                  : status === "demo"
                  ? "bg-indigo-500"
                  : "bg-rose-500"
              }`}
            />
            {status === "connected"
              ? "Connected"
              : status === "connecting"
              ? "Connecting…"
              : status === "demo"
              ? "Demo Mode (synthetic data)"
              : "Disconnected"}
          </span>
        </div>

        {/* Connection Controls */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              type="text"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              placeholder="ws://localhost:8080"
              className="w-full rounded border px-3 py-2"
            />
            <button
              onClick={handleConnect}
              className="rounded bg-primary text-white px-4 py-2"
            >
              Connect
            </button>
            <button
              onClick={startDemo}
              className="rounded border px-4 py-2"
              title="Force demo data"
            >
              Use Demo Data
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Tip: you can also pass <code>?ws=ws://your-host:8080</code> in the URL. The last value is saved to{" "}
            <code>localStorage</code>.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card title="RPM" value={latest?.rpm ?? "--"} />
          <Card title="Exhaust Temp" value={latest?.t_exhaust_c ?? "--"} unit="°C" />
          <Card title="Load" value={latest?.load_mw ?? "--"} unit="MW" />
          <Card title="Vibration" value={latest?.vib_mm_s?.toFixed?.(2) ?? "--"} unit="mm/s" />
        </div>

        {/* Chart */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="RPM" dot={false} />
                <Line type="monotone" dataKey="T_exhaust(°C)" dot={false} />
                <Line type="monotone" dataKey="Load(MW)" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded-2xl border bg-white p-5 text-sm text-gray-700">
          <h2 className="mb-2 text-base font-semibold">How to connect your simulator</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              Start the simulator repo:
              <code className="ml-2 rounded bg-gray-100 px-1.5 py-0.5">npm install && npm run dev</code>
              <span className="ml-1 text-gray-500"> (or <code>pnpm i && pnpm dev</code>)</span>
            </li>
            <li>By default it serves WebSocket telemetry at <code>ws://localhost:8080</code>.</li>
            <li>Enter that URL above and click <strong>Connect</strong> (or use <code>?ws=...</code>).</li>
            <li>On production, host the simulator on a server that supports WebSockets and use a secure URL like <code>wss://your-domain</code>.</li>
          </ol>
          <p className="mt-2 text-xs text-gray-500">
            Note: Frontends typically need an external WS host (Railway, Fly.io, Render, your VM, etc.).
          </p>
        </div>
      </div>
    </main>
  );
}