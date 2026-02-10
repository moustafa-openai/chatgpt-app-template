import { z } from "zod/v3";
import { defineTool } from "../utils/define-tool";

const pizzaCarouselInput = z.object({
  pizzaTopping: z.string().describe("Topping to mention when rendering the widget."),
});

export default defineTool({
  name: "pizza-carousel",
  title: "Show Pizza Carousel",
  description: "Render the pizza carousel widget.",
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
    destructiveHint: false,
  },
  input: pizzaCarouselInput,
  ui: "pizzaz-carousel",
  invoking: "Carousel some spots",
  invoked: "Served a fresh carousel",
  async handler(input) {
    return {
      content: [{ type: "text", text: "Rendered a pizza carousel!" }],
      structuredContent: {
        pizzaTopping: input.pizzaTopping,
      },
    };
  },
});
