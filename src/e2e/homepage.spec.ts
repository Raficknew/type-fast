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

  let completedGameLoop = false;
  let observedLocalProgress = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const initialRound =
      (await homePage.roundIndicator.textContent())?.trim() ?? "";
    const sentence = (await homePage.getSentence()).trim();
    expect(sentence.length).toBeGreaterThan(0);

    await homePage.focusTypingInput();
    await homePage.typingInput.fill("");
    const typedPrefix = sentence.slice(0, Math.min(5, sentence.length));
    if (typedPrefix.length > 0) {
      await homePage.typingInput.pressSequentially(typedPrefix);

      const hadLocalProgress = await expect
        .poll(
          async () => {
            const currentRound =
              (await homePage.roundIndicator.textContent())?.trim() ?? "";
            if (currentRound !== initialRound) {
              return true;
            }

            const inputValue = await homePage.typingInput.inputValue();
            if (inputValue.length > 0) {
              return true;
            }

            const progressValue = await homePage.getProgressValue();
            return progressValue > 0;
          },
          { timeout: 4000 },
        )
        .toBeTruthy()
        .then(() => true)
        .catch(() => false);

      observedLocalProgress = observedLocalProgress || hadLocalProgress;
      await homePage.typingInput.pressSequentially(
        sentence.slice(typedPrefix.length),
      );
    } else {
      await homePage.typingInput.pressSequentially(sentence);
    }

    const reachedExpectedState = await expect
      .poll(
        async () => {
          if (await homePage.typingInput.isDisabled()) {
            return true;
          }

          const currentRound =
            (await homePage.roundIndicator.textContent())?.trim() ?? "";
          return currentRound !== initialRound;
        },
        { timeout: 10_000 },
      )
      .toBeTruthy()
      .then(() => true)
      .catch(() => false);

    if (reachedExpectedState) {
      completedGameLoop = true;
      break;
    }
  }

  expect(observedLocalProgress).toBe(true);
  expect(completedGameLoop).toBe(true);
  await expect(homePage.roundIndicator).toBeVisible();
});
