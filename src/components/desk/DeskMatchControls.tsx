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
  /** Πόσα δικαιούται ο κάθε παίκτης — ρυθμίζονται ΑΝΕΞΑΡΤΗΤΑ με +/−. */
  timeoutsMaxA: number;
  timeoutsMaxB: number;
};

export const emptyDeskTools: DeskToolsValue = {
  clockVisible: false,
  clockRunning: false,
  clockTotal: 40,
  clockRemaining: 40,
  timeoutsVisible: false,
  timeoutsA: 0,
  timeoutsB: 0,
  timeoutsMaxA: 3,
  timeoutsMaxB: 3,
};

type Props = {
  value: DeskToolsValue;
  onChange: (patch: Partial<DeskToolsValue>) => void;
  disabled?: boolean;
};

/**
 * Ένα δευτερόλεπτο ρολογιού. Όταν συμπληρωθούν τα 40″ ΔΕΝ σταματά: καίγεται ένα
 * timeout του παίκτη που έχει τη σειρά (γίνεται γκρι) και το ρολόι ξαναξεκινά από
 * 40″. Μόνο όταν δεν μένει κανένα timeout μένει στο 0 και σβήνει.
 */
export function tickTools(tools: DeskToolsValue, active: 0 | 1): DeskToolsValue {
  if (!tools.clockVisible || !tools.clockRunning) return tools;
  const remaining = Math.max(0, tools.clockRemaining - 1);
  if (remaining > 0) return { ...tools, clockRemaining: remaining };
  const key = active === 0 ? "timeoutsA" : "timeoutsB";
  const used = active === 0 ? tools.timeoutsA : tools.timeoutsB;
  const max = active === 0 ? tools.timeoutsMaxA : tools.timeoutsMaxB;
  if (used < max) {
    return {
      ...tools,
      [key]: used + 1,
      clockRemaining: tools.clockTotal,
      clockRunning: true,
    };
  }
  return { ...tools, clockRemaining: 0, clockRunning: false };
}

/** Γράφτηκε πόντος: το ρολόι γυρνά στα 40″ και περιμένει (δεν ξεκινά μόνο του). */
export function resetClockAfterPoint(tools: DeskToolsValue): DeskToolsValue {
  if (!tools.clockVisible) return tools;
  return { ...tools, clockRemaining: tools.clockTotal, clockRunning: false };
}

const BTN =
  "rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-35";
const BTN_ON =
  "rounded-md border border-emerald-600 bg-emerald-600/20 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300 transition-colors hover:bg-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-35";

/** Το κουμπί on/off για ρολόι + timeouts (μπαίνει στη γραμμή των quick κουμπιών). */
export function DeskToolsToggle({ value, onChange, disabled = false }: Props) {
  const enabled = value.clockVisible || value.timeoutsVisible;
  const remaining = Math.max(0, Math.min(value.clockRemaining, value.clockTotal));
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() =>
        onChange(
          enabled
            ? {
                clockVisible: false,
                clockRunning: false,
                clockRemaining: value.clockTotal,
                timeoutsVisible: false,
                timeoutsA: 0,
                timeoutsB: 0,
              }
            : {
                clockVisible: true,
                timeoutsVisible: true,
                clockRemaining: remaining > 0 ? remaining : value.clockTotal,
              },
        )
      }
      className={
        enabled
          ? "w-full rounded-md border border-emerald-600 bg-emerald-600/20 px-2 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
          : "w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
      }
    >
      {enabled ? "Χρόνος ● ON" : "Χρόνος OFF"}
    </button>
  );
}

export function DeskMatchControls({
  value,
  onChange,
  disabled = false,
  hideMaster = false,
}: Props & { hideMaster?: boolean }) {
  const remaining = Math.max(0, Math.min(value.clockRemaining, value.clockTotal));
  const critical = value.clockVisible && remaining <= 10;
  const off = disabled || !value.clockVisible;
  /* Ένα κουμπί: ανάβει/σβήνει ρολόι ΚΑΙ timeouts μαζί — στο Live φαίνονται μόνο τότε. */
  const enabled = value.clockVisible || value.timeoutsVisible;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
      {hideMaster ? null : (
        <div className="flex items-center gap-2">
          <DeskToolsToggle value={value} onChange={onChange} disabled={disabled} />
        </div>
      )}

      {enabled ? (
        <>
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
            disabled={off}
            onClick={() =>
              /* Μηδενίζει στα 40″ και παγώνει — η μπάρα μένει στο Live.
                 Για να φύγει τελείως, σβήνει το «Χρόνος ON». */
              onChange({ clockRunning: false, clockRemaining: value.clockTotal })
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
        {(["A", "B"] as const).map((side) => {
          const used = side === "A" ? value.timeoutsA : value.timeoutsB;
          const max = side === "A" ? value.timeoutsMaxA : value.timeoutsMaxB;
          const maxKey = side === "A" ? "timeoutsMaxA" : "timeoutsMaxB";
          const usedKey = side === "A" ? "timeoutsA" : "timeoutsB";
          return (
            <span key={side} className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-400">{side}</span>
              {/* Τα «+ / −» αλλάζουν ΠΟΣΑ timeouts δικαιούται Ο ΠΑΙΚΤΗΣ — ανεξάρτητα ανά πλευρά. */}
              <button
                type="button"
                className={BTN}
                disabled={disabled || max <= used || max <= 0}
                onClick={() => onChange({ [maxKey]: Math.max(used, max - 1) })}
              >
                −
              </button>
              <b className="min-w-[26px] text-center text-[12px] tabular-nums text-slate-100">
                {used}/{max}
              </b>
              <button
                type="button"
                className={BTN}
                disabled={disabled || max >= 9}
                onClick={() => onChange({ [maxKey]: max + 1 })}
              >
                +
              </button>
              {/* Επιστροφή ΚΑΜΕΝΟΥ timeout: αν πρόλαβε να μηδενίσει το ρολόι, ο χειριστής
                  το γυρνάει πίσω με ένα πάτημα (ορατό κουμπί, όχι κρυφή χειρονομία). */}
              <button
                type="button"
                className={BTN}
                title="Επιστροφή καμένου timeout"
                disabled={disabled || used <= 0}
                onClick={() => onChange({ [usedKey]: Math.max(0, used - 1) })}
              >
                ↺
              </button>
            </span>
          );
        })}
      </div>
        </>
      ) : null}
    </div>
  );
}
