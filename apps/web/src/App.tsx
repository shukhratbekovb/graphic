import {
  useEffect,
  useState,
  useId,
  cloneElement,
  isValidElement,
} from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileBarChart2,
  FolderOpen,
  GanttChart,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  Upload,
  X,
  Save,
  History,
  Send,
  Trash2,
} from "lucide-react";
import type { ReactNode, ReactElement } from "react";
import type { Boot, User, Schedule, Task, Payload, Link } from "./types";
import { api, cash, dateText, roleText } from "./api";
import Gantt from "./Gantt";

const statuses: Record<string, string> = {
  draft: "Черновик",
  review: "На утверждении",
  approved: "Утверждён",
  returned: "На доработку",
  overdue: "Есть просрочки",
  active: "В работе",
  planned: "Запланирован",
  completed: "Завершён",
};
function Badge({ value }: { value: string }) {
  return (
    <span className={"badge " + value}>
      <i />
      {statuses[value] || value}
    </span>
  );
}
function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={"modal " + (wide ? "wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            <span className="eyebrow">ПИР КОНТРОЛЬ</span>
            <h2>{title}</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span id={id + "-label"}>{label}</span>
      {isValidElement(children)
        ? cloneElement(
            children as ReactElement<{
              id?: string;
              "aria-labelledby"?: string;
            }>,
            { id, "aria-labelledby": id + "-label" },
          )
        : children}
    </label>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null),
    [boot, setBoot] = useState<Boot | null>(null),
    [loading, setLoading] = useState(true),
    [rows, setRows] = useState<Schedule[]>([]),
    [page, setPage] = useState("dashboard"),
    [selected, setSelected] = useState<Schedule | null>(null),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [create, setCreate] = useState(false);
  async function reload() {
    const [b, s] = await Promise.all([
      api<Boot>("/bootstrap"),
      api<Schedule[]>("/schedules"),
    ]);
    setBoot(b);
    setUser(b.user);
    setRows(s);
  }
  useEffect(() => {
    api<{ user: User | null }>("/session")
      .then(async (r) => {
        if (r.user) await reload();
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 4500);
      return () => clearTimeout(t);
    }
  }, [notice]);
  async function run(fn: () => Promise<void>) {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function go(next: string) {
    setPage(next);
    setSelected(null);
    setSearch("");
    setFilter("all");
  }
  async function open(s: Schedule) {
    await run(async () => {
      setSelected(await api<Schedule>("/schedules/" + s.id));
      setPage("detail");
    });
  }
  function done(s: Schedule) {
    setSelected(s);
    setRows((prev) => prev.map((r) => (r.id === s.id ? s : r)));
    setNotice("Изменения сохранены");
  }
  if (loading)
    return (
      <div className="loading-screen">
        <div className="brand-mark">
          <GitBranch />
        </div>
        <p>Загружаем рабочее пространство…</p>
      </div>
    );
  if (!user)
    return (
      <Login onLogin={() => run(reload)} error={error} setError={setError} />
    );
  const visible = rows
    .filter((s) =>
      (s.title + " " + s.number + " " + s.project.title + " " + s.gip)
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .filter(
      (s) =>
        filter === "all" ||
        (filter === "risk"
          ? s.overdue_count > 0
          : s.revision.status === filter),
    );
  const budget = rows.reduce((a, s) => a + Number(s.data.budget), 0),
    late = rows.filter((s) => s.overdue_count > 0),
    reviews = rows.filter((s) => s.revision.status === "review");
  const links = [
    ["dashboard", "Обзор производства", LayoutDashboard],
    ["schedules", "Графики ПИР", GanttChart],
    ["reports", "Отчёты и загрузка", FileBarChart2],
    ["models", "Сетевые модели", GitBranch],
    ["calendar", "Рабочий календарь", CalendarDays],
  ] as const;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => go("dashboard")}>
          <span className="brand-mark">
            <GitBranch size={24} />
          </span>
          <span>
            ПИР<span className="brand-light">Контроль</span>
            <small>ПРОИЗВОДСТВЕННОЕ ПЛАНИРОВАНИЕ</small>
          </span>
        </button>
        <div className="workspace">
          <div className="workspace-icon">
            <Building2 size={19} />
          </div>
          <div>
            <strong>Проектный институт</strong>
            <small>Рабочее пространство</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-caption">УПРАВЛЕНИЕ ПРОЕКТАМИ</div>
        <nav>
          {links.map(([key, label, Icon]) => (
            <button
              key={key}
              aria-label={label}
              title={label}
              className={
                page === key || (page === "detail" && key === "schedules")
                  ? "active"
                  : ""
              }
              onClick={() => go(key)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {key === "schedules" && <em>{rows.length}</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note">
            <ShieldCheck size={18} />
            <span>
              Данные вашего института<small>Версии и история изменений</small>
            </span>
          </div>
          <div className="profile">
            <span className="avatar">
              {user.name
                .split(" ")
                .map((x) => x[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>{roleText[user.role]}</small>
            </div>
            <button
              className="icon-button"
              aria-label="Выйти"
              onClick={() =>
                run(async () => {
                  await api("/logout", "POST", {});
                  setUser(null);
                  setBoot(null);
                  setSelected(null);
                  setPage("dashboard");
                })
              }
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            Рабочее пространство <ChevronRight size={13} />
            <strong>
              {page === "detail"
                ? "Графики ПИР"
                : links.find((l) => l[0] === page)?.[1]}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="live-dot" /> MVP · локальное рабочее пространство{" "}
            <span className="vertical-rule" />
            <CalendarDays size={15} />
            {dateText(boot?.today || "2026-10-12")}
          </div>
        </header>
        <main>
          {error && (
            <div className="alert error" role="alert">
              <TriangleAlert size={18} />
              <span>{error}</span>
              <button aria-label="Закрыть ошибку" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="toast" role="status">
              <CheckCheck size={18} />
              {notice}
            </div>
          )}
          {(page === "dashboard" || page === "schedules") && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">ПРОЕКТНО-ИЗЫСКАТЕЛЬСКИЕ РАБОТЫ</div>
                  <h1>
                    {page === "dashboard"
                      ? "Обзор производства"
                      : "Графики ПИР"}
                  </h1>
                  <p>
                    {page === "dashboard"
                      ? "Общая картина по объектам. Каждый срок — под контролем."
                      : "Планируйте работы, отслеживайте выдачи и управляйте сроками."}
                  </p>
                </div>
                {user.role === "gip" && (
                  <button
                    className="button primary"
                    onClick={() => setCreate(true)}
                  >
                    <Plus size={18} />
                    Создать график
                  </button>
                )}
              </div>
              <div className="stats">
                <Stat
                  label="Графиков в портфеле"
                  value={rows.length.toString()}
                  foot={`${boot?.projects.length || 0} объекта в работе`}
                  icon={<FolderOpen size={21} />}
                  tone="green"
                />
                <Stat
                  label="Требуют внимания"
                  value={late.length.toString()}
                  foot="Графики с просроченными работами"
                  icon={<TriangleAlert size={21} />}
                  tone="orange"
                />
                <Stat
                  label="На утверждении"
                  value={reviews.length.toString()}
                  foot="Ожидают решения директора"
                  icon={<Clock3 size={21} />}
                  tone="blue"
                />
                <Stat
                  label="Стоимость портфеля"
                  value={cash(budget, true)}
                  foot="сум · плановый объём работ"
                  icon={<Activity size={21} />}
                  tone="green"
                />
              </div>
              {page === "dashboard" && (
                <div className="brief-strip">
                  <div className="brief-icon">
                    <CalendarDays size={22} />
                  </div>
                  <div>
                    <strong>К следующей планёрке</strong>
                    <p>
                      {late.length
                        ? `${late.length} графика требуют уточнения сроков. Проверьте причины задержек и актуальность факта.`
                        : "Актуализируйте выполнение и сохраните отчёт на выбранную дату."}
                    </p>
                  </div>
                  <button onClick={() => go("reports")}>
                    Подготовить отчёт <ArrowUpRight size={17} />
                  </button>
                </div>
              )}
              <section className="panel registry">
                <div className="panel-heading">
                  <div>
                    <h2>
                      Портфель графиков{" "}
                      <span className="count">{rows.length}</span>
                    </h2>
                    <p>
                      Сроки, готовность и ответственные по каждому виду работ
                    </p>
                  </div>
                  <button
                    className="button subtle"
                    onClick={() => go("reports")}
                  >
                    <ArrowDownToLine size={16} />
                    Отчёт Excel
                  </button>
                </div>
                <div className="registry-tools">
                  <div className="tabs">
                    {[
                      ["all", "Все графики"],
                      ["approved", "Утверждённые"],
                      ["review", "На утверждении"],
                      ["risk", "С риском"],
                    ].map(([k, t]) => (
                      <button
                        key={k}
                        className={filter === k ? "selected" : ""}
                        onClick={() => setFilter(k)}
                      >
                        {t}
                        {k === "risk" && late.length > 0 && (
                          <span>{late.length}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <label className="search">
                    <Search size={16} />
                    <input
                      aria-label="Поиск графиков"
                      placeholder="Найти объект или график…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                </div>
                <div className="table-wrap">
                  <table className="portfolio-table">
                    <thead>
                      <tr>
                        <th>График / объект</th>
                        <th>Статус</th>
                        <th>Плановые сроки</th>
                        <th>Готовность</th>
                        <th>Стоимость, сум</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((s) => (
                        <tr
                          key={s.id}
                          onClick={() => open(s)}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") open(s);
                          }}
                        >
                          <td>
                            <div className="schedule-title">
                              <span className="project-icon">
                                <Building2 size={20} />
                              </span>
                              <div>
                                <strong>{s.title}</strong>
                                <small>
                                  {s.number} <span>·</span> {s.project.title}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <Badge
                              value={
                                s.revision.status === "approved"
                                  ? s.state
                                  : s.revision.status
                              }
                            />
                          </td>
                          <td>
                            <span className="dates">
                              {dateText(s.data.start)} — {dateText(s.data.end)}
                            </span>
                            <small>{s.calculation.duration} раб. дней</small>
                          </td>
                          <td>
                            <div className="progress-label">
                              <span>{s.progress}%</span>
                              {s.overdue_count > 0 && (
                                <TriangleAlert
                                  size={13}
                                  className="orange-text"
                                />
                              )}
                            </div>
                            <div className="progress-track">
                              <i style={{ width: s.progress + "%" }} />
                            </div>
                          </td>
                          <td className="money">{cash(s.data.budget, true)}</td>
                          <td>
                            <ChevronRight size={17} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!visible.length && (
                    <div className="empty">
                      <FolderOpen />
                      <h3>Графики не найдены</h3>
                      <p>Измените фильтр или создайте первый график.</p>
                    </div>
                  )}
                </div>
                <div className="table-footer">
                  <span>
                    Показано {visible.length} из {rows.length} графиков
                  </span>
                  <span>
                    <i className="dot green" />
                    Данные сохранены в базе
                  </span>
                </div>
              </section>
              {page === "dashboard" && (
                <div className="bottom-grid">
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>Фокус внимания</h2>
                      <span className="soft-icon orange">
                        <TriangleAlert size={17} />
                      </span>
                    </div>
                    {late.length ? (
                      late.slice(0, 3).map((s) => (
                        <button
                          className="focus-row"
                          key={s.id}
                          onClick={() => open(s)}
                        >
                          <span className="focus-line" />
                          <div>
                            <strong>{s.title}</strong>
                            <small>
                              {s.overdue_count} работ с истёкшим сроком ·{" "}
                              {s.gip}
                            </small>
                          </div>
                          <ArrowUpRight size={17} />
                        </button>
                      ))
                    ) : (
                      <p className="muted padded">Просроченных работ нет.</p>
                    )}
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>Работа с сетевыми моделями</h2>
                      <GitBranch size={20} />
                    </div>
                    <div className="model-promo">
                      <div className="mini-network">
                        <i />
                        <span />
                        <i />
                        <span />
                        <i />
                      </div>
                      <h3>Технологические связи — основа графика</h3>
                      <p>
                        Выберите модель, задайте сроки и контролируйте передачи
                        между специальностями.
                      </p>
                      <button
                        className="text-button"
                        onClick={() => go("models")}
                      >
                        Открыть библиотеку <ArrowRight size={16} />
                      </button>
                    </div>
                  </section>
                </div>
              )}
              <div className="demo-notice">
                Учебные графики отмечены моделью DEMO. Перед производственным
                использованием проверьте сетевые связи и календарь праздников
                Узбекистана.
              </div>
            </>
          )}
          {page === "detail" && selected && boot && (
            <Detail
              key={selected.id}
              schedule={selected}
              boot={boot}
              busy={busy}
              run={run}
              onBack={() => go("schedules")}
              done={done}
              notify={setNotice}
            />
          )}
          {page === "reports" && boot && (
            <Reports boot={boot} run={run} notify={setNotice} open={open} />
          )}
          {page === "models" && boot && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">БИБЛИОТЕКА ТЕХНОЛОГИЙ</div>
                  <h1>Сетевые модели</h1>
                  <p>
                    Шифры и наименования из исходных материалов. Учебные связи
                    выделены отдельно.
                  </p>
                </div>
              </div>
              <div className="model-grid">
                {boot.templates.map((t) => (
                  <section className="panel model-card" key={t.id}>
                    <div>
                      <span className="model-code">{t.code}</span>
                      <GitBranch size={20} />
                    </div>
                    <h3>{t.title}</h3>
                    <p>
                      {t.tasks.length
                        ? `${t.tasks.length} узлов · учебный пример для проверки MVP`
                        : "Структура связей ещё не загружена. Доступна карточка модели."}
                    </p>
                    <span
                      className={
                        "badge " + (t.tasks.length ? "planned" : "draft")
                      }
                    >
                      <i />
                      {t.tasks.length ? "Учебная схема" : "Требует подготовки"}
                    </span>
                  </section>
                ))}
              </div>
            </>
          )}
          {page === "calendar" && boot && (
            <Calendars
              boot={boot}
              run={run}
              reload={reload}
              notify={setNotice}
            />
          )}
        </main>
        <footer className="app-footer">
          <span>ПИР Контроль</span>
          <span>Планирование с учётом технологических связей · MVP 0.1</span>
        </footer>
      </div>
      {create && boot && (
        <CreateSchedule
          boot={boot}
          close={() => setCreate(false)}
          run={run}
          created={async (s) => {
            await reload();
            setCreate(false);
            setSelected(s);
            setPage("detail");
          }}
        />
      )}
      {busy && <div className="busy-line" />}
    </div>
  );
}

function Stat({
  label,
  value,
  foot,
  icon,
  tone,
}: {
  label: string;
  value: string;
  foot: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <article className="stat">
      <div>
        <span>{label}</span>
        <span className={"soft-icon " + tone}>{icon}</span>
      </div>
      <strong>{value}</strong>
      <small>{foot}</small>
    </article>
  );
}

function Login({
  onLogin,
  error,
  setError,
}: {
  onLogin: () => void;
  error: string;
  setError: (s: string) => void;
}) {
  const [name, setName] = useState("gip"),
    [password, setPassword] = useState(""),
    [pending, setPending] = useState(false);
  return (
    <div className="login">
      <div className="login-story">
        <div className="brand">
          <span className="brand-mark">
            <GitBranch />
          </span>
          <span>ПИР Контроль</span>
        </div>
        <div>
          <span className="eyebrow">ОТ ЗАДАНИЯ ДО ГОТОВОГО ПРОЕКТА</span>
          <h1>
            У каждого проекта
            <br />
            есть свой путь.
          </h1>
          <p>
            Планируйте работу специальностей, контролируйте сроки и принимайте
            решения на основе общей картины.
          </p>
          <div className="login-network">
            <i />
            <span />
            <i />
            <span />
            <i />
          </div>
        </div>
        <small>Единое пространство производственного планирования</small>
      </div>
      <div className="login-form">
        <div className="eyebrow">РАБОЧЕЕ ПРОСТРАНСТВО</div>
        <h2>Добро пожаловать</h2>
        <p>Войдите с учётной записью вашего института.</p>
        {error && <div className="alert error">{error}</div>}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setPending(true);
            try {
              await api("/session");
              await api("/login", "POST", { username: name, password });
              onLogin();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setPending(false);
            }
          }}
        >
          <Field label="Логин">
            <input
              autoComplete="username"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
          <Field label="Пароль">
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <button className="button primary" disabled={pending}>
            {pending ? "Входим…" : "Войти в пространство"}
            <ArrowRight size={17} />
          </button>
        </form>
        <div className="login-hint">
          <ShieldCheck size={18} />
          <span>
            Доступ по ролям. Все изменения графиков сохраняются в истории.
          </span>
        </div>
      </div>
    </div>
  );
}

function CreateSchedule({
  boot,
  close,
  run,
  created,
}: {
  boot: Boot;
  close: () => void;
  run: (f: () => Promise<void>) => Promise<void>;
  created: (s: Schedule) => Promise<void>;
}) {
  const [v, setV] = useState({
    project_id: boot.projects[0]?.id || "",
    project_code: "",
    project_title: "",
    number: "",
    title: "",
    stage: "РД",
    phase: "01",
    start: boot.today,
    calendar_id: boot.calendars[0]?.id,
    template_id: boot.templates.find((t) => t.tasks.length)?.id || "",
  });
  const change = (k: string, value: string) =>
    setV((s) => ({ ...s, [k]: value }));
  return (
    <Modal title="Новый график ПИР" onClose={close}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(async () =>
            created(await api<Schedule>("/schedules", "POST", v)),
          );
        }}
      >
        <Field label="Объект">
          <select
            value={v.project_id}
            onChange={(e) => change("project_id", e.target.value)}
          >
            {boot.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.title}
              </option>
            ))}
            <option value="">+ Новый объект</option>
          </select>
        </Field>
        {!v.project_id && (
          <div className="form-grid">
            <Field label="Шифр объекта">
              <input
                required
                value={v.project_code}
                onChange={(e) => change("project_code", e.target.value)}
              />
            </Field>
            <Field label="Наименование объекта">
              <input
                required
                value={v.project_title}
                onChange={(e) => change("project_title", e.target.value)}
              />
            </Field>
          </div>
        )}
        <Field label="Наименование вида работ">
          <input
            required
            value={v.title}
            onChange={(e) => change("title", e.target.value)}
            placeholder="Например, пролётные строения"
          />
        </Field>
        <div className="form-grid">
          <Field label="Номер графика">
            <input
              required
              value={v.number}
              onChange={(e) => change("number", e.target.value)}
              placeholder="3488.РД.01.002"
            />
          </Field>
          <Field label="Начало работ">
            <input
              type="date"
              required
              value={v.start}
              onChange={(e) => change("start", e.target.value)}
            />
          </Field>
          <Field label="Стадия">
            <input
              required
              value={v.stage}
              onChange={(e) => change("stage", e.target.value)}
            />
          </Field>
          <Field label="Этап календарного плана">
            <input
              required
              value={v.phase}
              onChange={(e) => change("phase", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Сетевая модель">
          <select
            value={v.template_id}
            onChange={(e) => change("template_id", e.target.value)}
          >
            <option value="">Индивидуальный график</option>
            {boot.templates
              .filter((t) => t.tasks.length)
              .map((t) => (
                <option value={t.id} key={t.id}>
                  {t.code} · {t.title}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Календарь">
          <select
            value={v.calendar_id}
            onChange={(e) => change("calendar_id", e.target.value)}
          >
            {boot.calendars.map((c) => (
              <option value={c.id} key={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </Field>
        <p className="form-hint">
          Стоимость и сроки каждой специальности можно задать в редакторе.
          Созданный график сохраняется как черновик.
        </p>
        <div className="modal-actions">
          <button type="button" className="button" onClick={close}>
            Отмена
          </button>
          <button className="button primary">
            <Plus size={16} />
            Создать график
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Detail({
  schedule: s,
  boot,
  busy,
  run,
  onBack,
  done,
  notify,
}: {
  schedule: Schedule;
  boot: Boot;
  busy: boolean;
  run: (f: () => Promise<void>) => Promise<void>;
  onBack: () => void;
  done: (s: Schedule) => void;
  notify: (s: string) => void;
}) {
  const [data, setData] = useState<Payload>(structuredClone(s.data)),
    [dirty, setDirty] = useState(false),
    [task, setTask] = useState<Task | null>(null),
    [showHistory, setShowHistory] = useState(false),
    [audit, setAudit] = useState<
      {
        id: number;
        action: string;
        user: string;
        date: string;
        detail: { reason?: string };
      }[]
    >([]),
    [approver, setApprover] = useState(
      s.revision.approver_id ||
        boot.users.find((u) => u.role === "technical")?.id ||
        0,
    ),
    [reasonModal, setReasonModal] = useState(""),
    [reason, setReason] = useState("");
  useEffect(() => {
    setData(structuredClone(s.data));
    setDirty(false);
  }, [s]);
  const editable = boot.user.role === "gip" && s.revision.status === "draft";
  function update(p: Partial<Payload>) {
    setData((v) => ({ ...v, ...p }));
    setDirty(true);
  }
  function updateTask(t: Task) {
    update({
      tasks: data.tasks.some((x) => x.id === t.id)
        ? data.tasks.map((x) => (x.id === t.id ? t : x))
        : [...data.tasks, t],
    });
    setTask(null);
  }
  async function act(command: string, extra: unknown = {}) {
    if (dirty) throw new Error("Сначала сохраните изменения графика.");
    done(await api<Schedule>(`/schedules/${s.id}/${command}`, "POST", extra));
  }
  return (
    <>
      <button
        className="back-button"
        onClick={() => {
          if (!dirty || window.confirm("Есть несохранённые изменения. Выйти?"))
            onBack();
        }}
      >
        <ArrowLeft size={16} />
        Все графики
      </button>
      <div className="page-heading detail-heading">
        <div>
          <div className="eyebrow">
            {s.project.code} / {s.stage} / ЭТАП {s.phase}
          </div>
          <h1>{s.title}</h1>
          <p>{s.project.title}</p>
        </div>
        <div className="heading-actions">
          <Badge value={s.revision.status} />
          <a className="button" href={`/api/schedules/${s.id}/export`}>
            <ArrowDownToLine size={16} />
            Excel / А4
          </a>
        </div>
      </div>
      <div className="detail-meta">
        <span>
          <FolderOpen size={15} />
          {s.number}
        </span>
        <span>
          ГИП: <strong>{s.gip}</strong>
        </span>
        <span>
          <GitBranch size={15} />
          {s.data.model_code}
        </span>
        <span>Редакция {s.revision.number}</span>
        <button
          onClick={() =>
            run(async () => {
              setAudit(await api(`/schedules/${s.id}/history`));
              setShowHistory(true);
            })
          }
        >
          <History size={15} />
          История
        </button>
      </div>
      {data.calendar.is_demo && (
        <div className="alert warning">
          <TriangleAlert size={16} />
          <span>
            Учебный календарь: праздники Узбекистана не подтверждены. Этот
            график используется для проверки MVP.
          </span>
        </div>
      )}
      <div className="schedule-summary">
        <div>
          <small>Плановые сроки</small>
          <strong>
            {dateText(data.start)} — {dateText(data.end)}
          </strong>
        </div>
        <div>
          <small>Длительность / критический путь</small>
          <strong>
            {s.calculation.duration} / {s.calculation.length} <em>раб. дней</em>
          </strong>
        </div>
        <div>
          <small>Стоимость графика</small>
          <strong>
            {cash(data.budget, true)} <em>сум</em>
          </strong>
        </div>
        <div>
          <small>Готовность по стоимости</small>
          <strong>{s.progress}%</strong>
          <div className="progress-track">
            <i style={{ width: s.progress + "%" }} />
          </div>
        </div>
      </div>
      <div className="section-toolbar">
        <div>
          <h2>График выполнения</h2>
          <p>
            {s.incomplete_facts
              ? `${s.incomplete_facts} работ без записи факта. Готовность показана по известным данным.`
              : "Фактическое выполнение обновлено по всем работам."}
          </p>
        </div>
        <div className="heading-actions">
          {editable && (
            <>
              <label className="button">
                <Upload size={15} />
                Импорт
                <input
                  hidden
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f)
                      run(async () => {
                        const form = new FormData();
                        form.append("file", f);
                        const r = await api<{ tasks: Task[]; warning: string }>(
                          `/schedules/${s.id}/import`,
                          "POST",
                          form,
                        );
                        if (window.confirm(r.warning)) {
                          update({ tasks: r.tasks });
                          notify(
                            "Импорт проверен. Проверьте бюджет, сроки и зависимости перед сохранением.",
                          );
                        }
                      });
                  }}
                />
              </label>
              <button
                className="button"
                onClick={() =>
                  setTask({
                    id: crypto.randomUUID(),
                    title: "",
                    specialty: "232",
                    department: "",
                    author: "",
                    start: data.start,
                    end: data.start,
                    cost: "0",
                    dependencies: [],
                  })
                }
              >
                <Plus size={16} />
                Работа
              </button>
              <button
                className="button primary"
                disabled={!dirty || busy}
                onClick={() =>
                  run(async () =>
                    done(
                      await api<Schedule>(`/schedules/${s.id}`, "PUT", {
                        data,
                        edit_version: s.revision.edit_version,
                      }),
                    ),
                  )
                }
              >
                <Save size={16} />
                Сохранить{dirty ? " *" : ""}
              </button>
            </>
          )}
        </div>
      </div>
      {editable && (
        <div className="edit-metadata">
          <Field label="Начало графика">
            <input
              type="date"
              value={data.start}
              onChange={(e) => update({ start: e.target.value })}
            />
          </Field>
          <Field label="Окончание графика">
            <input
              type="date"
              value={data.end}
              onChange={(e) => update({ end: e.target.value })}
            />
          </Field>
          <Field label="Общий бюджет, сум">
            <input
              type="number"
              min="0"
              step=".01"
              value={data.budget}
              onChange={(e) => update({ budget: e.target.value })}
            />
          </Field>
          <Field label="Календарь">
            <select
              value={data.calendar.id}
              onChange={(e) => {
                const c = boot.calendars.find(
                  (c) => c.id === Number(e.target.value),
                );
                if (c)
                  update({
                    calendar: {
                      ...c.data,
                      id: c.id,
                      title: c.title,
                      is_demo: c.is_demo,
                    },
                  });
              }}
            >
              {boot.calendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
      <Gantt
        schedule={s}
        data={data}
        onTask={setTask}
        editable={editable}
        onMove={updateTask}
      />
      {s.calculation.errors.length > 0 && (
        <div className="validation-box">
          <strong>
            <TriangleAlert size={16} />
            Проверка перед утверждением
          </strong>
          {s.calculation.errors.map((x, i) => (
            <p key={i}>{x}</p>
          ))}
        </div>
      )}
      <div className="bottom-grid detail-bottom">
        <section className="panel">
          <div className="panel-heading">
            <h2>Передачи и контрольные точки</h2>
            <FlagIcon />
          </div>
          {data.tasks
            .filter((t) => t.milestone)
            .map((t) => (
              <button
                key={t.id}
                className="focus-row"
                onClick={() => setTask(t)}
              >
                <span className="event-diamond" />
                <div>
                  <strong>{t.title}</strong>
                  <small>
                    {t.department} → {t.recipient || "Получатель не указан"} ·{" "}
                    {dateText(t.end)}
                  </small>
                </div>
                <Badge
                  value={
                    s.facts[t.id]?.progress === 100 ? "completed" : "planned"
                  }
                />
              </button>
            ))}
          {!data.tasks.some((t) => t.milestone) && (
            <p className="muted padded">Контрольные точки ещё не добавлены.</p>
          )}
        </section>
        <section className="panel approval-panel">
          <div className="panel-heading">
            <h2>Согласование графика</h2>
            <ShieldCheck size={19} />
          </div>
          <div className="padded">
            {s.revision.reason && (
              <p className="form-hint">Основание: {s.revision.reason}</p>
            )}
            {editable ? (
              <>
                <p className="muted">
                  После утверждения версия фиксируется. Новые сроки согласуются
                  отдельной редакцией.
                </p>
                <div className="approval-actions">
                  <select
                    aria-label="Утверждающий"
                    value={approver}
                    onChange={(e) => setApprover(Number(e.target.value))}
                  >
                    {boot.users
                      .filter((u) => ["technical", "finance"].includes(u.role))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} · {roleText[u.role]}
                        </option>
                      ))}
                  </select>
                  <button
                    className="button primary"
                    disabled={dirty || busy}
                    onClick={() =>
                      run(() => act("submit", { approver_id: approver }))
                    }
                  >
                    <Send size={15} />
                    На утверждение
                  </button>
                </div>
              </>
            ) : s.revision.status === "review" &&
              s.revision.approver_id === boot.user.id ? (
              <div className="heading-actions">
                <button
                  className="button"
                  onClick={() => setReasonModal("return")}
                >
                  На доработку
                </button>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => run(() => act("approve"))}
                >
                  <Check size={16} />
                  Утвердить
                </button>
              </div>
            ) : (
              <>
                <p className="muted">
                  {s.revision.status === "review"
                    ? "Ожидает решения назначенного директора."
                    : s.revision.status === "approved"
                      ? "Утверждённая версия защищена от изменения."
                      : "Редакция возвращена на доработку."}
                </p>
                {boot.user.role === "gip" &&
                  ["approved", "returned"].includes(s.revision.status) && (
                    <button
                      className="button"
                      onClick={() => setReasonModal("revise")}
                    >
                      <Plus size={15} />
                      Новая редакция / продление
                    </button>
                  )}
              </>
            )}
          </div>
        </section>
      </div>
      <section className="panel versions">
        <div className="panel-heading">
          <h2>Версии графика</h2>
        </div>
        {s.versions.map((v) => (
          <button
            className="version-row"
            key={v.id}
            onClick={() =>
              run(async () => {
                if (dirty) throw new Error("Сначала сохраните изменения.");
                done(await api(`/schedules/${s.id}?revision=${v.id}`));
              })
            }
          >
            <span>Редакция {v.number}</span>
            <Badge value={v.status} />
            <small>
              {v.approved_at
                ? "Утверждена " + dateText(v.approved_at)
                : v.reason || "Первоначальное планирование"}
            </small>
            <ChevronRight size={15} />
          </button>
        ))}
      </section>
      {task && (
        <TaskModal
          task={task}
          schedule={s}
          data={data}
          editable={editable}
          canFact={
            boot.user.role === "coordinator" && s.revision.status === "approved"
          }
          close={() => setTask(null)}
          save={updateTask}
          remove={() => {
            if (
              data.tasks.some((t) =>
                t.dependencies.some((l) => l.from === task.id),
              )
            ) {
              notify("Сначала удалите зависимости от этой работы.");
              return;
            }
            update({ tasks: data.tasks.filter((t) => t.id !== task.id) });
            setTask(null);
          }}
          run={run}
          done={(r) => {
            done(r);
            setTask(null);
          }}
          today={boot.today}
        />
      )}
      {reasonModal && (
        <Modal
          title={
            reasonModal === "revise"
              ? "Основание новой редакции"
              : "Возврат на доработку"
          }
          onClose={() => setReasonModal("")}
        >
          <Field label="Причина">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </Field>
          <div className="modal-actions">
            <button
              className="button primary"
              disabled={!reason.trim() || busy}
              onClick={() =>
                run(async () => {
                  await act(reasonModal, { reason });
                  setReasonModal("");
                  setReason("");
                })
              }
            >
              Подтвердить
            </button>
          </div>
        </Modal>
      )}
      {showHistory && (
        <Modal title="История изменений" onClose={() => setShowHistory(false)}>
          <div className="history-list">
            {audit.map((a) => (
              <div key={a.id}>
                <span className="history-dot" />
                <strong>{a.action}</strong>
                <small>
                  {a.user} · {new Date(a.date).toLocaleString("ru-RU")}
                </small>
                {a.detail.reason && <p>{a.detail.reason}</p>}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
function FlagIcon() {
  return <GitBranch size={19} />;
}

function TaskModal({
  task,
  schedule,
  data,
  editable,
  canFact,
  close,
  save,
  remove,
  run,
  done,
  today,
}: {
  task: Task;
  schedule: Schedule;
  data: Payload;
  editable: boolean;
  canFact: boolean;
  close: () => void;
  save: (t: Task) => void;
  remove: () => void;
  run: (f: () => Promise<void>) => Promise<void>;
  done: (s: Schedule) => void;
  today: string;
}) {
  const [t, setT] = useState<Task>(structuredClone(task));
  const f = schedule.facts[task.id];
  const [fact, setFact] = useState({
    node_id: task.id,
    effective_date: today,
    progress: f?.progress || 0,
    actual_start: f?.actual_start || "",
    actual_end: f?.actual_end || "",
    reason: f?.reason || "",
  });
  const set = (key: string, value: unknown) =>
    setT((a) => ({ ...a, [key]: value }));
  return (
    <Modal
      title={
        editable
          ? task.title
            ? "Редактирование работы"
            : "Новая работа"
          : canFact
            ? "Фактическое выполнение"
            : task.title
      }
      onClose={close}
      wide
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (editable) save(t);
          else if (canFact)
            run(async () =>
              done(
                await api<Schedule>(
                  `/schedules/${schedule.id}/facts`,
                  "POST",
                  fact,
                ),
              ),
            );
          else close();
        }}
      >
        <div className="form-grid">
          <Field label="Наименование работы">
            <input
              required
              value={t.title}
              readOnly={!editable}
              onChange={(e) => set("title", e.target.value)}
            />
          </Field>
          <Field label="Шифр специальности">
            <input
              required
              value={t.specialty}
              readOnly={!editable}
              onChange={(e) => set("specialty", e.target.value)}
            />
          </Field>
          <Field label="Производственный отдел">
            <input
              required
              value={t.department}
              readOnly={!editable}
              onChange={(e) => set("department", e.target.value)}
            />
          </Field>
          <Field label="Автор раздела">
            <input
              required
              value={t.author}
              readOnly={!editable}
              onChange={(e) => set("author", e.target.value)}
            />
          </Field>
          <Field label="Плановое начало">
            <input
              type="date"
              required
              value={t.start}
              readOnly={!editable}
              onChange={(e) =>
                setT((x) => ({
                  ...x,
                  start: e.target.value,
                  ...(x.milestone ? { end: e.target.value } : {}),
                }))
              }
            />
          </Field>
          <Field label="Плановое окончание">
            <input
              type="date"
              required
              value={t.end}
              readOnly={!editable}
              onChange={(e) =>
                setT((x) => ({
                  ...x,
                  end: e.target.value,
                  ...(x.milestone ? { start: e.target.value } : {}),
                }))
              }
            />
          </Field>
          <Field label="Стоимость, сум">
            <input
              type="number"
              min="0"
              step=".01"
              value={t.cost ?? ""}
              readOnly={!editable}
              onChange={(e) => set("cost", e.target.value)}
            />
          </Field>
          <Field label="Тип работы">
            <select
              disabled={!editable}
              value={t.milestone ? "event" : "work"}
              onChange={(e) =>
                setT((x) => ({
                  ...x,
                  milestone: e.target.value === "event",
                  end: e.target.value === "event" ? x.start : x.end,
                }))
              }
            >
              <option value="work">Рабочий интервал</option>
              <option value="event">Передача / событие (0 дней)</option>
            </select>
          </Field>
        </div>
        {t.milestone && (
          <div className="form-grid">
            <Field label="Получатель задания">
              <input
                value={t.recipient || ""}
                readOnly={!editable}
                onChange={(e) => set("recipient", e.target.value)}
              />
            </Field>
            <Field label="Момент передачи">
              <select
                disabled={!editable}
                value={t.position || "end"}
                onChange={(e) => set("position", e.target.value)}
              >
                <option value="start">Начало рабочего дня</option>
                <option value="end">Конец рабочего дня</option>
              </select>
            </Field>
          </div>
        )}
        <div className="dependencies-form">
          <h3>Технологические зависимости</h3>
          {t.dependencies.map((l, i) => (
            <div className="dependency-edit" key={i}>
              <select
                disabled={!editable}
                value={l.from}
                onChange={(e) =>
                  set(
                    "dependencies",
                    t.dependencies.map((x, j) =>
                      i === j ? { ...x, from: e.target.value } : x,
                    ),
                  )
                }
              >
                {data.tasks
                  .filter((x) => x.id !== t.id)
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.specialty} · {x.title}
                    </option>
                  ))}
              </select>
              <select
                aria-label="Тип связи"
                disabled={!editable}
                value={l.type}
                onChange={(e) =>
                  set(
                    "dependencies",
                    t.dependencies.map((x, j) =>
                      i === j
                        ? { ...x, type: e.target.value as Link["type"] }
                        : x,
                    ),
                  )
                }
              >
                <option value="FS">Окончание → начало</option>
                <option value="SS">Начало → начало</option>
                <option value="FF">Окончание → окончание</option>
              </select>
              <input
                aria-label="Лаг в рабочих днях"
                type="number"
                min="0"
                max="365"
                value={l.lag}
                readOnly={!editable}
                onChange={(e) =>
                  set(
                    "dependencies",
                    t.dependencies.map((x, j) =>
                      i === j ? { ...x, lag: Number(e.target.value) } : x,
                    ),
                  )
                }
              />
              {editable && (
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Удалить связь"
                  onClick={() =>
                    set(
                      "dependencies",
                      t.dependencies.filter((_, j) => j !== i),
                    )
                  }
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
          {!t.dependencies.length && (
            <p className="form-hint">Входящие зависимости не заданы.</p>
          )}
          {editable && data.tasks.some((x) => x.id !== t.id) && (
            <button
              type="button"
              className="text-button"
              onClick={() =>
                set("dependencies", [
                  ...t.dependencies,
                  {
                    from: data.tasks.find((x) => x.id !== t.id)!.id,
                    type: "FS",
                    lag: 0,
                  },
                ])
              }
            >
              <Plus size={15} />
              Добавить связь
            </button>
          )}
        </div>
        {canFact && (
          <div className="fact-form">
            <h3>Факт на выбранную дату</h3>
            <div className="form-grid">
              <Field label="Дата состояния">
                <input
                  type="date"
                  required
                  max={today}
                  value={fact.effective_date}
                  onChange={(e) =>
                    setFact({ ...fact, effective_date: e.target.value })
                  }
                />
              </Field>
              <Field label="Готовность, %">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step=".01"
                  value={fact.progress}
                  onChange={(e) =>
                    setFact({ ...fact, progress: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Фактическое начало">
                <input
                  type="date"
                  max={fact.effective_date}
                  value={fact.actual_start}
                  onChange={(e) =>
                    setFact({ ...fact, actual_start: e.target.value })
                  }
                />
              </Field>
              <Field label="Фактическое окончание">
                <input
                  type="date"
                  max={fact.effective_date}
                  value={fact.actual_end}
                  onChange={(e) =>
                    setFact({ ...fact, actual_end: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Причина задержки / комментарий">
              <textarea
                rows={2}
                value={fact.reason}
                onChange={(e) => setFact({ ...fact, reason: e.target.value })}
              />
            </Field>
          </div>
        )}
        {!editable && !canFact && f && (
          <div className="fact-form">
            <strong>Готовность: {f.progress}%</strong>
            <p>{f.reason || "Комментарий не указан"}</p>
            <small>Состояние на {dateText(f.effective_date)}</small>
          </div>
        )}
        <div className="modal-actions">
          {editable && data.tasks.some((x) => x.id === task.id) && (
            <button type="button" className="button danger" onClick={remove}>
              <Trash2 size={15} />
              Удалить
            </button>
          )}
          <button type="button" className="button" onClick={close}>
            Закрыть
          </button>
          {(editable || canFact) && (
            <button className="button primary">
              <Check size={16} />
              {editable ? "Применить к черновику" : "Сохранить факт"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}

function Reports({
  boot,
  run,
  notify,
  open,
}: {
  boot: Boot;
  run: (f: () => Promise<void>) => Promise<void>;
  notify: (s: string) => void;
  open: (s: Schedule) => void;
}) {
  const [asOf, setAsOf] = useState(boot.today),
    [known, setKnown] = useState(""),
    [data, setData] = useState<Schedule[]>([]),
    [snapshots, setSnapshots] = useState<
      { id: string; title: string; created_at: string; count: number }[]
    >([]),
    [tab, setTab] = useState("portfolio");
  const query = `?as_of=${asOf}${known ? "&known_at=" + known : ""}`;
  async function refresh() {
    setData(await api("/reports" + query));
    setSnapshots(await api("/snapshots"));
  }
  useEffect(() => {
    run(refresh);
  }, []);
  const load: Record<
    string,
    { label: string; cost: number; count: number; progress: number }
  > = {};
  for (const s of data) {
    const seen = new Set<string>();
    for (const t of s.data.tasks) {
      if (t.cost === null) continue;
      const key = t.specialty;
      load[key] ??= { label: t.department, cost: 0, count: 0, progress: 0 };
      load[key].cost += Number(t.cost);
      if (!seen.has(key)) {
        load[key].count++;
        seen.add(key);
      }
    }
  }
  const max = Math.max(1, ...Object.values(load).map((x) => x.cost));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ОБЩАЯ КАРТИНА НА ВЫБРАННУЮ ДАТУ</div>
          <h1>Отчёты и загрузка</h1>
          <p>
            Утверждённые графики, отклонения и распределение работ по
            специальностям.
          </p>
        </div>
        <a className="button" href={"/api/reports/export" + query}>
          <ArrowDownToLine size={17} />
          Выгрузить Excel
        </a>
      </div>
      <section className="panel report-controls">
        <Field label="Дата состояния">
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
          />
        </Field>
        <Field label="Как было известно на дату (необязательно)">
          <input
            type="date"
            value={known}
            onChange={(e) => setKnown(e.target.value)}
          />
        </Field>
        <button className="button primary" onClick={() => run(refresh)}>
          <SlidersHorizontal size={16} />
          Сформировать
        </button>
        <button
          className="button"
          onClick={() =>
            run(async () => {
              await api("/snapshots" + query, "POST", {});
              await refresh();
              notify("Снимок отчёта сохранён");
            })
          }
        >
          <Save size={16} />
          Сохранить снимок
        </button>
      </section>
      <div className="tabs report-tabs">
        {[
          ["portfolio", "Сводный отчёт"],
          ["delays", "Просрочки"],
          ["load", "По специальностям"],
          ["snapshots", "Сохранённые снимки"],
        ].map(([k, t]) => (
          <button
            className={tab === k ? "selected" : ""}
            key={k}
            onClick={() => setTab(k)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "portfolio" && (
        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>График</th>
                  <th>Состояние</th>
                  <th>Готовность</th>
                  <th>Просрочено работ</th>
                  <th>Бюджет, сум</th>
                </tr>
              </thead>
              <tbody>
                {data.map((s) => (
                  <tr key={s.id} onClick={() => open(s)}>
                    <td>
                      <strong>{s.title}</strong>
                      <small>
                        {s.number} · Редакция {s.revision.number}
                      </small>
                    </td>
                    <td>
                      <Badge value={s.state} />
                    </td>
                    <td>{s.progress}%</td>
                    <td>{s.overdue_count || "—"}</td>
                    <td>{cash(s.data.budget)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.length && (
              <div className="empty">
                На эту дату нет утверждённых графиков.
              </div>
            )}
          </div>
        </section>
      )}
      {tab === "delays" && (
        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Работа / график</th>
                  <th>Специальность</th>
                  <th>Плановый срок</th>
                  <th>Готовность</th>
                  <th>Причина</th>
                </tr>
              </thead>
              <tbody>
                {data.flatMap((s) =>
                  s.data.tasks
                    .filter(
                      (t) =>
                        t.end < asOf && (s.facts[t.id]?.progress || 0) < 100,
                    )
                    .map((t) => (
                      <tr key={s.id + t.id}>
                        <td>
                          <strong>{t.title}</strong>
                          <small>{s.title}</small>
                        </td>
                        <td>
                          {t.specialty} · {t.department}
                        </td>
                        <td className="orange-text">{dateText(t.end)}</td>
                        <td>
                          {s.facts[t.id]?.progress ?? "Нет данных"}
                          {s.facts[t.id] ? "%" : ""}
                        </td>
                        <td>{s.facts[t.id]?.reason || "Причина не указана"}</td>
                      </tr>
                    )),
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "load" && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Распределение стоимости по специальностям</h2>
              <p>
                Объём действующих на дату планов. Это не оценка трудоёмкости или
                перегрузки отдела.
              </p>
            </div>
          </div>
          <div className="load-list">
            {Object.entries(load)
              .sort((a, b) => b[1].cost - a[1].cost)
              .map(([sp, l]) => (
                <div className="load-row" key={sp}>
                  <span className="specialty-code">{sp}</span>
                  <div>
                    <strong>{l.label}</strong>
                    <small>{l.count} графика</small>
                  </div>
                  <div className="load-bar">
                    <i style={{ width: (l.cost / max) * 100 + "%" }} />
                  </div>
                  <strong>
                    {cash(l.cost, true)} <small>сум</small>
                  </strong>
                </div>
              ))}
          </div>
        </section>
      )}
      {tab === "snapshots" && (
        <section className="panel">
          <div className="panel-heading">
            <h2>Зафиксированные отчёты</h2>
            <History size={20} />
          </div>
          {snapshots.map((s) => (
            <div className="snapshot-row" key={s.id}>
              <FileBarChart2 size={22} />
              <div>
                <strong>{s.title}</strong>
                <small>
                  {new Date(s.created_at).toLocaleString("ru-RU")} · {s.count}{" "}
                  графика
                </small>
              </div>
              <a className="button" href={`/api/snapshots/${s.id}/export`}>
                <ArrowDownToLine size={15} />
                Excel
              </a>
            </div>
          ))}
          {!snapshots.length && (
            <div className="empty">Сохраните первый снимок для планёрки.</div>
          )}
        </section>
      )}
    </>
  );
}

function Calendars({
  boot,
  run,
  reload,
  notify,
}: {
  boot: Boot;
  run: (f: () => Promise<void>) => Promise<void>;
  reload: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [create, setCreate] = useState(false),
    [v, setV] = useState({
      title: "Календарь 2026 · версия 1",
      start: "2026-01-01",
      end: "2026-12-31",
      holidays: "",
      working_days: "",
      source: "",
      verified: false,
    });
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ПЯТИДНЕВНАЯ РАБОЧАЯ НЕДЕЛЯ</div>
          <h1>Рабочий календарь</h1>
          <p>
            Версии календаря сохраняются вместе с графиками. Изменения не
            переписывают утверждённые сроки.
          </p>
        </div>
        {["coordinator", "technical"].includes(boot.user.role) && (
          <button className="button primary" onClick={() => setCreate(true)}>
            <Plus size={16} />
            Новая версия
          </button>
        )}
      </div>
      {boot.calendars.map((c) => (
        <section className="panel calendar-card" key={c.id}>
          <span className="soft-icon green">
            <CalendarDays size={24} />
          </span>
          <div>
            <h2>{c.title}</h2>
            <p>
              {dateText(c.data.start)} {c.data.start.slice(0, 4)} —{" "}
              {dateText(c.data.end)} {c.data.end.slice(0, 4)} · Пн–Пт
            </p>
            <small>
              {c.data.holidays.length} нерабочих исключений ·{" "}
              {c.data.working_days.length} рабочих выходных
            </small>
            <p className="form-hint">{c.data.source || "Источник не указан"}</p>
          </div>
          <span className={"badge " + (c.is_demo ? "draft" : "approved")}>
            <i />
            {c.is_demo ? "Учебный" : "Проверен ответственным"}
          </span>
        </section>
      ))}
      {create && (
        <Modal title="Новая версия календаря" onClose={() => setCreate(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await api("/calendars", "POST", {
                  ...v,
                  holidays: v.holidays.split(/[\s,;]+/).filter(Boolean),
                  working_days: v.working_days.split(/[\s,;]+/).filter(Boolean),
                });
                await reload();
                setCreate(false);
                notify("Версия календаря сохранена");
              });
            }}
          >
            <Field label="Название версии">
              <input
                required
                value={v.title}
                onChange={(e) => setV({ ...v, title: e.target.value })}
              />
            </Field>
            <div className="form-grid">
              <Field label="Начало периода">
                <input
                  type="date"
                  value={v.start}
                  onChange={(e) => setV({ ...v, start: e.target.value })}
                />
              </Field>
              <Field label="Конец периода">
                <input
                  type="date"
                  value={v.end}
                  onChange={(e) => setV({ ...v, end: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Нерабочие дни · ГГГГ-ММ-ДД, через запятую">
              <textarea
                rows={3}
                value={v.holidays}
                onChange={(e) => setV({ ...v, holidays: e.target.value })}
              />
            </Field>
            <Field label="Дополнительные рабочие выходные">
              <textarea
                rows={2}
                value={v.working_days}
                onChange={(e) => setV({ ...v, working_days: e.target.value })}
              />
            </Field>
            <Field label="Основание / ссылка на официальный источник">
              <input
                value={v.source}
                onChange={(e) => setV({ ...v, source: e.target.value })}
              />
            </Field>
            <label className="check-label">
              <input
                type="checkbox"
                checked={v.verified}
                onChange={(e) => setV({ ...v, verified: e.target.checked })}
              />
              Календарь проверен ответственным сотрудником
            </label>
            <div className="modal-actions">
              <button className="button primary">Сохранить версию</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
