import { expect, test } from "@playwright/test";

const routes = ["/", "/exhibition", "/news", "/events", "/people/management", "/people/volunteers", "/people/alumni", "/about", "/manual", "/history", "/instruments/telescope", "/instruments/equipment"];
const widths = [320, 390, 768, 1280];

for (const width of widths) {
  test.describe(`${width}px viewport`, () => {
    test.use({ viewport: { width, height: 900 } });
    for (const route of routes) {
      test(`${route} has no page-level horizontal overflow and one h1`, async ({ page }) => {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await expect(page.locator("h1")).toHaveCount(1);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }
  });
}

test("skip link moves keyboard focus to main content", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

test("mobile menu contains focus, closes with Escape, and restores focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const toggle = page.locator("[data-nav-toggle]");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".nav__mobile a").first()).toBeFocused();
  await expect(page.locator("main")).toHaveJSProperty("inert", true);
  await page.locator("[data-nav-close]").focus();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator(".nav__overlay a[href]").last()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#nav-overlay")).toBeHidden();
  await expect(toggle).toBeFocused();
});

test("exhibition filters announce the visible result count", async ({ page }) => {
  await page.goto("/exhibition", { waitUntil: "domcontentloaded" });
  const chip = page.locator('[data-filter="Comets"]');
  await chip.focus();
  await page.keyboard.press("Enter");
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-result-count]")).toHaveText("2");
  await expect(page.locator(".exgrid li:not([hidden])")).toHaveCount(2);
});

test("exhibition controls compact into a sticky search and filter rail", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/exhibition", { waitUntil: "domcontentloaded" });
  const tools = page.locator(".extools");
  await expect(tools).not.toHaveAttribute("data-stuck", "");
  await page.evaluate(() => {
    const toolbar = document.querySelector<HTMLElement>(".extools");
    if (toolbar) scrollTo(0, toolbar.getBoundingClientRect().top + scrollY + 300);
  });
  await expect(tools).toHaveAttribute("data-stuck", "");
  await expect(tools).toHaveCSS("position", "sticky");
  await expect.poll(() => tools.evaluate((toolbar) => getComputedStyle(toolbar, "::before").backdropFilter))
    .toBe("blur(24px) saturate(1.35)");
  const controlTops = await tools.evaluate((toolbar) => ({
    search: toolbar.querySelector(".exsearch")?.getBoundingClientRect().top ?? 0,
    filters: toolbar.querySelector(".exfilter")?.getBoundingClientRect().top ?? 0,
  }));
  expect(Math.abs(controlTops.search - controlTops.filters)).toBeLessThan(4);
  await expect(page.locator("[data-theme-toggle]")).toBeVisible();
});

test("exhibition controls do not reflow or clash at tablet and mobile widths", async ({ page }) => {
  await page.setViewportSize({ width: 767, height: 805 });
  await page.goto("/exhibition", { waitUntil: "domcontentloaded" });
  const tools = page.locator(".extools");
  const before = await tools.boundingBox();
  await page.evaluate(() => {
    const toolbar = document.querySelector<HTMLElement>(".extools");
    if (toolbar) scrollTo(0, toolbar.getBoundingClientRect().top + scrollY + 260);
  });
  await expect(tools).toHaveAttribute("data-stuck", "");
  const after = await tools.boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(Math.abs((before?.height ?? 0) - (after?.height ?? 0))).toBeLessThan(2);

  const layout = await tools.evaluate((toolbar) => {
    const search = toolbar.querySelector<HTMLElement>(".exsearch");
    const filters = toolbar.querySelector<HTMLElement>(".exfilter");
    const buttons = Array.from(filters?.querySelectorAll<HTMLElement>(".chip") ?? []);
    const separated = buttons.every((button, index) => {
      if (index === 0) return true;
      const previous = buttons[index - 1];
      return button.offsetLeft >= previous.offsetLeft + previous.offsetWidth + 7;
    });
    return {
      searchWidth: search?.getBoundingClientRect().width ?? 0,
      toolbarWidth: toolbar.getBoundingClientRect().width,
      separated,
      transition: getComputedStyle(toolbar).transitionProperty,
    };
  });
  expect(layout.searchWidth).toBeLessThanOrEqual(layout.toolbarWidth);
  expect(layout.separated).toBe(true);
  expect(layout.transition).not.toContain("padding");
  expect(layout.transition).not.toContain("backdrop-filter");
});

test("exhibition popup supports images, object navigation, and focus restoration", async ({ page }) => {
  await page.goto("/exhibition", { waitUntil: "domcontentloaded" });
  const trigger = page.locator('[data-object-open="ngc2023"]');
  await trigger.focus();
  await page.keyboard.press("Enter");

  const dialog = page.locator("[data-exmodal]");
  const image = page.locator("[data-exmodal-image]");
  await expect(dialog).toBeVisible();
  await expect(page.locator("[data-exmodal-close]")).toBeFocused();
  await expect(page.locator("[data-exmodal-title]")).toHaveText("Horsehead Nebula");
  await expect(page.locator(".exmodal__dot")).toHaveCount(2);
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
  const modalGeometry = await dialog.evaluate((element) => {
    const media = element.querySelector<HTMLElement>("[data-exmodal-media]")?.getBoundingClientRect();
    const next = element.querySelector<HTMLElement>("[data-exmodal-next]")?.getBoundingClientRect();
    return { mediaLeft: media?.left ?? 0, mediaRight: media?.right ?? 0, nextLeft: next?.left ?? 0, nextRight: next?.right ?? 0 };
  });
  expect(modalGeometry.nextLeft).toBeGreaterThan(modalGeometry.mediaLeft);
  expect(modalGeometry.nextRight).toBeLessThan(modalGeometry.mediaRight);

  const firstSource = await image.getAttribute("src");
  await page.locator(".exmodal__dot").nth(1).click();
  await expect(page.locator(".exmodal__dot").nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => image.getAttribute("src")).not.toBe(firstSource);

  await page.locator("[data-exmodal-zoom-in]").click();
  await expect(page.locator("[data-exmodal-zoom-label]")).toHaveText("125%");
  await expect(image).toHaveAttribute("style", /width: 125%/);
  await expect(page.locator("[data-exmodal-zoom-in] svg")).toBeVisible();
  await expect(page.locator("[data-exmodal-zoom-out] svg")).toBeVisible();
  const viewport = page.locator("[data-exmodal-viewport]");
  const panBefore = await viewport.evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop }));
  const viewportBox = await viewport.boundingBox();
  expect(viewportBox).not.toBeNull();
  await page.mouse.move((viewportBox?.x ?? 0) + (viewportBox?.width ?? 0) / 2, (viewportBox?.y ?? 0) + (viewportBox?.height ?? 0) / 2);
  await page.mouse.down();
  await page.mouse.move((viewportBox?.x ?? 0) + (viewportBox?.width ?? 0) / 2 - 70, (viewportBox?.y ?? 0) + (viewportBox?.height ?? 0) / 2 - 45, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => viewport.evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop }))).not.toEqual(panBefore);
  await page.locator("[data-exmodal-fullscreen]").click();
  await expect(dialog).toHaveAttribute("data-media-fullscreen", "");
  await expect(page.locator(".exmodal__details")).toBeHidden();
  await expect(page.locator("[data-exmodal-fullscreen] .exmodal__icon--exit")).toBeVisible();
  await page.locator("[data-exmodal-zoom-reset]").click();
  await expect(page.locator("[data-exmodal-zoom-label]")).toHaveText("100%");
  await page.locator("[data-exmodal-fullscreen]").click();
  await expect(dialog).not.toHaveAttribute("data-media-fullscreen", "");

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(/\/exhibition$/);

  await trigger.click();
  const objectSource = await image.getAttribute("src");
  await page.locator("[data-exmodal-next]").click();
  await expect(page.locator("[data-exmodal-title]")).not.toHaveText("Horsehead Nebula");
  await expect(page).toHaveURL(/\/exhibition\?object=/);
  await expect(image).toBeVisible();
  await expect.poll(() => image.getAttribute("src")).not.toBe(objectSource);

  await page.locator("[data-exmodal-prev]").click();
  await expect(page.locator("[data-exmodal-title]")).toHaveText("Horsehead Nebula");
  await expect(page.locator("[data-exmodal-media]")).not.toHaveAttribute("data-loading", "");
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
  await expect.poll(() => image.getAttribute("src")).toBe(objectSource);
  await expect(image).toHaveCSS("opacity", "1");
});

test("about content stays separated and the decorative orbit yields at tablet width", async ({ page }) => {
  await page.setViewportSize({ width: 803, height: 805 });
  await page.goto("/about", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".about-orbit__word")).toHaveCount(0);
  await expect(page.locator(".about-orbit")).toHaveCount(0);
  await expect(page.locator("[data-about-track]")).toHaveCSS("transform", "none");

  const layout = await page.locator(".about-inclusion__grid").evaluate((grid) => {
    const image = grid.querySelector<HTMLElement>(".about-inclusion__image")?.getBoundingClientRect();
    const copy = grid.querySelector<HTMLElement>(".about-inclusion__copy")?.getBoundingClientRect();
    return {
      imageHeight: image?.height ?? 0,
      imageBottom: image?.bottom ?? 0,
      copyTop: copy?.top ?? 0,
    };
  });

  expect(layout.imageHeight).toBeGreaterThan(400);
  expect(layout.copyTop).toBeGreaterThan(layout.imageBottom + 20);
});

test("legacy exhibition pages open the requested object in the popup", async ({ page }) => {
  await page.goto("/exhibition/ngc2023", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/exhibition\?object=ngc2023$/);
  await expect(page.locator("[data-exmodal]")).toBeVisible();
  await expect(page.locator("[data-exmodal-title]")).toHaveText("Horsehead Nebula");
});

test("desktop navigation exposes the requested hierarchy and theme control", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".nav__link")).toHaveText(["About", "People", "Instruments", "Exhibition", "News", "Events"]);
  await expect(page.locator("[data-dropdown-toggle]")).toHaveCount(3);
  await expect(page.locator('.nav__link[href="/exhibition"]')).toHaveAttribute("data-astro-reload", "true");
  await expect(page.locator("[data-theme-toggle]")).toHaveCount(1);
  await page.getByRole("button", { name: "People", exact: true }).click();
  await expect(page.locator('.nav__drop-link[href="/people/management"]')).toBeVisible();
  await expect(page.locator('.nav__drop-link[href="/people/volunteers"]')).toBeVisible();
  await expect(page.locator('.nav__drop-link[href="/people/alumni"]')).toBeVisible();

  await page.getByRole("button", { name: "About", exact: true }).click();
  await expect(page.locator('.nav__drop-link[href="/about"]')).toBeVisible();
  await page.getByRole("button", { name: "People", exact: true }).hover();
  await expect(page.locator('.nav__drop-link[href="/people/management"]')).toBeVisible();
  await expect(page.locator('.nav__drop-link[href="/about"]')).toBeHidden();
});

test("people sections are separate profile directories", async ({ page }) => {
  await page.setViewportSize({ width: 1156, height: 805 });
  for (const [path, title] of [
    ["/people/management", "Programme leadership"],
    ["/people/volunteers", "Current volunteers"],
    ["/people/alumni", "Volunteer alumni"],
  ] as const) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText(title);
    await expect(page.locator(".profile-card").first()).toBeVisible();
    await expect(page.locator(".profile-card__avatar").first()).toBeVisible();
    await expect(page.locator(`.people-directory-head a[href="${path}"]`)).toHaveClass(/active/);
  }
  await page.goto("/people/management", { waitUntil: "domcontentloaded" });
  await expect(page.locator('.profile-card__avatar--photo img[alt^="Portrait of"]')).toHaveCount(3);
  await expect.poll(() => page.locator('.profile-card__avatar--photo img').evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await expect.poll(() => page.locator('.profile-card__avatar--photo img').evaluateAll((images) => images.every((image) => {
    const imageRect = image.getBoundingClientRect();
    const avatarRect = image.parentElement?.getBoundingClientRect();
    return Boolean(avatarRect && imageRect.left >= avatarRect.left && imageRect.right <= avatarRect.right && imageRect.top >= avatarRect.top && imageRect.bottom <= avatarRect.bottom);
  }))).toBe(true);
  const cardLayout = await page.locator(".profile-card").first().evaluate((card) => {
    const cardRect = card.getBoundingClientRect();
    const avatarRect = card.querySelector<HTMLElement>(".profile-card__avatar")?.getBoundingClientRect();
    const titleRect = card.querySelector<HTMLElement>("h2")?.getBoundingClientRect();
    return {
      cardHeight: cardRect.height,
      avatarInside: Boolean(avatarRect && avatarRect.top >= cardRect.top && avatarRect.bottom <= cardRect.bottom),
      titleBelowAvatar: Boolean(avatarRect && titleRect && titleRect.top >= avatarRect.bottom),
      background: getComputedStyle(card).backgroundColor,
    };
  });
  expect(cardLayout.cardHeight).toBeGreaterThan(360);
  expect(cardLayout.cardHeight).toBeLessThan(500);
  expect(cardLayout.avatarInside).toBe(true);
  expect(cardLayout.titleBelowAvatar).toBe(true);
  expect(cardLayout.background).not.toBe("rgba(0, 0, 0, 0)");
  await expect(page.locator(".profile-card").first()).not.toContainText("Based in");
  await expect(page.locator("body")).not.toContainText("CASSA profile");
  const moreButton = page.locator("[data-profile-open]").first();
  await moreButton.click();
  await expect(page.locator("[data-profile-modal]")).toBeVisible();
  await expect(page.locator("[data-profile-name]")).toHaveText("Dr. Lamiya Ashraf Mowla");
  await expect(page.locator("[data-profile-details] dt")).toContainText(["Current appointment", "Education", "Postdoctoral training", "Research", "Programmes"]);
  await expect(page.locator("[data-profile-close]")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-profile-modal]")).not.toBeVisible();
  await expect(moreButton).toBeFocused();
});

test("the Exhibition tab opens the collection and About opens its own page", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/#about", { waitUntil: "domcontentloaded" });
  await page.locator('.nav__link[href="/exhibition"]').click();
  await expect(page).toHaveURL(/\/exhibition$/);
  await expect(page.locator("h1")).toHaveText("An exhibition of deep space");

  await page.getByRole("button", { name: "About", exact: true }).click();
  await page.locator('.nav__drop-link[href="/about"]').click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.locator("h1")).toContainText("The sky belongs");
});

test("News and Events are separate editorial sections", async ({ page }) => {
  await page.goto("/news", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1")).toContainText("Stories from");
  await expect(page.locator('.news-all[href="#all-stories"]')).toBeVisible();
  await expect(page.locator(".news-card")).toHaveCount(2);
  await page.goto("/events", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1")).toContainText("Events &");
  await expect(page.locator(".calendar")).toBeVisible();
  await expect(page.locator(".event-year").first()).toBeVisible();
});

test("the theme toggle persists light and dark mode while brand navigation uses a client transition", async ({ page }) => {
  await page.goto("/people", { waitUntil: "domcontentloaded" });
  const toggle = page.locator("[data-theme-toggle]");
  await expect(toggle).toHaveAttribute("aria-label", "Switch to light mode");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.locator("[data-theme-toggle]").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const navigationEntries = await page.evaluate(() => performance.getEntriesByType("navigation").length);
  await page.locator(".nav__brand").click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("h1")).toHaveText("Durbin");
  await expect.poll(() => page.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(navigationEntries);
});

test("clicking the Durbin logo on home reinitializes video and section reveals", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const navigationEntries = await page.evaluate(() => performance.getEntriesByType("navigation").length);
  await page.locator("[data-hero-video]").evaluate((video) => video.setAttribute("data-pre-transition", ""));

  await page.locator(".nav__brand").click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(navigationEntries);
  await expect(page.locator("[data-hero-video]")).not.toHaveAttribute("data-pre-transition", "");
  await expect.poll(() => page.locator("[data-hero-video]").evaluate((video: HTMLVideoElement) => video.paused)).toBe(false);

  await page.locator("#about").scrollIntoViewIfNeeded();
  await expect(page.locator("#about")).toHaveClass(/is-flow-in/);
  await expect(page.locator("#about [data-reveal]").first()).toHaveClass(/is-in/);
  await expect(page.locator("#about")).toHaveCSS("opacity", "1");
});

test("navigation transitions on every page and the footer stays minimal", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".nav__bar")).toHaveCSS("box-shadow", "none");
  await expect(page.locator(".nav__bar")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(page.locator(".nav__bar")).toHaveCSS("backdrop-filter", "none");
  const initialNav = await page.locator(".nav__bar").evaluate((bar) => {
    const box = bar.getBoundingClientRect();
    return { top: box.top, left: box.left, right: innerWidth - box.right };
  });
  expect(initialNav.top).toBeGreaterThan(8);
  expect(initialNav.left).toBeGreaterThan(40);
  expect(Math.abs(initialNav.left - initialNav.right)).toBeLessThan(1);
  await page.evaluate(() => window.scrollTo(0, 100));
  await expect(page.locator(".nav__name")).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(page.locator(".nav__link").first()).toHaveCSS("color", "rgba(255, 255, 255, 0.84)");
  await page.evaluate(() => window.scrollTo(0, window.innerHeight));
  await expect(page.locator("[data-nav]")).toHaveAttribute("data-scrolled", "");
  await expect(page.locator(".nav__name")).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect.poll(
    () => page.locator(".nav__bar").evaluate((bar) => getComputedStyle(bar).backdropFilter),
    { timeout: 2000 },
  ).toContain("24px");

  const surface = await page.locator(".nav__bar").evaluate((bar) => {
    const box = bar.getBoundingClientRect();
    const style = getComputedStyle(bar);
    return {
      width: box.width,
      centre: box.left + box.width / 2,
      backdrop: style.backdropFilter,
      transitionDuration: style.transitionDuration,
      transitionProperty: style.transitionProperty,
      boxShadow: style.boxShadow,
      background: style.backgroundColor,
      borderWidth: style.borderTopWidth,
    };
  });
  expect(surface.width).toBeLessThan(1100);
  expect(Math.abs(surface.centre - 640)).toBeLessThan(1);
  expect(surface.backdrop).toContain("blur");
  expect(surface.backdrop).toContain("24px");
  expect(surface.transitionProperty).toContain("width");
  expect(surface.transitionDuration).toContain("0.82s");

  await expect(page.locator("footer nav")).toHaveCount(0);
  await expect(page.locator(".foot__partner")).toHaveCount(4);
  await expect(page.locator(".foot__support")).toHaveCSS("background-color", "rgba(255, 255, 255, 0.08)");
  await expect(page.locator(".foot__support")).toHaveCSS("backdrop-filter", "blur(24px) saturate(1.3)");
  await expect(page.locator(".foot__support")).toHaveCSS("border-top-width", "0px");
  await expect(page.locator(".glance-card__surface")).toHaveCSS("border-radius", "32px");
  const eyebrowType = await page.locator(".urow__meta").first().evaluate((row) => ({
    family: getComputedStyle(row).fontFamily,
    tracking: getComputedStyle(row).letterSpacing,
  }));
  expect(eyebrowType.family).toContain("Inter");
  expect(["normal", "0px"]).toContain(eyebrowType.tracking);
  await expect(page.locator("footer")).not.toContainText("All Durbin images are licensed");
  await expect(page.locator(".foot__base")).toHaveCount(0);
  await expect(page.locator(".join__cta .btn")).toHaveCount(2);
  await expect(page.locator(".join__cta .btn").nth(0)).toHaveCSS("border-radius", "14px");
  await expect(page.locator(".join__cta .btn").nth(1)).toHaveCSS("border-radius", "14px");
  await expect(page.locator(".hh__cta")).toHaveCSS("column-gap", "16px");
  await expect(page.locator(".join__cta")).toHaveCSS("column-gap", "16px");
  const joinButtons = await page.locator(".join__cta .btn").evaluateAll((buttons) =>
    buttons.map((button) => {
      const box = button.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }),
  );
  expect(joinButtons).toHaveLength(2);
  expect(Math.abs(joinButtons[0].width - joinButtons[1].width)).toBeLessThan(1);
  expect(Math.abs(joinButtons[0].height - joinButtons[1].height)).toBeLessThan(1);
  expect(Math.abs(joinButtons[0].height - 52)).toBeLessThan(1);
  await expect(page.locator(".join__cta .btn").nth(0)).toHaveCSS("border-top-width", "0px");
  await expect(page.locator(".join__cta .btn").nth(1)).toHaveCSS("border-top-width", "0px");
  await expect(page.locator(".join__cta .btn--solid")).toHaveCSS("color", "rgb(10, 10, 10)");
  await expect(page.locator(".join__cta .btn--solid")).toHaveCSS("background-color", "rgb(255, 255, 255)");

  const heroButtons = await page.locator(".hh__cta .btn").evaluateAll((buttons) =>
    buttons.map((button) => {
      const box = button.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }),
  );
  expect(heroButtons).toHaveLength(2);
  expect(Math.abs(heroButtons[0].width - heroButtons[1].width)).toBeLessThan(1);
  expect(Math.abs(heroButtons[0].height - heroButtons[1].height)).toBeLessThan(1);
  expect(Math.abs(heroButtons[0].height - 52)).toBeLessThan(1);
  await expect(page.locator(".hh__cta .btn").nth(0)).toHaveCSS("border-top-width", "0px");
  await expect(page.locator(".hh__cta .btn").nth(1)).toHaveCSS("border-top-width", "0px");
  await expect(page.locator(".hh__cta .btn--solid")).toHaveCSS("color", "rgb(10, 10, 10)");
  await expect(page.locator(".hh__cta .btn--solid")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator(".hh__eyebrow")).toHaveClass(/chip/);
  await expect(page.locator(".hh__eyebrow")).toHaveCSS("border-top-width", "0px");
  await expect(page.locator(".hh__eyebrow")).toHaveCSS("backdrop-filter", "blur(28px) saturate(1.8)");
  await expect(page.locator(".hh__sub")).toHaveCount(0);
  await expect(page.locator(".hero__lede")).toContainText(
    "Citizens of a distant universe. The cosmos through the eyes of student volunteers",
  );
  await expect(page.locator('a.urow[href="/events/bdoaa-womens-camp"] .urow__thumb')).toHaveCount(1);
  await expect(page.locator('.about__text a[href="/about"]')).toHaveText(/See more/);

  await page.evaluate(() => window.scrollTo(0, 0));
  const aboutAlignment = await page.locator("#about").evaluate((section) => {
    const text = section.querySelector<HTMLElement>(".about__text");
    const aside = section.querySelector<HTMLElement>(".about__aside");
    return {
      textTop: text?.getBoundingClientRect().top ?? 0,
      cardTop: aside?.getBoundingClientRect().top ?? 0,
    };
  });
  expect(Math.abs(aboutAlignment.textTop - aboutAlignment.cardTop)).toBeLessThan(2);

  await expect(page.locator(".plate").first()).toHaveCSS("border-top-color", "rgba(255, 255, 255, 0.075)");
  await expect(page.locator(".foot__video source")).toHaveAttribute(
    "src",
    "/videos/pixabay-moon-night-217245.mp4",
  );
  await expect(page.locator(".foot__video")).toHaveAttribute(
    "poster",
    "/videos/pixabay-moon-night-217245.jpg",
  );
  await expect(page.locator(".foot__video")).toHaveCSS("object-fit", "contain");

  await page.goto("/news", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-nav]")).not.toHaveAttribute("data-scrolled", "");
  await page.evaluate(() => window.scrollTo(0, 120));
  await expect(page.locator("[data-nav]")).toHaveAttribute("data-scrolled", "");
});

test("the About page presents the programme story and clear next steps", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/about", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1")).toContainText("The sky belongs");
  await expect(page.locator(".about-facts__grid li")).toHaveCount(4);
  await expect(page.locator(".about-timeline li")).toHaveCount(4);
  await expect(page.locator(".about-mosaic figure")).toHaveCount(4);
  await expect(page.locator(".about-path__grid li")).toHaveCount(4);
  await expect(page.locator('.about-close__actions a[href="/exhibition"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "About", exact: true })).toHaveClass(/is-active/);
  await expect(page.locator(".about-design")).toHaveCount(0);
  await expect(page.locator(".about-hero")).toHaveCSS("background-color", "rgb(3, 7, 8)");
  await expect(page.locator(".about-hero .btn--solid")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator("[data-about-video]")).toHaveAttribute("autoplay", "");
  await expect(page.locator("[data-about-video] source").first()).toHaveAttribute("src", "/videos/215695.mp4");
  await expect(page.locator("[data-about-video] source")).toHaveCount(1);
  await expect.poll(() => page.locator("[data-about-video]").evaluate((video: HTMLVideoElement) => video.readyState)).toBeGreaterThanOrEqual(1);
  await expect(page.locator(".about-marquee")).toBeVisible();
  await expect(page.locator(".about-marquee span")).toHaveText(["Observe the unseen", "Learn together", "Interpret the light", "Share the sky"]);
  const horizontal = page.locator("[data-about-horizontal]");
  await expect.poll(() => horizontal.evaluate((node) => node.offsetHeight > innerHeight * 2)).toBe(true);
  await horizontal.evaluate((node) => scrollTo(0, node.getBoundingClientRect().top + scrollY + (node.offsetHeight - innerHeight) * .45));
  await expect.poll(() => page.locator("[data-about-track]").evaluate((node) => getComputedStyle(node).transform)).not.toBe("none");
  await expect(page.locator(".about-field")).not.toHaveCSS("position", "fixed");
  await expect(page.locator(".about-field")).not.toHaveCSS("position", "sticky");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("history timeline responds to scrolling and instrument sections are reachable", async ({ page }) => {
  await page.goto("/history", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-timeline-card][data-active] h3")).toHaveText("A telescope becomes a public mission");
  await expect(page.locator("[data-timeline-prev], [data-timeline-next]")).toHaveCount(0);
  await page.evaluate(() => {
    const section = document.querySelector<HTMLElement>("[data-timeline-section]");
    if (!section) return;
    const top = section.getBoundingClientRect().top + scrollY;
    const range = Math.max(1, section.offsetHeight - innerHeight);
    scrollTo(0, top + range / 4);
  });
  await expect.poll(() => page.locator("[data-timeline-card][data-active] h3").textContent()).toBe("Durbin launches at IUB");
  await page.goto("/instruments/telescope", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".instrument")).toHaveCount(3);
  await expect(page.locator("h1")).toContainText("Light, gathered");
});

test("article lightbox traps and restores keyboard focus", async ({ page }) => {
  await page.goto("/news/asman-jominer-golpo-1", { waitUntil: "domcontentloaded" });
  const trigger = page.locator("[data-lightbox-trigger]").first();
  await expect(trigger).toBeVisible();
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#lightbox")).toBeVisible();
  await expect(page.locator("[data-lightbox-close]")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#lightbox")).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
