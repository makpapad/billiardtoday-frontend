"use client";

/**
 * Χρονόμετρο + timeouts του τραπεζιού στο Event Desk.
 * Ό,τι δείχνει εδώ στέλνεται στο Live με το ίδιο `score:update` (totalBlocks/progress/
 * timeoutsUsed/maxTimeouts), γι' αυτό τα κουμπιά είναι η ΜΟΝΗ πηγή αλήθειας: STOP
 * σβήνει τη μπάρα, το «κλείσιμο» σβήνει τα μπαλάκια.
 */

export type DeskToolsValue = {
  clockVisible: boolean;
  clockRunning: boolean;
  clockTotal: number;
  clockRemaining: number;
  timeoutsVisible: boolean;
  timeoutsA: number;
  timeoutsB: number;
  timeoutsMax: number;
};

export const emptyDeskTools: DeskToolsValue = {
  clockVisible: false,
  clockRunning: false,
  clockTotal: 40,
  clockRemaining: 40,
  timeoutsVisible: false,
  timeoutsA: 0,
  timeoutsB: 0,
  timeoutsMax: 3,
};

type Props = {
  value: DeskToolsValue;
  onChange: (patch: Partial<DeskToolsValue>) => void;
  disabled?: boolean;
};

const BTN =
  "rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-35";
const BTN_ON =
  "rounded-md border border-emerald-600 bg-emerald-600/20 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300 transition-colors hover:bg-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-35";

export function DeskMatchControls({ value, onChange, disabled = false }: Props) {
  const remaining = Math.max(0, Math.min(value.clockRemaining, value.clockTotal));
  const critical = value.clockVisible && remaining <= 10;
  const off = disabled || !value.clockVisible;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Ρολόι
        </span>
        <span
          className={`min-w-[52px] text-lg font-black tabular-nums ${
            value.clockVisible
              ? critical
                ? "text-rose-400"
                : "text-slate-100"
              : "text-slate-600"
          }`}
        >
          {value.clockVisible ? `${remaining}″` : "—"}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className={value.clockRunning ? BTN_ON : BTN}
            disabled={disabled}
            onClick={() =>
              onChange({
                clockVisible: true,
                clockRunning: true,
                clockRemaining: remaining > 0 ? remaining : value.clockTotal,
              })
            }
          >
            Start
          </button>
          <button
            type="button"
            className={BTN}
            disabled={off || !value.clockRunning}
            onClick={() => onChange({ clockRunning: false })}
          >
            Pause
          </button>
          <button
            type="button"
            className={BTN}
            disabled={disabled || !value.clockVisible}
            onClick={() =>
              onChange({
                clockVisible: false,
                clockRunning: false,
                clockRemaining: value.clockTotal,
              })
            }
          >
            Stop
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Timeouts
        </span>
        {value.timeoutsVisible ? (
          <>
            {(["A", "B"] as const).map((side) => {
              const used = side === "A" ? value.timeoutsA : value.timeoutsB;
              const key = side === "A" ? "timeoutsA" : "timeoutsB";
              return (
                <span key={side} className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-400">{side}</span>
                  <button
                    type="button"
                    className={BTN}
                    disabled={disabled || used <= 0}
                    onClick={() => onChange({ [key]: Math.max(0, used - 1) })}
                  >
                    −
                  </button>
                  <b className="min-w-[26px] text-center text-[12px] tabular-nums text-slate-100">
                    {used}/{value.timeoutsMax}
                  </b>
                  <button
                    type="button"
                    className={BTN}
                    disabled={disabled || used >= value.timeoutsMax}
                    onClick={() =>
                      onChange({ [key]: Math.min(value.timeoutsMax, used + 1) })
                    }
                  >
                    +
                  </button>
                </span>
              );
            })}
            <button
              type="button"
              className={`${BTN} ml-auto`}
              disabled={disabled}
              onClick={() =>
                onChange({ timeoutsVisible: false, timeoutsA: 0, timeoutsB: 0 })
              }
            >
              Κλείσιμο
            </button>
          </>
        ) : (
          <button
            type="button"
            className={`${BTN} ml-auto`}
            disabled={disabled}
            onClick={() => onChange({ timeoutsVisible: true })}
          >
            Ενεργοποίηση
          </button>
        )}
      </div>
    </div>
  );
}
