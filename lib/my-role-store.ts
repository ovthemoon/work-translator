import { useSyncExternalStore } from "react";
import { ROLES, type RoleId } from "@/lib/translate/roles";

const KEY = "wt:my-role";
const DEFAULT_ROLE: RoleId = "developer";
const listeners = new Set<() => void>();

function read(): RoleId {
  try {
    const v = window.localStorage.getItem(KEY);
    return ROLES.some((r) => r.id === v) ? (v as RoleId) : DEFAULT_ROLE;
  } catch {
    return DEFAULT_ROLE;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 브라우저에 기억되는 "내 직군". 서버 렌더링에서는 기본값을 쓴다. */
export function useMyRole(): [RoleId, (role: RoleId) => void] {
  const role = useSyncExternalStore(subscribe, read, () => DEFAULT_ROLE);
  const setRole = (next: RoleId) => {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* 저장 실패는 무시 */
    }
    listeners.forEach((l) => l());
  };
  return [role, setRole];
}
