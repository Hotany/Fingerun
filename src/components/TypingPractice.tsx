import { useEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { createPortal } from "react-dom";
import { RotateCcw, RefreshCw, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Stage = {
  id: string;
  name: string;
  keys: string;
  lineLength: number;
  subtitle: string;
};

type CellState = "pending" | "correct" | "wrong";

export interface TypingPracticeRef {
  resetToStart: () => void;
}

function randomPrompt(keys: string, len: number) {
  const list = keys.split("");
  const out: string[] = [];
  for (let i = 0; i < len; i += 1) {
    out.push(list[Math.floor(Math.random() * list.length)]);
  }
  return out.join("");
}

const TypingPractice = forwardRef<TypingPracticeRef, { 
  onScoreUpdate?: (score: number, duration: number) => void;
  onEndSession?: () => void;
}>(({ onScoreUpdate, onEndSession }, ref) => {
  const stages: Stage[] = useMemo(
    () => [
      { id: "stage-1", name: "基础：asdf", keys: "asdf", lineLength: 20, subtitle: "" },
      { id: "stage-2", name: "基础：jkl;", keys: "jkl;", lineLength: 20, subtitle: "" },
      { id: "stage-3", name: "基础：gh", keys: "gh", lineLength: 20, subtitle: "" },
      { id: "stage-4", name: "中排：asdfghjkl;", keys: "asdfghjkl;", lineLength: 20, subtitle: "" },
      { id: "stage-5", name: "上排：qwer", keys: "qwer", lineLength: 20, subtitle: "" },
      { id: "stage-6", name: "上排：uiop", keys: "uiop", lineLength: 20, subtitle: "" },
      { id: "stage-7", name: "上排：ty", keys: "ty", lineLength: 20, subtitle: "" },
      { id: "stage-8", name: "上排全：qwertyuiop", keys: "qwertyuiop", lineLength: 20, subtitle: "" },
      { id: "stage-9", name: "下排：zxcv", keys: "zxcv", lineLength: 20, subtitle: "" },
      { id: "stage-10", name: "下排：bnm", keys: "bnm", lineLength: 20, subtitle: "" },
      { id: "stage-11", name: "下排全：zxcvbnm", keys: "zxcvbnm", lineLength: 20, subtitle: "" },
      { id: "stage-12", name: "26字母混合", keys: "abcdefghijklmnopqrstuvwxyz", lineLength: 20, subtitle: "" },
      { id: "stage-13", name: "数字 1-0", keys: "1234567890", lineLength: 20, subtitle: "" },
      { id: "stage-14", name: "字母+数字混合", keys: "abcdefghijklmnopqrstuvwxyz1234567890", lineLength: 20, subtitle: "" },
    ],
    [],
  );

  const [stageId, setStageId] = useState(stages[0]?.id ?? "stage-1");
  const stage = stages.find(s => s.id === stageId) ?? stages[0];

  const [prompt, setPrompt] = useState(() => randomPrompt(stage.keys, stage.lineLength));
  const [typed, setTyped] = useState<string[]>(() => Array.from({ length: prompt.length }, () => ""));
  const [cellStates, setCellStates] = useState<CellState[]>(() =>
    Array.from({ length: prompt.length }, () => "pending"),
  );
  const [cursor, setCursor] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const focusRef = useRef<HTMLButtonElement | null>(null);

  const resetLine = (nextPrompt?: string) => {
    const p = nextPrompt ?? randomPrompt(stage.keys, stage.lineLength);
    setPrompt(p);
    setTyped(Array.from({ length: p.length }, () => ""));
    setCellStates(Array.from({ length: p.length }, () => "pending"));
    setCursor(0);
    setStartTime(null);
    setDuration(null);
  };

  useImperativeHandle(ref, () => ({
    resetToStart: () => {
      setHasStarted(false);
      resetLine(randomPrompt(stage.keys, stage.lineLength));
    }
  }));

  useEffect(() => {
    resetLine(randomPrompt(stage.keys, stage.lineLength));
  }, [stageId]);

  const isDone = cursor >= prompt.length;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!hasStarted) return;

      if (isDone) {
        if (e.key === "Enter") {
          e.preventDefault();
          resetLine();
        } else if (e.key === "Tab") {
          e.preventDefault();
          const currentIndex = stages.findIndex(s => s.id === stageId);
          const nextStage = stages[(currentIndex + 1) % stages.length];
          setStageId(nextStage.id);
        } else if (e.key === "Escape") {
          e.preventDefault();
          onEndSession?.();
        }
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        let newCursor = cursor;
        const newTyped = [...typed];
        const newStates = [...cellStates];

        if (cursor < prompt.length && newTyped[cursor]) {
          newTyped[cursor] = "";
          newStates[cursor] = "pending";
          newCursor = cursor;
        } else if (cursor > 0) {
          newCursor = cursor - 1;
          newTyped[newCursor] = "";
          newStates[newCursor] = "pending";
        }

        setTyped(newTyped);
        setCellStates(newStates);
        setCursor(newCursor);
        return;
      }

      const k = e.key.length === 1 ? e.key.toLowerCase() : "";
      if (!k) return;
      if (!stage.keys.includes(k)) return;

      e.preventDefault();
      
      // 记录第一键按下的时间
      if (cursor === 0 && !startTime) {
        setStartTime(Date.now());
      }

      const expected = prompt[cursor];

      const newTyped = [...typed];
      newTyped[cursor] = k;

      const newStates = [...cellStates];
      newStates[cursor] = k === expected ? "correct" : "wrong";

      setTyped(newTyped);
      setCellStates(newStates);

      if (k === expected) {
        const nextCursor = cursor + 1;
        setCursor(nextCursor);
        if (nextCursor === prompt.length) {
          const roundDuration = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
          setDuration(roundDuration);
          onScoreUpdate?.(prompt.length, roundDuration);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cursor, typed, cellStates, hasStarted, isDone, prompt, stage.keys, stageId, stages, startTime, onScoreUpdate]);

  useEffect(() => {
    if (hasStarted) focusRef.current?.focus();
  }, [hasStarted]);

  return (
    <>
      {/* 小屏幕遮罩层（宽度低于 640px 时显示） */}
      {createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#070B18]/95 backdrop-blur-md sm:hidden">
          <div className="mx-6 flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-zinc-100 shadow-2xl">
            <div className="text-xl font-bold text-orange-400">窗口宽度太小，无法使用</div>
            <div className="text-sm leading-relaxed text-zinc-300">
              为了保证练字格子能完整显示
              <br />
              请放大浏览器窗口（≥640px）
            </div>
          </div>
        </div>,
        document.body
      )}

      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-semibold text-white/90">当前关卡</div>
            <div className="text-xl font-semibold tracking-tight">{stage.name}</div>
            {stage.subtitle && <div className="text-sm text-zinc-200/80">{stage.subtitle}</div>}
          </div>

          <label className="group relative inline-flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-medium tracking-[0.2em] text-zinc-300/70">切换</span>
            <div className="relative">
              <select
                value={stageId}
                onChange={e => setStageId(e.target.value)}
                className="h-10 appearance-none rounded-xl border border-white/10 bg-white/5 px-4 pr-10 text-sm font-medium text-zinc-100 outline-none transition hover:bg-white/10 focus:border-white/20"
              >
                {stages.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#070B18]">
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-200/70" />
            </div>
          </label>
        </div>

        <div
          className={cn(
            "relative overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-6 sm:p-8",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
          )}
          onMouseDown={() => setHasStarted(true)}
        >
          {/* 完成时的遮罩 */}
          {isDone && (
            <div className="absolute inset-0 z-20 flex animate-in flex-col items-center justify-center bg-black/80 fade-in duration-300 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <div className="text-3xl font-bold text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)] sm:text-4xl">
                  这一轮顺利完成！
                </div>
                {duration !== null && (
                  <div className="text-lg font-medium text-emerald-200/90">
                    你只用了 <span className="text-2xl font-bold text-white">{duration}</span> 秒
                  </div>
                )}
              </div>
              
              <div className="mt-8 flex flex-col gap-5 text-center">
                <div className="flex items-center justify-center gap-4 text-lg text-zinc-100">
                  按{" "}
                  <kbd className="min-w-[4rem] rounded-xl border border-white/20 bg-white/10 px-4 py-2 font-mono text-emerald-300 shadow-inner">
                    Enter
                  </kbd>{" "}
                  继续当前阶段
                </div>
                <div className="flex items-center justify-center gap-4 text-lg text-zinc-100">
                  按{" "}
                  <kbd className="min-w-[4rem] rounded-xl border border-white/20 bg-white/10 px-4 py-2 font-mono text-purple-300 shadow-inner">
                    Tab
                  </kbd>{" "}
                  跳到下一阶段
                </div>
                <div className="flex items-center justify-center gap-4 text-lg text-zinc-100">
                  按{" "}
                  <kbd className="min-w-[4rem] rounded-xl border border-white/20 bg-white/10 px-4 py-2 font-mono text-rose-300 shadow-inner">
                    Esc
                  </kbd>{" "}
                  结束本次练习
                </div>
              </div>
            </div>
          )}

          {/* 初始点击开始的遮罩 */}
          {!hasStarted ? (
            <button
              type="button"
              onClick={() => setHasStarted(true)}
              className="group absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/60 text-zinc-100 transition-all hover:bg-black/70 backdrop-blur-sm"
            >
              <div className="text-xl font-semibold">点一下开始</div>
              <div className="text-sm text-zinc-200/80">然后直接敲键盘</div>
              <div className="mt-4 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium tracking-[0.18em] text-zinc-200/75 transition group-hover:bg-white/10">
                START
              </div>
            </button>
          ) : null}

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <div className="text-xs font-medium tracking-[0.22em] text-zinc-300/70">目标</div>
              <RowCells values={prompt.split("")} variant="target" cursor={cursor} />
            </div>

            <div className="flex flex-col gap-3">
              <div className="text-xs font-medium tracking-[0.22em] text-zinc-300/70">输入</div>
              <RowCells values={typed} variant="input" cursor={cursor} states={cellStates} />
            </div>

            <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-zinc-200/80">
                进度：<span className="font-semibold text-white/90">{Math.min(cursor + 1, prompt.length)}</span> /{" "}
                {prompt.length}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  ref={focusRef}
                  type="button"
                  onClick={() => resetLine()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-zinc-100 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-200/40"
                >
                  <RefreshCw className="h-4 w-4" />
                  换一轮
                </button>
                <button
                  type="button"
                  onClick={() => resetLine(prompt)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-zinc-100 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-200/40"
                >
                  <RotateCcw className="h-4 w-4" />
                  重新打
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
});

export default TypingPractice;

function RowCells(props: {
  values: string[];
  variant: "target" | "input";
  cursor: number;
  states?: CellState[];
}) {
  const { values, variant, cursor, states } = props;

  return (
    <div className="w-full">
      <div className="grid grid-cols-10 gap-2 sm:gap-3 lg:gap-4">
        {values.map((v, idx) => {
          const state = states?.[idx] ?? "pending";
          const isCursor = idx === cursor && variant === "input";
          const isCorrect = variant === "input" && state === "correct";
          const isWrong = variant === "input" && state === "wrong";
          const showValue = variant === "target" ? v : v || "";

          return (
            <div
              key={idx}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl font-mono text-2xl font-bold tracking-wide transition-all sm:rounded-2xl sm:text-3xl lg:text-4xl",
                variant === "target" ? "bg-white/5 text-zinc-100/90" : "bg-white/5 text-zinc-100",
                isCorrect && "bg-emerald-400/25 text-emerald-50 ring-1 ring-emerald-300/40",
                isWrong && "bg-amber-400/25 text-amber-50 ring-1 ring-amber-300/50",
                isCursor && "shadow-[0_0_0_6px_rgba(168,120,255,0.10)] ring-2 ring-violet-300/70",
              )}
            >
              {showValue === " " ? "␣" : showValue}
            </div>
          );
        })}
      </div>
    </div>
  );
}
