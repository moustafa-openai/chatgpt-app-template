export type RSVPStatus = "Pending" | "Yes" | "No" | "Maybe";

export type EventDetails = {
  event_date: string;
  location: string;
  budget: number;
};

export type Guest = {
  id: string;
  name: string;
  contact: string;
  rsvp_status: RSVPStatus;
};

export type Task = {
  id: string;
  title: string;
  due_date: string;
  status: "Pending";
};

export type ScheduleItem = {
  id: string;
  time: string;
  description: string;
};

export type InvitationDraft = {
  theme: string;
  text: string;
};

type WeddingState = {
  eventDetails: EventDetails | null;
  guests: Guest[];
  tasks: Task[];
  schedule: ScheduleItem[];
  latestInvitation: InvitationDraft | null;
  nextGuestId: number;
  nextTaskId: number;
  nextScheduleId: number;
};

export type WeddingDashboardData = {
  eventDetails: EventDetails | null;
  guests: Guest[];
  tasks: Task[];
  pendingTasks: Task[];
  schedule: ScheduleItem[];
  latestInvitation: InvitationDraft | null;
};

const INITIAL_PENDING_TASKS: Task[] = [
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

const state: WeddingState = {
  eventDetails: null,
  guests: [],
  tasks: INITIAL_PENDING_TASKS.map((task) => ({ ...task })),
  schedule: [],
  latestInvitation: null,
  nextGuestId: 1,
  nextTaskId: INITIAL_PENDING_TASKS.length + 1,
  nextScheduleId: 1,
};

function cloneTask(task: Task): Task {
  return {
    id: task.id,
    title: task.title,
    due_date: task.due_date,
    status: task.status,
  };
}

function cloneGuest(guest: Guest): Guest {
  return {
    id: guest.id,
    name: guest.name,
    contact: guest.contact,
    rsvp_status: guest.rsvp_status,
  };
}

function cloneScheduleItem(item: ScheduleItem): ScheduleItem {
  return {
    id: item.id,
    time: item.time,
    description: item.description,
  };
}

function cloneEventDetails(details: EventDetails): EventDetails {
  return {
    event_date: details.event_date,
    location: details.location,
    budget: details.budget,
  };
}

function cloneInvitation(draft: InvitationDraft): InvitationDraft {
  return {
    theme: draft.theme,
    text: draft.text,
  };
}

export function setEventDetails(input: EventDetails): EventDetails {
  state.eventDetails = cloneEventDetails(input);
  return cloneEventDetails(state.eventDetails);
}

export function addGuest(input: { name: string; contact: string }): Guest {
  const normalizedInputContact = input.contact.trim().toLowerCase();
  const duplicate = state.guests.find(
    (guest) => guest.contact.trim().toLowerCase() === normalizedInputContact,
  );

  if (duplicate) {
    throw new Error(`Guest with contact "${input.contact}" already exists.`);
  }

  const guest: Guest = {
    id: `guest_${state.nextGuestId}`,
    name: input.name,
    contact: input.contact,
    rsvp_status: "Pending",
  };

  state.nextGuestId += 1;
  state.guests.push(guest);

  return cloneGuest(guest);
}

export function updateGuestStatus(
  guestId: string,
  rsvpStatus: RSVPStatus,
): Guest {
  const guest = state.guests.find((entry) => entry.id === guestId);

  if (!guest) {
    throw new Error(`Guest with id "${guestId}" was not found.`);
  }

  guest.rsvp_status = rsvpStatus;
  return cloneGuest(guest);
}

export function addTask(input: { title: string; due_date: string }): Task {
  const task: Task = {
    id: `task_${state.nextTaskId}`,
    title: input.title,
    due_date: input.due_date,
    status: "Pending",
  };

  state.nextTaskId += 1;
  state.tasks.push(task);

  return cloneTask(task);
}

export function getPendingTasks(): Task[] {
  return state.tasks
    .filter((task) => task.status === "Pending")
    .map((task) => cloneTask(task));
}

export function addScheduleItem(input: {
  time: string;
  description: string;
}): ScheduleItem {
  const item: ScheduleItem = {
    id: `schedule_${state.nextScheduleId}`,
    time: input.time,
    description: input.description,
  };

  state.nextScheduleId += 1;
  state.schedule.push(item);

  return cloneScheduleItem(item);
}

export function getFullSchedule(): ScheduleItem[] {
  return state.schedule.map((item) => cloneScheduleItem(item));
}

export function setLatestInvitation(theme: string, text: string): InvitationDraft {
  state.latestInvitation = {
    theme,
    text,
  };
  return cloneInvitation(state.latestInvitation);
}

export function getWeddingDashboardData(): WeddingDashboardData {
  return {
    eventDetails: state.eventDetails
      ? cloneEventDetails(state.eventDetails)
      : null,
    guests: state.guests.map((guest) => cloneGuest(guest)),
    tasks: state.tasks.map((task) => cloneTask(task)),
    pendingTasks: getPendingTasks(),
    schedule: state.schedule.map((item) => cloneScheduleItem(item)),
    latestInvitation: state.latestInvitation
      ? cloneInvitation(state.latestInvitation)
      : null,
  };
}
