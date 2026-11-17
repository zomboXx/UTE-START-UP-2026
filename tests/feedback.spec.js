import { test, expect } from '@playwright/test';

test('feedback keeps looping after interaction and joins the last card to the first', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const viewport = page.getByRole('region', { name: 'Dải phản hồi' });
  const track = viewport.locator('.feedback-track');
  await expect(viewport).toBeVisible();
  await viewport.scrollIntoViewIfNeeded();

  // Focus and touch previously disabled looping permanently.
  await viewport.focus();
  await viewport.dispatchEvent('pointerdown', { pointerType: 'touch' });
  await viewport.hover();
  await expect.poll(() => track.evaluate((node) => {
    const animation = node.getAnimations()[0];
    return animation?.playState;
  })).toBe('running');
  await expect(viewport).toHaveCSS('overflow-x', 'clip');

  async function inspectJoin(width) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => track.evaluate((node) => node.getAnimations().length)).toBe(1);
    const join = await track.evaluate((node) => {
      const animation = node.getAnimations()[0];
      const duration = animation.effect.getTiming().duration;
      const groups = node.querySelectorAll('.feedback-group');
      animation.pause();

      function firstCardLeft(group, time) {
        animation.currentTime = time;
        return group.firstElementChild.getBoundingClientRect().left;
      }

      // Just before the loop resets, the duplicate is where the original
      // returns just after the reset. Repeat for a second full cycle.
      const joins = [1, 2].map((cycle) => {
        const before = firstCardLeft(groups[1], cycle * duration - 1);
        const after = firstCardLeft(groups[0], cycle * duration + 1);
        return Math.abs(after - before);
      });
      animation.play();
      return { joins, iterations: animation.effect.getTiming().iterations };
    });
    expect(join.iterations).toBe(Infinity);
    for (const gap of join.joins) expect(gap).toBeLessThan(1);
    await expect(viewport).toHaveCSS('overflow-x', 'clip');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }

  await inspectJoin(1440);
  await inspectJoin(390);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(track).toHaveCSS('animation-name', 'none');
  await expect(viewport).toHaveCSS('overflow-x', 'auto');
  await expect(viewport.locator('.feedback-group[aria-hidden="true"]')).toBeHidden();
});
