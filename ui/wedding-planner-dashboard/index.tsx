import { createRoot } from "react-dom/client";
import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDisplayMode } from "../hooks/use-display-mode";
import { useMaxHeight } from "../hooks/use-max-height";
import { useWidgetProps } from "../hooks/use-widget-props";
import "./styles.css";

type RSVPStatus = "Pending" | "Yes" | "No" | "Maybe";
type RSVPFilter = "all" | RSVPStatus;

type EventDetails = {
  event_date: string;
  location: string;
  budget: number;
};

type Guest = {
  id: string;
  name: string;
  contact: string;
  rsvp_status: RSVPStatus;
};

type Task = {
  id: string;
  title: string;
  due_date: string;
  status: "Pending";
};

type ScheduleItem = {
  id: string;
  time: string;
  description: string;
};

type InvitationDraft = {
  theme: string;
  text: string;
};

type DashboardData = {
  eventDetails: EventDetails | null;
  guests: Guest[];
  tasks: Task[];
  pendingTasks: Task[];
  schedule: ScheduleItem[];
  latestInvitation: InvitationDraft | null;
};

type DashboardView = "event" | "guests" | "tasks" | "schedule" | "invitation";

type ToolOutput = {
  view?: DashboardView;
  guest_id?: string;
  invitation_text?: string;
  data?: Partial<DashboardData>;
};

type PlannerTaskItem = {
  id: string;
  title: string;
  dueDate: string;
  source: "server" | "local";
};

const EMPTY_DATA: DashboardData = {
  eventDetails: null,
  guests: [],
  tasks: [],
  pendingTasks: [],
  schedule: [],
  latestInvitation: null,
};

const DEFAULT_PENDING_TASKS: Task[] = [
  {
    id: "task_1",
    title: "create guestlist",
    due_date: "",
    status: "Pending",
  },
  {
    id: "task_2",
    title: "find venue",
    due_date: "",
    status: "Pending",
  },
  {
    id: "task_3",
    title: "create schedule",
    due_date: "",
    status: "Pending",
  },
  {
    id: "task_4",
    title: "make invitations",
    due_date: "",
    status: "Pending",
  },
];

const RSVP_FILTERS: Array<{ label: string; value: RSVPFilter }> = [
  { label: "All", value: "all" },
  { label: "Accepted", value: "Yes" },
  { label: "Maybe", value: "Maybe" },
  { label: "No", value: "No" },
  { label: "Pending", value: "Pending" },
];

const INVITATION_TONES = ["romantic", "formal", "playful"] as const;

function normalizeData(partial?: Partial<DashboardData>): DashboardData {
  if (!partial) {
    return EMPTY_DATA;
  }

  return {
    eventDetails: partial.eventDetails ?? null,
    guests: partial.guests ?? [],
    tasks: partial.tasks ?? [],
    pendingTasks: partial.pendingTasks ?? [],
    schedule: partial.schedule ?? [],
    latestInvitation: partial.latestInvitation ?? null,
  };
}

function isPlaceholderValue(value?: string): boolean {
  if (!value) {
    return true;
  }

  return ["tbd", "n/a", "none", "unknown"].includes(value.trim().toLowerCase());
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "?";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function statusLabel(status: RSVPStatus): string {
  if (status === "Yes") {
    return "Accepted";
  }

  return status;
}

function formatSaveTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function buildFallbackInvitation(theme: string): string {
  if (theme === "formal") {
    return "Together with our families, we request the honor of your presence as we celebrate our wedding day.";
  }

  if (theme === "playful") {
    return "Save the date for laughs, happy tears, and one unforgettable dance floor. We would love to celebrate with you.";
  }

  return "With hearts full of love, we invite you to join us as we begin our forever together.";
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function mergeTaskItems(
  current: PlannerTaskItem[],
  incomingServerItems: PlannerTaskItem[],
): PlannerTaskItem[] {
  const serverMap = new Map(incomingServerItems.map((task) => [task.id, task]));
  const localItems = current.filter((task) => task.source === "local");

  const orderedServerFromCurrent = current
    .filter((task) => task.source === "server" && serverMap.has(task.id))
    .map((task) => serverMap.get(task.id))
    .filter((task): task is PlannerTaskItem => Boolean(task));

  const orderedServerIds = new Set(orderedServerFromCurrent.map((task) => task.id));
  const newServerItems = incomingServerItems.filter(
    (task) => !orderedServerIds.has(task.id),
  );

  return [...orderedServerFromCurrent, ...newServerItems, ...localItems];
}

function App() {
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const isFullscreen = displayMode === "fullscreen";

  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const output = useWidgetProps<ToolOutput>({
    view: "event",
    data: EMPTY_DATA,
  });
  const data = normalizeData(output.data);
  const activeView = output.view ?? "event";

  const baseTaskItems = useMemo(() => {
    const sourceTasks =
      data.pendingTasks.length > 0
        ? data.pendingTasks
        : data.tasks.length > 0
          ? data.tasks
          : DEFAULT_PENDING_TASKS;

    return sourceTasks.map((task) => ({
      id: task.id,
      title: task.title,
      dueDate: task.due_date,
      source: "server" as const,
    }));
  }, [data.pendingTasks, data.tasks]);

  const [taskItems, setTaskItems] = useState<PlannerTaskItem[]>(() => baseTaskItems);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(() => new Set());
  const [taskInput, setTaskInput] = useState("");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const [guestSearch, setGuestSearch] = useState("");
  const [guestFilter, setGuestFilter] = useState<RSVPFilter>("all");
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(
    output.guest_id ?? null,
  );
  const [isGuestComposerOpen, setGuestComposerOpen] = useState(false);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestContact, setNewGuestContact] = useState("");
  const [localGuests, setLocalGuests] = useState<Guest[]>([]);

  const [invitationTone, setInvitationTone] = useState<string>("romantic");
  const [invitationText, setInvitationText] = useState("");
  const [isGeneratingInvite, setGeneratingInvite] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const taskInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTaskItems((current) => mergeTaskItems(current, baseTaskItems));
  }, [baseTaskItems]);

  useEffect(() => {
    setCompletedTaskIds((current) => {
      const validIds = new Set(taskItems.map((task) => task.id));
      const next = new Set<string>();
      let changed = false;

      current.forEach((taskId) => {
        if (validIds.has(taskId)) {
          next.add(taskId);
        } else {
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [taskItems]);

  useEffect(() => {
    if (output.guest_id) {
      setSelectedGuestId(output.guest_id);
    }
  }, [output.guest_id]);

  useEffect(() => {
    if (!data.latestInvitation) {
      return;
    }

    setInvitationTone(data.latestInvitation.theme || "romantic");
    setInvitationText(data.latestInvitation.text);
    setSaveStatus("saved");
    setLastSavedAt(formatSaveTime(new Date()));
  }, [data.latestInvitation?.theme, data.latestInvitation?.text]);

  useEffect(() => {
    if (!invitationText.trim()) {
      return;
    }

    setSaveStatus("saving");
    const saveTimer = setTimeout(() => {
      setSaveStatus("saved");
      setLastSavedAt(formatSaveTime(new Date()));
    }, 450);

    return () => {
      clearTimeout(saveTimer);
    };
  }, [invitationText]);

  const guests = useMemo(() => [...data.guests, ...localGuests], [data.guests, localGuests]);

  const filteredGuests = useMemo(() => {
    const normalizedSearch = guestSearch.trim().toLowerCase();

    return guests.filter((guest) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        guest.name.toLowerCase().includes(normalizedSearch) ||
        guest.contact.toLowerCase().includes(normalizedSearch);
      const matchesFilter = guestFilter === "all" || guest.rsvp_status === guestFilter;

      return matchesSearch && matchesFilter;
    });
  }, [guestFilter, guestSearch, guests]);

  const completedTaskCount = taskItems.filter((task) => completedTaskIds.has(task.id)).length;
  const pendingTaskCount = Math.max(0, taskItems.length - completedTaskCount);

  const respondedGuestCount = guests.filter(
    (guest) => guest.rsvp_status !== "Pending",
  ).length;
  const venueBooked = Boolean(
    data.eventDetails && !isPlaceholderValue(data.eventDetails.location),
  );

  const taskProgress = taskItems.length > 0 ? completedTaskCount / taskItems.length : 0;
  const rsvpProgress = guests.length > 0 ? respondedGuestCount / guests.length : 0;
  const overallProgress = Math.round(
    clamp(taskProgress * 0.5 + rsvpProgress * 0.3 + (venueBooked ? 0.2 : 0), 0, 1) *
      100,
  );
  const actionItemsLeft = pendingTaskCount + (venueBooked ? 0 : 1);

  const totalBudget =
    data.eventDetails && data.eventDetails.budget > 0 ? data.eventDetails.budget : 5000;
  const spentRatio = clamp(0.12 + overallProgress / 150, 0.08, 0.9);
  const spentBudget = Math.round(totalBudget * spentRatio);
  const budgetProgress = Math.round((spentBudget / totalBudget) * 100);

  const budgetCategories = useMemo(() => {
    const venue = Math.round(spentBudget * 0.4);
    const catering = Math.round(spentBudget * 0.35);
    const flowers = Math.max(0, spentBudget - venue - catering);

    return [
      { label: "Venue", value: venue },
      { label: "Catering", value: catering },
      { label: "Flowers", value: flowers },
    ];
  }, [spentBudget]);

  const containerStyle: CSSProperties | undefined = maxHeight
    ? {
        maxHeight,
        height: isFullscreen ? maxHeight : undefined,
      }
    : undefined;

  const progressStyle: CSSProperties = {
    width: `${overallProgress}%`,
  };

  const budgetDonutStyle: CSSProperties = {
    ["--budget-progress" as string]: `${budgetProgress}%`,
  };

  async function requestDisplayMode(mode: "fullscreen" | "inline") {
    setFullscreenError(null);

    try {
      if (window?.openai?.requestDisplayMode) {
        await window.openai.requestDisplayMode({ mode });
        return;
      }

      if (window?.webplus?.requestDisplayMode) {
        await window.webplus.requestDisplayMode({ mode });
        return;
      }

      throw new Error("Display mode API is not available in this host.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to switch display mode.";
      setFullscreenError(message);
    }
  }

  async function handleShare() {
    const shareText = `Planning dashboard is ${overallProgress}% complete with ${actionItemsLeft} items left.`;

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: "Wedding planning dashboard",
          text: shareText,
        });
        setStatusMessage("Dashboard summary shared.");
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        setStatusMessage("Planning summary copied to clipboard.");
        return;
      }

      setStatusMessage("Share is unavailable in this host.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not share dashboard.";
      setStatusMessage(message);
    }
  }

  function handleNewItem() {
    taskInputRef.current?.focus();
    setStatusMessage("Ready to add a new task.");
  }

  function toggleChecklistTask(taskId: string) {
    setCompletedTaskIds((current) => {
      const next = new Set(current);

      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }

      return next;
    });
  }

  function moveTask(taskId: string, targetId: string) {
    if (taskId === targetId) {
      return;
    }

    setTaskItems((current) => {
      const fromIndex = current.findIndex((task) => task.id === taskId);
      const toIndex = current.findIndex((task) => task.id === targetId);

      if (fromIndex < 0 || toIndex < 0) {
        return current;
      }

      const next = [...current];
      const [moving] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moving);
      return next;
    });
  }

  function moveTaskByOffset(taskId: string, offset: number) {
    setTaskItems((current) => {
      const currentIndex = current.findIndex((task) => task.id === taskId);

      if (currentIndex < 0) {
        return current;
      }

      const targetIndex = clamp(currentIndex + offset, 0, current.length - 1);
      if (targetIndex === currentIndex) {
        return current;
      }

      const next = [...current];
      const [moving] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, moving);
      return next;
    });
  }

  function handleTaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = taskInput.trim();
    if (!title) {
      return;
    }

    const task: PlannerTaskItem = {
      id: `local_task_${Date.now()}`,
      title,
      dueDate: "",
      source: "local",
    };

    setTaskItems((current) => [task, ...current]);
    setTaskInput("");
    setStatusMessage(`Task added: ${title}`);
  }

  function handleAddGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = newGuestName.trim();
    const contact = newGuestContact.trim();

    if (!name || !contact) {
      setStatusMessage("Guest name and contact are required.");
      return;
    }

    const normalizedContact = contact.toLowerCase();
    const duplicate = guests.some(
      (guest) => guest.contact.trim().toLowerCase() === normalizedContact,
    );

    if (duplicate) {
      setStatusMessage(`A guest with contact ${contact} already exists.`);
      return;
    }

    const guest: Guest = {
      id: `local_guest_${Date.now()}`,
      name,
      contact,
      rsvp_status: "Pending",
    };

    setLocalGuests((current) => [guest, ...current]);
    setSelectedGuestId(guest.id);
    setNewGuestName("");
    setNewGuestContact("");
    setGuestComposerOpen(false);
    setStatusMessage(`Guest added: ${name}`);
  }

  async function handleGenerateInvitation() {
    setGeneratingInvite(true);

    try {
      if (window?.openai?.callTool) {
        const response = await window.openai.callTool("generateInvitationText", {
          theme: invitationTone,
        });

        if (response.result?.trim()) {
          setInvitationText(response.result.trim());
          setStatusMessage("Invitation draft generated.");
          return;
        }
      }

      setInvitationText(buildFallbackInvitation(invitationTone));
      setStatusMessage("Live generation unavailable, used a local draft.");
    } catch {
      setInvitationText(buildFallbackInvitation(invitationTone));
      setStatusMessage("Live generation unavailable, used a local draft.");
    } finally {
      setGeneratingInvite(false);
    }
  }

  function handleExportPdf() {
    if (typeof window !== "undefined") {
      window.print();
      setStatusMessage("Opening print dialog for PDF export.");
    }
  }

  const eventDate =
    data.eventDetails && !isPlaceholderValue(data.eventDetails.event_date)
      ? data.eventDetails.event_date
      : "TBD";
  const eventLocation =
    data.eventDetails && !isPlaceholderValue(data.eventDetails.location)
      ? data.eventDetails.location
      : "TBD";

  const eventCard = (
    <section
      className={`card card-event ${activeView === "event" ? "is-active" : ""}`}
      aria-labelledby="event-details-title"
    >
      <div className="card-header">
        <h2 id="event-details-title">Event details</h2>
        <button type="button" className="icon-btn" aria-label="Edit event details">
          Edit
        </button>
      </div>

      <ul className="detail-list" role="list">
        <li className="detail-row">
          <span className="detail-label">Date</span>
          <span className="detail-value">{eventDate}</span>
          <button type="button" className="icon-btn small" aria-label="Edit date">
            Edit
          </button>
        </li>
        <li className="detail-row">
          <span className="detail-label">Location</span>
          <span className="detail-value">{eventLocation}</span>
          <button type="button" className="icon-btn small" aria-label="Edit location">
            Edit
          </button>
        </li>
        <li className="detail-row">
          <span className="detail-label">Budget</span>
          <span className="detail-value">{formatUsd(totalBudget)}</span>
          <button type="button" className="icon-btn small" aria-label="Edit budget">
            Edit
          </button>
        </li>
      </ul>
    </section>
  );

  const progressCardMobile = (
    <section className="card card-progress-mobile" aria-labelledby="progress-mobile-title">
      <div className="card-header compact">
        <h2 id="progress-mobile-title">Progress</h2>
      </div>
      <p className="progress-copy">
        <strong>Planning: {overallProgress}% complete</strong>
        <span>{actionItemsLeft} items left</span>
      </p>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={overallProgress}
      >
        <span className="progress-fill" style={progressStyle} />
      </div>
    </section>
  );

  const tasksCard = (
    <section
      className={`card card-tasks ${activeView === "tasks" ? "is-active" : ""}`}
      aria-labelledby="pending-tasks-title"
    >
      <div className="card-header">
        <h2 id="pending-tasks-title">Pending tasks</h2>
        <span className="chip">{pendingTaskCount} open</span>
      </div>

      <form className="quick-add" onSubmit={handleTaskSubmit}>
        <label htmlFor="task-quick-add" className="sr-only">
          Add task
        </label>
        <input
          id="task-quick-add"
          ref={taskInputRef}
          value={taskInput}
          onChange={(event) => setTaskInput(event.target.value)}
          placeholder="Add task (press Enter to save)"
        />
      </form>

      {taskItems.length > 0 ? (
        <ul className="task-list" role="list">
          {taskItems.map((task, index) => {
            const isDone = completedTaskIds.has(task.id);

            return (
              <li
                key={task.id}
                className={`task-row ${isDone ? "is-done" : ""} ${
                  draggedTaskId === task.id ? "is-dragging" : ""
                }`}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  setDraggedTaskId(task.id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={() => {
                  if (draggedTaskId) {
                    moveTask(draggedTaskId, task.id);
                  }
                }}
                onDragEnd={() => {
                  setDraggedTaskId(null);
                }}
              >
                <label className="task-main">
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => toggleChecklistTask(task.id)}
                    aria-label={`Mark ${task.title} as complete`}
                  />
                  <span className="task-title">{task.title}</span>
                </label>
                <span className="task-meta">
                  {task.dueDate ? `Due ${task.dueDate}` : "No due date"}
                </span>
                <div className="task-controls">
                  <span className="drag-handle" aria-hidden="true">
                    ::
                  </span>
                  <button
                    type="button"
                    className="icon-btn tiny"
                    onClick={() => moveTaskByOffset(task.id, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${task.title} up`}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="icon-btn tiny"
                    onClick={() => moveTaskByOffset(task.id, 1)}
                    disabled={index === taskItems.length - 1}
                    aria-label={`Move ${task.title} down`}
                  >
                    Down
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">No pending tasks right now.</p>
      )}
    </section>
  );

  const guestsCard = (
    <section
      className={`card card-guests ${activeView === "guests" ? "is-active" : ""}`}
      aria-labelledby="guests-title"
    >
      <div className="card-header">
        <h2 id="guests-title">Guests ({guests.length})</h2>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setGuestComposerOpen((current) => !current)}
        >
          + Invite guest
        </button>
      </div>

      {isGuestComposerOpen ? (
        <form className="guest-composer" onSubmit={handleAddGuest}>
          <label htmlFor="guest-name" className="sr-only">
            Guest name
          </label>
          <input
            id="guest-name"
            value={newGuestName}
            onChange={(event) => setNewGuestName(event.target.value)}
            placeholder="Guest name"
          />
          <label htmlFor="guest-contact" className="sr-only">
            Guest email or phone
          </label>
          <input
            id="guest-contact"
            value={newGuestContact}
            onChange={(event) => setNewGuestContact(event.target.value)}
            placeholder="Email or phone"
          />
          <button type="submit" className="btn btn-primary btn-sm">
            Add
          </button>
        </form>
      ) : null}

      <label htmlFor="guest-search" className="sr-only">
        Find guest by name or email
      </label>
      <input
        id="guest-search"
        className="guest-search"
        value={guestSearch}
        onChange={(event) => setGuestSearch(event.target.value)}
        placeholder="Find guest by name or email"
      />

      <div className="guest-filter-row" role="toolbar" aria-label="Guest RSVP filters">
        {RSVP_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`chip-button ${guestFilter === filter.value ? "is-active" : ""}`}
            aria-pressed={guestFilter === filter.value}
            onClick={() => setGuestFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {filteredGuests.length > 0 ? (
        <ul className="guest-list" role="list">
          {filteredGuests.map((guest) => {
            const isSelected = selectedGuestId === guest.id;
            const statusClass = `rsvp-${guest.rsvp_status.toLowerCase()}`;

            return (
              <li
                key={guest.id}
                className={`guest-row ${isSelected ? "is-selected" : ""}`}
                onClick={() => setSelectedGuestId(guest.id)}
              >
                <span className="guest-avatar" aria-hidden="true">
                  {getInitials(guest.name)}
                </span>
                <span className="guest-meta">
                  <span className="guest-name">{guest.name}</span>
                  <span className="guest-contact">{guest.contact}</span>
                </span>
                <span className={`rsvp-pill ${statusClass}`}>{statusLabel(guest.rsvp_status)}</span>
                {isSelected ? (
                  <span className="guest-inline-actions">
                    <button
                      type="button"
                      className="icon-btn tiny"
                      onClick={(event) => {
                        event.stopPropagation();
                        setStatusMessage(`Message flow for ${guest.name} is ready.`);
                      }}
                    >
                      Message
                    </button>
                    <button
                      type="button"
                      className="icon-btn tiny"
                      onClick={(event) => {
                        event.stopPropagation();
                        setStatusMessage(`Remove flow for ${guest.name} is ready.`);
                      }}
                    >
                      Remove
                    </button>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">No guests match this filter yet.</p>
      )}
    </section>
  );

  const scheduleCard = (
    <section
      className={`card card-schedule ${activeView === "schedule" ? "is-active" : ""}`}
      aria-labelledby="schedule-title"
    >
      <div className="card-header">
        <h2 id="schedule-title">Schedule</h2>
        <button type="button" className="btn btn-ghost btn-sm">
          + Add item
        </button>
      </div>

      {data.schedule.length > 0 ? (
        <ol className="timeline" role="list">
          {data.schedule.map((item) => (
            <li key={item.id} className="timeline-item">
              <span className="timeline-time">{item.time}</span>
              <span className="timeline-dot" aria-hidden="true" />
              <span className="timeline-description">{item.description}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="empty-panel">
          <p className="muted">No schedule items yet.</p>
          <button type="button" className="btn btn-ghost btn-sm">
            + Add item
          </button>
        </div>
      )}
    </section>
  );

  const budgetCard = (
    <section className="card card-budget" aria-labelledby="budget-title">
      <div className="card-header">
        <h2 id="budget-title">Budget overview</h2>
        <button type="button" className="icon-btn" aria-label="Edit budget">
          Edit
        </button>
      </div>

      <p className="budget-summary">
        <strong>
          {formatUsd(spentBudget)} / {formatUsd(totalBudget)} used
        </strong>
      </p>

      <div
        className="progress-track small"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={budgetProgress}
        aria-label="Budget spend progress"
      >
        <span className="progress-fill" style={{ width: `${budgetProgress}%` }} />
      </div>

      <div className="budget-body">
        <ul className="budget-breakdown" role="list">
          {budgetCategories.map((item) => (
            <li key={item.label}>
              <span>{formatUsd(item.value)}</span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>

        <div className="budget-donut" style={budgetDonutStyle} aria-hidden="true">
          <span>{budgetProgress}%</span>
        </div>
      </div>

      <button type="button" className="btn btn-ghost btn-sm">
        Connect spreadsheet
      </button>
    </section>
  );

  const invitationCard = (
    <section
      className={`card card-invitation ${activeView === "invitation" ? "is-active" : ""}`}
      aria-labelledby="invitation-title"
    >
      <div className="card-header">
        <h2 id="invitation-title">Invitations</h2>
        <p className="autosave-state" aria-live="polite">
          {saveStatus === "saving"
            ? "Saving..."
            : lastSavedAt
              ? `Saved ${lastSavedAt}`
              : "Autosave on"}
        </p>
      </div>

      <label htmlFor="invitation-text" className="sr-only">
        Invitation text
      </label>
      <textarea
        id="invitation-text"
        value={invitationText}
        onChange={(event) => setInvitationText(event.target.value)}
        placeholder="Type your invitation message..."
      />

      <div className="invitation-actions">
        <label htmlFor="invitation-tone" className="tone-select">
          Tone
          <select
            id="invitation-tone"
            value={invitationTone}
            onChange={(event) => setInvitationTone(event.target.value)}
          >
            {INVITATION_TONES.map((tone) => (
              <option key={tone} value={tone}>
                {tone[0]?.toUpperCase()}
                {tone.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleGenerateInvitation}
          disabled={isGeneratingInvite}
        >
          {isGeneratingInvite ? "Generating..." : "Generate invitation ->"}
        </button>
      </div>
    </section>
  );

  return (
    <div
      className={`wedding-dashboard ${isFullscreen ? "is-fullscreen" : ""}`}
      style={containerStyle}
    >
      <header className="dashboard-hero">
        <div className="hero-main">
          <div className="brand-mark" aria-hidden="true">
            <span className="brand-dot dot-lg" />
            <span className="brand-dot dot-sm" />
            <span className="brand-dot dot-md" />
          </div>
          <p className="eyebrow">Wedding Planner MVP</p>
          <h1>Planning dashboard</h1>
          <p className="subtitle">A romantic overview for your special day</p>

          <div className="progress-inline" aria-live="polite">
            <p className="progress-copy">
              <strong>Planning: {overallProgress}% complete</strong>
              <span>{actionItemsLeft} items left</span>
            </p>
            <div
              className="progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={overallProgress}
            >
              <span className="progress-fill" style={progressStyle} />
            </div>
            <ul className="progress-metrics" role="list">
              <li>{`${completedTaskCount}/${taskItems.length || 0} tasks done`}</li>
              <li>{`${respondedGuestCount}/${guests.length || 0} RSVPs in`}</li>
              <li>{venueBooked ? "Venue booked" : "Venue pending"}</li>
            </ul>
          </div>
        </div>

        <div className="hero-actions">
          {isFullscreen ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => requestDisplayMode("inline")}
            >
              Exit fullscreen
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => requestDisplayMode("fullscreen")}
            >
              Enter fullscreen
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={handleShare}>
            Share
          </button>
          <button type="button" className="btn btn-primary" onClick={handleNewItem}>
            + New item
          </button>
        </div>
      </header>

      {fullscreenError ? (
        <p className="notice" role="status" aria-live="polite">
          {fullscreenError}
        </p>
      ) : null}

      <main className="dashboard-main">
        <section className="dashboard-column primary-column">
          {eventCard}
          {progressCardMobile}
          {tasksCard}
          {invitationCard}
        </section>

        <aside className="dashboard-column secondary-column">
          {guestsCard}
          {scheduleCard}
          {budgetCard}
        </aside>
      </main>

      <footer className="dashboard-toolbar">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setGuestComposerOpen(true)}
        >
          + Add guest
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleGenerateInvitation}
          disabled={isGeneratingInvite}
        >
          {isGeneratingInvite ? "Generating..." : "Generate invite"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={handleExportPdf}>
          Export PDF
        </button>
        <span className={`toolbar-progress ${overallProgress === 100 ? "is-complete" : ""}`}>
          {overallProgress}% complete - {actionItemsLeft} items left
        </span>
      </footer>

      <p className="sr-only" aria-live="polite" role="status">
        {statusMessage}
      </p>
    </div>
  );
}

const root = document.getElementById("wedding-planner-dashboard-root");
if (root) {
  createRoot(root).render(<App />);
}
