"use client";

import { ArrowLeftRight } from "lucide-react";
import { ROLES, type RoleId } from "@/lib/translate/roles";

type Props = {
  fromRole: RoleId;
  toRole: RoleId;
  mode: "translate" | "reverse";
  onChange: (next: { fromRole: RoleId; toRole: RoleId }) => void;
};

function RoleSelect({ id, label, value, onChange }: { id: string; label: string; value: RoleId; onChange: (v: RoleId) => void }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm text-muted-foreground">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as RoleId)}
        className="role-select mt-1 text-2xl sm:text-[28px]"
      >
        {ROLES.map((r) => (
          <option key={r.id} value={r.id}>{r.label}</option>
        ))}
      </select>
    </div>
  );
}

export function RolePair({ fromRole, toRole, mode, onChange }: Props) {
  const fromLabel = mode === "translate" ? "보낸 사람" : "나";
  const toLabel = mode === "translate" ? "받는 사람 (나)" : "받는 사람";
  return (
    <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
      <RoleSelect id="from-role" label={fromLabel} value={fromRole} onChange={(v) => onChange({ fromRole: v, toRole })} />
      <button
        type="button"
        onClick={() => onChange({ fromRole: toRole, toRole: fromRole })}
        aria-label="보낸 사람과 받는 사람 바꾸기"
        title="서로 바꾸기"
        className="mb-1 inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
      >
        <ArrowLeftRight className="size-4" />
      </button>
      <RoleSelect id="to-role" label={toLabel} value={toRole} onChange={(v) => onChange({ fromRole, toRole: v })} />
    </div>
  );
}
