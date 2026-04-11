import { expect, test } from "@playwright/test";
import { HomePageModel } from "./models/HomePageModel";

test("homepage can start and play the game loop", async ({ page }) => {
  const homePage = new HomePageModel(page);
  const nickname = `Player ${Date.now().toString().slice(-4)}`;

  await homePage.goto();

  const nicknameWasEdited = await homePage.setNickname(nickname);
  const displayedName = await homePage.getDisplayedName();

  expect(displayedName.length).toBeGreaterThan(0);
  if (nicknameWasEdited) {
    expect(displayedName).toBe(nickname);
  }

  if (await homePage.isStartButtonVisible()) {
    await homePage.startRace();
  }

  await homePage.waitForGameLoop();
  await expect(homePage.sentence).toBeVisible();
  const initialRound =
    (await homePage.roundIndicator.textContent())?.trim() ?? "";

  const sentence = (await homePage.getSentence()).trim();
  expect(sentence.length).toBeGreaterThan(0);

  await homePage.focusTypingInput();
  await homePage.typingInput.pressSequentially(sentence);

  await expect
    .poll(async () => {
      if (await homePage.typingInput.isDisabled()) {
        return true;
      }

      const currentRound =
        (await homePage.roundIndicator.textContent())?.trim() ?? "";
      return currentRound !== initialRound;
    })
    .toBeTruthy();
  await expect(homePage.roundIndicator).toBeVisible();
});
