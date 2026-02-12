import type { ToolDefinition } from "../utils/define-tool";
import addGuestTool from "./add-guest";
import addScheduleItemTool from "./add-schedule-item";
import addTaskTool from "./add-task";
import generateInvitationTextTool from "./generate-invitation-text";
import getFullScheduleTool from "./get-full-schedule";
import getPendingTasksTool from "./get-pending-tasks";
import setEventDetailsTool from "./set-event-details";
import tripadvisorVenueSearchTool from "./tripadvisor-venue-search";
import updateGuestStatusTool from "./update-guest-status";

export const toolDefinitions: ToolDefinition[] = [
  setEventDetailsTool,
  addGuestTool,
  updateGuestStatusTool,
  addTaskTool,
  getPendingTasksTool,
  addScheduleItemTool,
  getFullScheduleTool,
  generateInvitationTextTool,
  tripadvisorVenueSearchTool,
];
