import { createRoot } from "react-dom/client";
import { useWidgetProps } from "../hooks/use-widget-props";
import "./styles.css";

type RSVPStatus = "Pending" | "Yes" | "No" | "Maybe";

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

const EMPTY_DATA: DashboardData = {
  eventDetails: null,
  guests: [],
  tasks: [],
  pendingTasks: [],
  schedule: [],
  latestInvitation: null,
};

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

function App() {
  const output = useWidgetProps<ToolOutput>({
    view: "event",
    data: EMPTY_DATA,
  });
  const data = normalizeData(output.data);
  const activeView = output.view ?? "event";

  return (
    <div className="wedding-dashboard">
      <div className="rose-garland rose-garland-top" aria-hidden="true">
        <span className="rose bloom-lg" />
        <span className="rose bloom-sm" />
        <span className="rose bloom-md" />
      </div>

      <header className="wedding-header">
        <div>
          <p className="eyebrow">Wedding Planner MVP</p>
          <h1>Planning dashboard</h1>
          <p className="subtitle">A romantic overview for your special day</p>
        </div>
        <div className="active-view">Active view: {activeView}</div>
      </header>

      <section className={`card ${activeView === "event" ? "is-active" : ""}`}>
        <h2>Event details</h2>
        {data.eventDetails ? (
          <ul>
            <li>Date: {data.eventDetails.event_date}</li>
            <li>Location: {data.eventDetails.location}</li>
            <li>Budget: ${data.eventDetails.budget}</li>
          </ul>
        ) : (
          <p className="muted">No event details yet.</p>
        )}
      </section>

      <section className={`card ${activeView === "guests" ? "is-active" : ""}`}>
        <h2>Guests ({data.guests.length})</h2>
        {data.guests.length > 0 ? (
          <ul>
            {data.guests.map((guest) => (
              <li key={guest.id}>
                <span>{guest.name}</span>
                <span>{guest.contact}</span>
                <strong>{guest.rsvp_status}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No guests added.</p>
        )}
      </section>

      <section className={`card ${activeView === "tasks" ? "is-active" : ""}`}>
        <h2>Pending tasks ({data.pendingTasks.length})</h2>
        {data.pendingTasks.length > 0 ? (
          <ul>
            {data.pendingTasks.map((task) => (
              <li key={task.id}>
                <span>{task.title}</span>
                <span>{task.due_date}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No pending tasks.</p>
        )}
      </section>

      <section
        className={`card ${activeView === "schedule" ? "is-active" : ""}`}
      >
        <h2>Schedule ({data.schedule.length})</h2>
        {data.schedule.length > 0 ? (
          <ul>
            {data.schedule.map((item) => (
              <li key={item.id}>
                <span>{item.time}</span>
                <span>{item.description}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No schedule items yet.</p>
        )}
      </section>

      <section
        className={`card ${activeView === "invitation" ? "is-active" : ""}`}
      >
        <h2>Invitation text</h2>
        {data.latestInvitation ? (
          <div className="invitation">
            <p className="theme">Theme: {data.latestInvitation.theme}</p>
            <p>{data.latestInvitation.text}</p>
          </div>
        ) : (
          <p className="muted">No invitation text generated yet.</p>
        )}
      </section>

      <div className="rose-garland rose-garland-bottom" aria-hidden="true">
        <span className="rose bloom-md" />
        <span className="rose bloom-sm" />
        <span className="rose bloom-lg" />
      </div>
    </div>
  );
}

const root = document.getElementById("wedding-planner-dashboard-root");
if (root) {
  createRoot(root).render(<App />);
}
