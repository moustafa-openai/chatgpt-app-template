import { z } from "zod/v3";
import { defineTool } from "../utils/define-tool";

const pizzaMapInput = z.object({
  pizzaTopping: z.string().describe("Topping to mention when rendering the widget."),
});

export default defineTool({
  name: "pizza-map",
  title: "Show Pizza Map",
  description: "Render the pizza map widget.",
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
    destructiveHint: false,
  },
  input: pizzaMapInput,
  ui: "pizzaz",
  invoking: "Hand-tossing a map",
  invoked: "Served a fresh map",
  async handler(input) {
    return {
      content: [{ type: "text", text: "Rendered a pizza map!" }],
      structuredContent: {
        pizzaTopping: input.pizzaTopping,
      },
    };
  },
});
