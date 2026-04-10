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

  const sentence = (await homePage.getSentence()).trim();
  expect(sentence.length).toBeGreaterThan(0);

  const words = sentence.split(/\s+/);

  await homePage.focusTypingInput();
  for (let index = 0; index < words.length; index += 1) {
    const separator = index === words.length - 1 ? "" : " ";
    await page.keyboard.type(`${words[index]}${separator}`);
  }

  await expect(homePage.typingInput).toBeDisabled();
  await expect(homePage.roundIndicator).toBeVisible();
});
