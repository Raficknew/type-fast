import type { Page } from "@playwright/test";

export class ResultsPageModel {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(raceId: string) {
    await this.page.goto(`/results/${raceId}`);
  }
}
