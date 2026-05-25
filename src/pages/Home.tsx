import { useState, useEffect, useRef } from "react";
import TypingPractice, { TypingPracticeRef } from "@/components/TypingPractice";
import { createPortal } from "react-dom";

type RecordItem = {
  id: string;
  date: string;
  name: string;
  chars: number;
  seconds: number;
  wpm: number;
};

export default function Home() {
  const [sessionScore, setSessionScore] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [records, setRecords] = useState<RecordItem[]>([]);
  
  const practiceRef = useRef<TypingPracticeRef>(null);

  useEffect(() => {
    const saved = localStorage.getItem("typing_records");
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const saveRecord = (name: string) => {
    const finalName = name.trim() || "访客";
    const wpm = sessionDuration > 0 ? Math.round((sessionScore / sessionDuration) * 60) : 0;
    
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    
    const newRecord: RecordItem = {
      id: Date.now().toString(),
      date: dateStr,
      name: finalName,
      chars: sessionScore,
      seconds: sessionDuration,
      wpm,
    };
    
    const newRecords = [...records, newRecord].sort((a, b) => b.wpm - a.wpm).slice(0, 15);
    setRecords(newRecords);
    localStorage.setItem("typing_records", JSON.stringify(newRecords));
    
    setSessionScore(0);
    setSessionDuration(0);
    setShowSaveDialog(false);
    setPlayerName("");
    
    // 重置练习组件到初始状态
    practiceRef.current?.resetToStart();
  };

  const handleDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveRecord(playerName);
    } else if (e.key === "Escape") {
      saveRecord("访客");
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#070B18] text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(1200px 520px at 20% 0%, rgba(88, 255, 204, 0.25), transparent 60%), radial-gradient(900px 520px at 80% 10%, rgba(168, 120, 255, 0.20), transparent 55%), radial-gradient(900px 600px at 60% 90%, rgba(255, 187, 92, 0.18), transparent 55%)",
        }}
      />

      <div className="relative mx-auto flex min-h-dvh max-w-5xl flex-col px-5 py-10">
        <header className="flex flex-col gap-3">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end sm:gap-6">
            <div className="flex flex-col gap-1">
              <div className="text-xs font-medium tracking-[0.22em] text-zinc-300/80">KIDS TYPING</div>
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">键盘指法练习</h1>
            </div>
            
            {sessionScore > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 shadow-sm backdrop-blur-md">
                <div className="text-sm font-medium text-emerald-400">
                  今天成功练习了 <span className="mx-1 text-lg font-bold text-emerald-300">{sessionScore}</span> 个字符！加油！
                </div>
              </div>
            )}
          </div>
          <p className="max-w-2xl text-sm leading-6 text-zinc-200/85">
            先看上面一行，再按顺序敲下面的格子。对了会变绿，错了会变橙色。点击练习区后直接开始打字。
          </p>
        </header>

        <main className="mt-8 flex flex-1 flex-col">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_25px_90px_-40px_rgba(0,0,0,0.75)] backdrop-blur sm:p-7">
            <TypingPractice 
              ref={practiceRef}
              onScoreUpdate={(score, duration) => {
                setSessionScore(s => s + score);
                setSessionDuration(d => d + duration);
              }}
              onEndSession={() => setShowSaveDialog(true)}
            />
          </div>

          {records.length > 0 && (
            <div className="mt-12 mb-8">
              <h2 className="mb-4 text-xl font-semibold tracking-wide text-zinc-100/90">历史排行</h2>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                <div className="flex flex-col">
                  {records.map((r, i) => (
                    <div 
                      key={r.id} 
                      className="flex flex-col items-start justify-between gap-2 border-b border-white/5 p-4 text-sm last:border-0 sm:flex-row sm:items-center sm:gap-4 sm:p-5"
                    >
                      <div className="flex items-center gap-4">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-zinc-300">
                          {i + 1}
                        </span>
                        <span className="font-medium text-emerald-300">{r.name}</span>
                        <span className="text-zinc-400">{r.date}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-zinc-300">
                        <span>{r.chars}字</span>
                        <span className="text-zinc-500">•</span>
                        <span>{r.seconds}秒</span>
                        <span className="text-zinc-500">•</span>
                        <span className="font-semibold text-purple-300">{r.wpm}字/分钟</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="mt-8 text-xs text-zinc-300/70">
          提示：按 Backspace 可以退格。
        </footer>
      </div>

      {/* 录入名字弹窗 */}
      {showSaveDialog && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#070B18]/80 backdrop-blur-md">
          <div className="w-[90%] max-w-sm rounded-3xl border border-white/10 bg-[#0d1326] p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-bold text-white">保存练习记录</h3>
            <p className="mb-6 text-sm text-zinc-300">
              本次练习：<span className="text-emerald-300">{sessionScore}字</span>，用时 <span className="text-emerald-300">{sessionDuration}秒</span>
            </p>
            <input
              type="text"
              autoFocus
              placeholder="请输入你的名字（可选）"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={handleDialogKeyDown}
              className="mb-6 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => saveRecord("访客")}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => saveRecord(playerName)}
                className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
              >
                保存
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
