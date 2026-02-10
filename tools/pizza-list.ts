import { z } from "zod/v3";
import { defineTool } from "../utils/define-tool";

const pizzaListInput = z.object({
  pizzaTopping: z.string().describe("Topping to mention when rendering the widget."),
});

export default defineTool({
  name: "pizza-list",
  title: "Show Pizza List",
  description: "Render the pizza list widget.",
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
    destructiveHint: false,
  },
  input: pizzaListInput,
  ui: "pizzaz-list",
  invoking: "Hand-tossing a list",
  invoked: "Served a fresh list",
  async handler(input) {
    return {
      content: [{ type: "text", text: "Rendered a pizza list!" }],
      structuredContent: {
        pizzaTopping: input.pizzaTopping,
      },
    };
  },
});
