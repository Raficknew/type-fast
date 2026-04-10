import test, { expect } from "@playwright/test";
import { ResultsPageModel } from "./models/ResultsPageModel";

test("results redirects home when race does not exist", async ({ page }) => {
  const model = new ResultsPageModel(page);
  const raceId = crypto.randomUUID();

  await model.goto(raceId);

  await expect(page).toHaveURL("/");
});
