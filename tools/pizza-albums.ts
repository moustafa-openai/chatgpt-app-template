import { z } from "zod/v3";
import { defineTool } from "../utils/define-tool";

const pizzaAlbumsInput = z.object({
  pizzaTopping: z.string().describe("Topping to mention when rendering the widget."),
});

export default defineTool({
  name: "pizza-albums",
  title: "Show Pizza Album",
  description: "Render the pizza album widget.",
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
    destructiveHint: false,
  },
  input: pizzaAlbumsInput,
  ui: "pizzaz-albums",
  invoking: "Hand-tossing an album",
  invoked: "Served a fresh album",
  async handler(input) {
    return {
      content: [{ type: "text", text: "Rendered a pizza album!" }],
      structuredContent: {
        pizzaTopping: input.pizzaTopping,
      },
    };
  },
});
