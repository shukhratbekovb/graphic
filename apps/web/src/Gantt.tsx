import { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Flag, GripVertical } from "lucide-react";
import type { Schedule, Task, Payload } from "./types";

const ms = 86400000;
const ord = (s: string) => Math.floor(Date.parse(s + "T00:00:00Z") / ms);
const iso = (n: number) => new Date(n * ms).toISOString().slice(0, 10);
function isWork(n: number, data: Payload) {
  const s = iso(n);
  return (
    data.calendar.working_days.includes(s) ||
    (![0, 6].includes(new Date(n * ms).getUTCDay()) &&
      !data.calendar.holidays.includes(s))
  );
}

export default function Gantt({
  schedule,
  data,
  onTask,
  onMove,
  editable,
}: {
  schedule: Schedule;
  data: Payload;
  onTask: (t: Task) => void;
  onMove: (t: Task) => void;
  editable: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(30);
  const [critical, setCritical] = useState(true);
  const [baseline, setBaseline] = useState(true);
  const [drag, setDrag] = useState<{
    id: string;
    x: number;
    delta: number;
  } | null>(null);
  const tasks = data.tasks;
  const start = ord(data.start) - 2;
  const finish = Math.max(ord(data.end) + 4, start + 28);
  const count = finish - start + 1;
  const width = count * zoom;
  const virtual = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => ref.current,
    estimateSize: () => 58,
    overscan: 5,
  });
  const visible = virtual.getVirtualItems();
  const low = visible[0]?.index || 0;
  const high = visible.at(-1)?.index || tasks.length;
  const x = (s: string) => (ord(s) - start) * zoom;
  const today = (ord(schedule.as_of) - start) * zoom;
  function move(t: Task, delta: number) {
    let a = ord(t.start) + delta;
    const direction = delta < 0 ? -1 : 1;
    while (!isWork(a, data)) a += direction;
    let days = 0;
    for (let n = ord(t.start); n <= ord(t.end); n++)
      if (isWork(n, data)) days++;
    let end = a;
    for (let remaining = 1; remaining < days;) {
      end++;
      if (isWork(end, data)) remaining++;
    }
    onMove({ ...t, start: iso(a), end: iso(t.milestone ? a : end) });
  }
  return (
    <section className="gantt-panel">
      <div className="gantt-toolbar">
        <div className="legend">
          <span>
            <i className="dot green" />
            План
          </span>
          <span>
            <i className="dot coral" />
            Критический путь
          </span>
          <span>
            <i className="dot pale" />
            Первоначальный план
          </span>
        </div>
        <div className="toolbar-controls">
          <label>
            <input
              type="checkbox"
              checked={critical}
              onChange={(e) => setCritical(e.target.checked)}
            />
            Критический путь
          </label>
          <label>
            <input
              type="checkbox"
              checked={baseline}
              onChange={(e) => setBaseline(e.target.checked)}
            />
            Базовый
          </label>
          <select
            aria-label="Масштаб Ганта"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          >
            <option value={30}>Дни</option>
            <option value={16}>Недели</option>
            <option value={8}>Месяцы</option>
          </select>
        </div>
      </div>
      <div
        className="gantt-scroll"
        ref={ref}
        style={{ height: Math.min(526, Math.max(280, tasks.length * 58 + 72)) }}
      >
        <div style={{ width: 330 + width, minHeight: "100%" }}>
          <div className="gantt-header">
            <div className="gantt-fixed header-label">
              Работы и специальности <span>{tasks.length}</span>
            </div>
            <div className="time-header" style={{ width }}>
              <div className="month-caption" style={{ paddingLeft: 0 }}>
                {Array.from({ length: count }, (_, i) => {
                  const d = new Date((start + i) * ms);
                  if (i !== 0 && d.getUTCDate() !== 1) return null;
                  let end = i + 1;
                  while (
                    end < count &&
                    new Date((start + end) * ms).getUTCMonth() ===
                      d.getUTCMonth()
                  )
                    end++;
                  return (
                    <span
                      key={i}
                      style={{
                        width: (end - i) * zoom,
                        paddingLeft: 10,
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      {d.toLocaleDateString("ru-RU", {
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </span>
                  );
                })}
              </div>
              <div className="day-header">
                {Array.from({ length: count }, (_, i) => (
                  <span
                    key={i}
                    className={!isWork(start + i, data) ? "weekend" : ""}
                    style={{ width: zoom }}
                  >
                    {zoom >= 16
                      ? new Date((start + i) * ms).getUTCDate()
                      : i % 7 === 0
                        ? new Date((start + i) * ms).getUTCDate()
                        : ""}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div
            className="gantt-rows"
            style={{ height: virtual.getTotalSize() || 58 }}
          >
            <div
              className="grid-background"
              style={{ left: 330, width, height: "100%" }}
            >
              {Array.from({ length: count }, (_, i) => (
                <div
                  key={i}
                  style={{ left: i * zoom, width: zoom }}
                  className={!isWork(start + i, data) ? "non-work" : ""}
                />
              ))}
            </div>
            {baseline &&
              schedule.baseline?.tasks.map((t) => {
                const idx = tasks.findIndex((a) => a.id === t.id);
                return idx >= low && idx <= high ? (
                  <div
                    key={t.id}
                    className="baseline-bar"
                    style={{
                      left: 330 + x(t.start),
                      top: idx * 58 + 45,
                      width: Math.max(
                        5,
                        (ord(t.end) - ord(t.start) + 1) * zoom,
                      ),
                    }}
                  />
                ) : null;
              })}
            {visible.map((v) => {
              const t = tasks[v.index];
              const node = schedule.calculation.nodes[t.id];
              const fact = schedule.facts[t.id];
              const isCritical = critical && node?.critical;
              return (
                <div
                  className="gantt-row"
                  key={t.id}
                  style={{
                    height: 58,
                    transform: `translateY(${v.start}px)`,
                    width: 330 + width,
                  }}
                >
                  <button
                    className="gantt-fixed task-label"
                    onClick={() => onTask(t)}
                  >
                    <span className="specialty-code">{t.specialty}</span>
                    <span>
                      <strong>{t.title}</strong>
                      <small>{t.department}</small>
                    </span>
                    {t.milestone ? (
                      <Flag size={14} />
                    ) : (
                      <GripVertical size={13} />
                    )}
                  </button>
                  <button
                    className={`task-bar ${isCritical ? "critical" : ""} ${t.milestone ? "milestone" : ""}`}
                    title={`${t.title}: ${t.start} — ${t.end}. Резерв: ${node?.float ?? "—"} раб. дн.`}
                    aria-label={`Работа ${t.title}`}
                    style={{
                      left:
                        330 +
                        x(t.start) +
                        (drag?.id === t.id ? drag.delta * zoom : 0),
                      width: t.milestone
                        ? 16
                        : Math.max(18, (ord(t.end) - ord(t.start) + 1) * zoom),
                    }}
                    onDoubleClick={() => onTask(t)}
                    onPointerDown={(e) => {
                      if (!editable) {
                        onTask(t);
                        return;
                      }
                      e.currentTarget.setPointerCapture(e.pointerId);
                      setDrag({ id: t.id, x: e.clientX, delta: 0 });
                    }}
                    onPointerMove={(e) => {
                      if (drag?.id === t.id)
                        setDrag({
                          ...drag,
                          delta: Math.round((e.clientX - drag.x) / zoom),
                        });
                    }}
                    onPointerUp={() => {
                      if (drag?.id === t.id) {
                        if (drag.delta) move(t, drag.delta);
                        else onTask(t);
                        setDrag(null);
                      }
                    }}
                    onPointerCancel={() => setDrag(null)}
                  >
                    {!t.milestone && (
                      <>
                        <span
                          className="bar-fill"
                          style={{ width: (fact?.progress || 0) + "%" }}
                        />
                        <span className="bar-text">
                          {(ord(t.end) - ord(t.start) + 1) * zoom > 65
                            ? fact
                              ? fact.progress + "%"
                              : t.specialty
                            : ""}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
            <svg
              className="dependency-layer"
              style={{ left: 330, width, height: virtual.getTotalSize() }}
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="arrow"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6" fill="#8faaa3" />
                </marker>
                <marker
                  id="critical-arrow"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6" fill="#cf765f" />
                </marker>
              </defs>
              {tasks.flatMap((t, j) =>
                t.dependencies.map((link, k) => {
                  const i = tasks.findIndex((a) => a.id === link.from);
                  if (i < 0 || Math.max(i, j) < low || Math.min(i, j) > high)
                    return null;
                  const a = tasks[i];
                  const from =
                    x(link.type === "SS" ? a.start : a.end) +
                    (link.type === "SS" ? 0 : a.milestone ? 8 : zoom);
                  const to =
                    x(link.type === "FF" ? t.end : t.start) +
                    (link.type === "FF" ? zoom : 0);
                  const y1 = i * 58 + 27,
                    y2 = j * 58 + 27;
                  const red =
                    critical &&
                    schedule.calculation.edges.some(
                      (e) => e.from === a.id && e.to === t.id && e.critical,
                    );
                  return (
                    <path
                      key={t.id + "-" + k}
                      d={`M${from},${y1} H${from + 8} V${(y1 + y2) / 2} H${to - 10} V${y2} H${to - 2}`}
                      fill="none"
                      stroke={red ? "#cf765f" : "#8faaa3"}
                      strokeWidth="1.4"
                      markerEnd={`url(#${red ? "critical-arrow" : "arrow"})`}
                    />
                  );
                }),
              )}
            </svg>
            {today >= 0 && today <= width && (
              <div className="today-line" style={{ left: 330 + today }}>
                <span>Сегодня</span>
              </div>
            )}
            {!tasks.length && (
              <div className="empty">
                Добавьте первую работу, чтобы построить график.
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="gantt-footer">
        <span>
          {editable
            ? "Перетащите полосу или нажмите на название для изменения дат. Затем сохраните график."
            : "Нажмите на работу для просмотра или ввода факта."}
        </span>
        <span>{schedule.calculation.duration} рабочих дней</span>
      </div>
    </section>
  );
}
