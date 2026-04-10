import type { Page } from "@playwright/test";

export class HomePageModel {
  readonly page: Page;
  readonly startButton;
  readonly roundIndicator;
  readonly sentence;
  readonly typingInput;
  readonly editNicknameButton;
  readonly nicknameInput;
  readonly saveNicknameButton;
  readonly playerDisplayName;

  constructor(page: Page) {
    this.page = page;
    this.startButton = this.page.getByRole("button", { name: "Start Game" });
    this.roundIndicator = this.page.getByText(/^round \d+/i);
    this.sentence = this.page.getByTestId("game-sentence");
    this.typingInput = this.page.getByTestId("typing-input");
    this.editNicknameButton = this.page.getByTestId("edit-nickname-button");
    this.nicknameInput = this.page.getByPlaceholder("Enter new nickname");
    this.saveNicknameButton = this.page.getByRole("button", {
      name: "Save changes",
    });
    this.playerDisplayName = this.page.getByTestId("player-display-name");
  }

  async goto() {
    await this.page.goto("/");
  }

  async isStartButtonVisible() {
    return this.startButton.isVisible();
  }

  async setNickname(name: string) {
    if (await this.editNicknameButton.isVisible()) {
      await this.editNicknameButton.click();
      await this.nicknameInput.fill(name);
      await this.saveNicknameButton.click();
      await this.nicknameInput.waitFor({ state: "hidden" });
      return true;
    }

    return false;
  }

  async getDisplayedName() {
    await this.playerDisplayName.waitFor({ state: "visible" });
    return (await this.playerDisplayName.textContent())?.trim() ?? "";
  }

  async startRace() {
    await this.startButton.click();
  }

  async waitForGameLoop() {
    await this.roundIndicator.waitFor({ state: "visible" });
  }

  async getSentence() {
    return (await this.sentence.textContent()) ?? "";
  }

  async focusTypingInput() {
    await this.typingInput.focus();
  }
}
