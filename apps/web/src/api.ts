export function csrf() {
  return (
    document.cookie
      .split("; ")
      .find((x) => x.startsWith("csrftoken="))
      ?.split("=")[1] || ""
  );
}
export async function api<T>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const form = data instanceof FormData;
  const res = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: {
      ...(!form ? { "Content-Type": "application/json" } : {}),
      "X-CSRFToken": csrf(),
    },
    body: data === undefined ? undefined : form ? data : JSON.stringify(data),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ detail: "Сервер недоступен" }));
    throw new Error(
      typeof e.detail === "string" ? e.detail : JSON.stringify(e),
    );
  }
  return res.json();
}
export const cash = (v: string | number | null, compact = false) =>
  v === null
    ? "—"
    : new Intl.NumberFormat("ru-RU", {
        maximumFractionDigits: compact ? 1 : 0,
      }).format(Number(v) / (compact ? 1000000 : 1)) + (compact ? " млн" : "");
export const dateText = (s: string) =>
  s
    ? new Date(s.slice(0, 10) + "T12:00:00Z").toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      })
    : "—";
export const roleText: Record<string, string> = {
  gip: "Главный инженер проекта",
  coordinator: "Служба координирования",
  technical: "Технический директор",
  finance: "Директор по финансам",
  director: "Генеральный директор",
  department: "Начальник отдела",
};
