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

test("navigation hides while scrolling down and returns while scrolling up", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/news", { waitUntil: "domcontentloaded" });
  const nav = page.locator("[data-nav]");
  await page.waitForTimeout(100);
  await page.evaluate(() => scrollTo(0, 120));
  await expect(nav).toHaveAttribute("data-scroll-hidden", "");
  await page.evaluate(() => scrollBy(0, 240));
  await expect(nav).toHaveAttribute("data-scroll-hidden", "");
  await page.mouse.wheel(0, -80);
  await expect(nav).not.toHaveAttribute("data-scroll-hidden", "");
  await page.evaluate(() => scrollTo(0, 0));
  await expect(nav).not.toHaveAttribute("data-scroll-hidden", "");
});

test("mobile menu contains focus, closes with Escape, and restores focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("[data-theme-toggle]").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const toggle = page.locator("[data-nav-toggle]");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#nav-overlay")).toHaveCSS("background-color", "rgb(243, 242, 237)");
  await expect(page.locator(".nav__mobile a").first()).toHaveCSS("color", "rgb(17, 23, 22)");
  await expect.poll(() => page.locator("#nav-overlay").evaluate((overlay) => overlay.getBoundingClientRect().height >= innerHeight)).toBe(true);
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

test("exhibition controls replace the nav while scrolling down and coexist while scrolling up", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/exhibition", { waitUntil: "domcontentloaded" });
  const tools = page.locator(".extools");
  await expect(tools).toHaveCSS("position", "relative");
  const before = await tools.boundingBox();
  const controlTops = await tools.evaluate((toolbar) => ({
    search: toolbar.querySelector(".exsearch")?.getBoundingClientRect().top ?? 0,
    filters: toolbar.querySelector(".exfilter")?.getBoundingClientRect().top ?? 0,
  }));
  expect(Math.abs(controlTops.search - controlTops.filters)).toBeLessThan(4);
  const contact = await page.evaluate(() => {
    const toolbar = document.querySelector<HTMLElement>("[data-extools-dock]");
    const nav = document.querySelector<HTMLElement>("[data-nav]");
    const navBar = nav?.querySelector<HTMLElement>(".nav__bar");
    const navTop = nav ? Number.parseFloat(getComputedStyle(nav).paddingTop) || 11 : 11;
    return {
      toolbarTop: (toolbar?.getBoundingClientRect().top ?? 0) + scrollY,
      stackTop: navTop + (navBar?.offsetHeight ?? 59) - 1,
    };
  });
  await page.evaluate(({ toolbarTop, stackTop }) => scrollTo(0, toolbarTop - stackTop - 4), contact);
  await expect(tools).not.toHaveAttribute("data-docked", "");
  await page.evaluate(({ toolbarTop, stackTop }) => scrollTo(0, toolbarTop - stackTop + 4), contact);
  await expect(tools).toHaveAttribute("data-docked", "");
  await page.evaluate(() => {
    const toolbar = document.querySelector<HTMLElement>(".extools");
    if (toolbar) scrollTo(0, toolbar.getBoundingClientRect().top + scrollY + 300);
  });
  await expect(tools).toHaveAttribute("data-docked", "");
  await expect(tools).toHaveCSS("position", "fixed");
  await expect(page.locator("[data-nav]")).toHaveAttribute("data-scroll-hidden", "");
  await expect.poll(async () => (await tools.boundingBox())?.y ?? 999).toBeLessThan(20);

  await page.mouse.wheel(0, -90);
  await expect(tools).toHaveAttribute("data-nav-visible", "");
  await expect(page.locator("[data-nav]")).not.toHaveAttribute("data-scroll-hidden", "");
  await expect.poll(() => page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>(".nav__bar")?.getBoundingClientRect();
    const toolbar = document.querySelector<HTMLElement>(".extools")?.getBoundingClientRect();
    const gap = (toolbar?.top ?? 0) - (nav?.bottom ?? 0);
    return Math.abs(gap) <= 2;
  })).toBe(true);
  const mergedGeometry = await page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>(".nav__bar")?.getBoundingClientRect();
    const toolbar = document.querySelector<HTMLElement>(".extools")?.getBoundingClientRect();
    return {
      widthDelta: Math.abs((nav?.width ?? 0) - (toolbar?.width ?? 0)),
      leftDelta: Math.abs((nav?.left ?? 0) - (toolbar?.left ?? 0)),
    };
  });
  expect(mergedGeometry.widthDelta).toBeLessThanOrEqual(2);
  expect(mergedGeometry.leftDelta).toBeLessThanOrEqual(2);
  expect(before).not.toBeNull();
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
  const after = await tools.boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(Math.abs((before?.height ?? 0) - (after?.height ?? 0))).toBeLessThan(2);
  await expect(tools).toHaveAttribute("data-docked", "");
  await expect.poll(async () => (await tools.boundingBox())?.y ?? 999).toBeLessThan(20);

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
    const fullscreen = element.querySelector<HTMLElement>("[data-exmodal-fullscreen]")?.getBoundingClientRect();
    return {
      mediaLeft: media?.left ?? 0,
      mediaRight: media?.right ?? 0,
      mediaBottom: media?.bottom ?? 0,
      nextLeft: next?.left ?? 0,
      nextRight: next?.right ?? 0,
      fullscreenRight: fullscreen?.right ?? 0,
      fullscreenBottom: fullscreen?.bottom ?? 0,
    };
  });
  expect(modalGeometry.nextLeft).toBeGreaterThan(modalGeometry.mediaLeft);
  expect(modalGeometry.nextRight).toBeLessThan(modalGeometry.mediaRight);
  expect(modalGeometry.mediaRight - modalGeometry.fullscreenRight).toBeLessThanOrEqual(18);
  expect(modalGeometry.mediaBottom - modalGeometry.fullscreenBottom).toBeLessThanOrEqual(18);

  const firstSource = await image.getAttribute("src");
  await page.locator(".exmodal__dot").nth(1).click();
  await expect(page.locator(".exmodal__dot").nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => image.getAttribute("src")).not.toBe(firstSource);

  await expect(page.locator(".exmodal__controls")).toHaveCount(0);
  const viewport = page.locator("[data-exmodal-viewport]");
  const viewportBox = await viewport.boundingBox();
  expect(viewportBox).not.toBeNull();
  const imageWidthBeforeZoom = (await image.boundingBox())?.width ?? 0;
  await page.mouse.move((viewportBox?.x ?? 0) + (viewportBox?.width ?? 0) / 2, (viewportBox?.y ?? 0) + (viewportBox?.height ?? 0) / 2);
  await page.mouse.wheel(0, -300);
  await expect.poll(async () => (await image.boundingBox())?.width ?? 0).toBeGreaterThan(imageWidthBeforeZoom * 1.2);
  const panBefore = await image.evaluate((element) => getComputedStyle(element).transform);
  await page.mouse.move((viewportBox?.x ?? 0) + (viewportBox?.width ?? 0) / 2, (viewportBox?.y ?? 0) + (viewportBox?.height ?? 0) / 2);
  await page.mouse.down();
  await page.mouse.move((viewportBox?.x ?? 0) + (viewportBox?.width ?? 0) / 2 - 70, (viewportBox?.y ?? 0) + (viewportBox?.height ?? 0) / 2 - 45, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => image.evaluate((element) => getComputedStyle(element).transform)).not.toEqual(panBefore);
  await page.locator("[data-exmodal-fullscreen]").click();
  await expect(dialog).toHaveAttribute("data-media-fullscreen", "");
  await expect(page.locator(".exmodal__details")).toBeHidden();
  await expect(page.locator("[data-exmodal-fullscreen] .exmodal__icon--exit")).toBeVisible();
  const fullscreenViewport = await viewport.boundingBox();
  await page.mouse.move((fullscreenViewport?.x ?? 0) + (fullscreenViewport?.width ?? 0) / 2, (fullscreenViewport?.y ?? 0) + (fullscreenViewport?.height ?? 0) / 2);
  await page.mouse.down();
  await page.mouse.move((fullscreenViewport?.x ?? 0) - 900, (fullscreenViewport?.y ?? 0) - 900, { steps: 5 });
  await page.mouse.up();
  const boundedImage = await image.boundingBox();
  expect(boundedImage).not.toBeNull();
  // Panning must never open a gap. An image larger than the viewport stays
  // clamped to its edges; one smaller than the viewport (several exhibition
  // captures are only a few hundred pixels wide, and are no longer stretched
  // up to fill the frame) stays centred instead of drifting off.
  const axis = (imageStart: number, imageSize: number, viewStart: number, viewSize: number) => {
    if (imageSize >= viewSize) {
      expect(imageStart).toBeLessThanOrEqual(viewStart + 1);
      expect(imageStart + imageSize).toBeGreaterThanOrEqual(viewStart + viewSize - 1);
    } else {
      const centreOffset = Math.abs((imageStart + imageSize / 2) - (viewStart + viewSize / 2));
      expect(centreOffset).toBeLessThanOrEqual(1);
    }
  };
  axis(boundedImage?.x ?? 0, boundedImage?.width ?? 0, fullscreenViewport?.x ?? 0, fullscreenViewport?.width ?? 0);
  axis(boundedImage?.y ?? 0, boundedImage?.height ?? 0, fullscreenViewport?.y ?? 0, fullscreenViewport?.height ?? 0);
  const fullscreenViewportBox = await viewport.boundingBox();
  await page.mouse.move((fullscreenViewportBox?.x ?? 0) + (fullscreenViewportBox?.width ?? 0) / 2, (fullscreenViewportBox?.y ?? 0) + (fullscreenViewportBox?.height ?? 0) / 2);
  await page.mouse.wheel(0, 300);
  await expect(page.locator("[data-exmodal-media]")).not.toHaveAttribute("data-zoomed", "");
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

  // The "A deliberately wider sky" section was removed from the page, and the
  // scrolling section carries only the video and the text now - no orbit rings,
  // connection arcs, drifting dots or starfield overlay.
  await expect(page.locator(".about-inclusion")).toHaveCount(0);
  await expect(page.locator(".about-connection, .about-cosmos, .about-signal, .about-stars")).toHaveCount(0);
  await expect(page.locator(".about-horizontal__visual > *")).toHaveCount(1);
  await expect(page.locator(".about-horizontal__visual [data-about-scroll-video]")).toHaveCount(1);

  // Below 900px the track stacks vertically, so each panel spans the column.
  const stacked = await page.locator("[data-about-track] > section").evaluateAll((sections) =>
    sections.map((section) => Math.round(section.getBoundingClientRect().width)));
  expect(new Set(stacked).size).toBe(1);
  expect(stacked[0]).toBeLessThanOrEqual(803);
});

test("legacy exhibition pages open the requested object in the popup", async ({ page }) => {
  await page.goto("/exhibition/ngc2023", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/exhibition\?object=ngc2023$/);
  await expect(page.locator("[data-exmodal]")).toBeVisible();
  await expect(page.locator("[data-exmodal-title]")).toHaveText("Horsehead Nebula");
});

test("home exhibition previews open the selected object viewer", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const preview = page.locator('.hgrid--featured-six .plate[href*="object="]').first();
  const expectedTitle = (await preview.locator(".plate__name").textContent())?.trim();

  await preview.click();

  await expect(page).toHaveURL(/\/exhibition\?object=/);
  await expect(page.locator("[data-exmodal]")).toBeVisible();
  await expect(page.locator("[data-exmodal-title]")).toHaveText(expectedTitle ?? "");
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
  await expect(page.locator(".profile-group--supervisors .profile-card")).toHaveCount(2);
  await expect(page.locator(".profile-group--project-manager .profile-card")).toHaveCount(1);
  await expect(page.locator("body")).not.toContainText("Astronomers responsible");
  await expect(page.locator("body")).not.toContainText("Programme planning");
  const supervisorsBox = await page.locator(".profile-group--supervisors").boundingBox();
  const managerBox = await page.locator(".profile-group--project-manager").boundingBox();
  expect(supervisorsBox).not.toBeNull();
  expect(managerBox).not.toBeNull();
  expect(managerBox?.y ?? 0).toBeGreaterThan((supervisorsBox?.y ?? 0) + (supervisorsBox?.height ?? 0));
  await expect(page.locator('.profile-card__avatar--photo img[alt^="Portrait of"]')).toHaveCount(3);
  await expect.poll(() => page.locator('.profile-card__avatar--photo img').evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await expect.poll(() => page.locator('.profile-card__avatar--photo img').evaluateAll((images) => images.every((image) => {
    const imageRect = image.getBoundingClientRect();
    const avatarRect = image.parentElement?.getBoundingClientRect();
    return Boolean(avatarRect && imageRect.left >= avatarRect.left && imageRect.right <= avatarRect.right && imageRect.top >= avatarRect.top && imageRect.bottom <= avatarRect.bottom);
  }))).toBe(true);
  const firstPortrait = page.locator('.profile-card__avatar--photo img').first();
  await expect(firstPortrait).toHaveCSS("filter", "grayscale(1)");
  await page.locator(".profile-card").first().hover();
  await expect(firstPortrait).toHaveCSS("filter", "none");
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
  expect(cardLayout.cardHeight).toBeGreaterThan(285);
  expect(cardLayout.cardHeight).toBeLessThan(380);
  expect(cardLayout.avatarInside).toBe(true);
  expect(cardLayout.titleBelowAvatar).toBe(true);
  expect(cardLayout.background).toBe("rgba(0, 0, 0, 0)");
  await expect.poll(() => page.locator(".profile-card").first().evaluate((card) => getComputedStyle(card, "::before").backgroundImage)).not.toBe("none");
  await expect(page.locator(".profile-card").first()).not.toContainText("Based in");
  await expect(page.locator("body")).not.toContainText("CASSA profile");
  const moreButton = page.locator("[data-profile-open]").first();
  await moreButton.click();
  const profileModal = page.locator("[data-profile-modal]");
  await expect(profileModal).toBeVisible();
  await expect(profileModal.locator(".profile-modal__cover")).toBeVisible();
  await expect(profileModal.locator(".profile-modal__section")).toHaveCount(2);
  await expect(page.locator("[data-profile-name]")).toHaveText("Dr. Lamiya Ashraf Mowla");
  await expect(page.locator("[data-profile-details] dt")).toContainText(["Current appointment", "Education", "Postdoctoral training", "Research", "Programmes"]);
  await expect(page.locator("[data-profile-close]")).toBeFocused();
  const modalLayout = await profileModal.evaluate((dialog) => {
    const bounds = dialog.getBoundingClientRect();
    const cover = dialog.querySelector<HTMLElement>(".profile-modal__cover")?.getBoundingClientRect();
    const avatar = dialog.querySelector<HTMLElement>(".profile-modal__avatar")?.getBoundingClientRect();
    return {
      insideViewport: bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight,
      avatarOverlapsCover: Boolean(cover && avatar && avatar.top < cover.bottom && avatar.bottom > cover.bottom),
    };
  });
  expect(modalLayout.insideViewport).toBe(true);
  expect(modalLayout.avatarOverlapsCover).toBe(true);
  await page.keyboard.press("Escape");
  await expect(profileModal).not.toBeVisible();
  await expect(moreButton).toBeFocused();
  await expect(firstPortrait).toHaveCSS("filter", "grayscale(1)");
});

test("profile identity stays below the cover at narrow widths", async ({ page }) => {
  await page.setViewportSize({ width: 591, height: 805 });
  await page.goto("/people/management", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "More information about Dr. Lamiya Ashraf Mowla" }).click();

  const dialog = page.locator("[data-profile-modal]");
  const layout = await dialog.evaluate((node) => {
    const cover = node.querySelector<HTMLElement>(".profile-modal__cover")?.getBoundingClientRect();
    const name = node.querySelector<HTMLElement>("[data-profile-name]")?.getBoundingClientRect();
    const role = node.querySelector<HTMLElement>("[data-profile-role]")?.getBoundingClientRect();
    const modal = node.getBoundingClientRect();
    return {
      nameBelowCover: Boolean(cover && name && name.top >= cover.bottom),
      nameInsideModal: Boolean(name && name.left >= modal.left && name.right <= modal.right && name.width > 0 && name.height > 0),
      roleBelowName: Boolean(name && role && role.top >= name.bottom),
    };
  });

  expect(layout).toEqual({ nameBelowCover: true, nameInsideModal: true, roleBelowName: true });
  await expect(page.locator("[data-profile-name]")).toHaveText("Dr. Lamiya Ashraf Mowla");
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
  await expect(page.locator("h1")).toContainText("Distance should inspire wonder");
});

test("News and Events are separate editorial sections", async ({ page }) => {
  await page.goto("/news", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1")).toHaveText("News & Updates");
  await expect(page.locator('.news-all[href="#all-stories"]')).toBeVisible();
  await expect(page.locator(".news-row")).toHaveCount(12);
  await expect(page.locator('[data-news-filter="all"]')).toHaveAttribute("aria-pressed", "true");
  await page.goto("/events", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1")).toHaveText("Events & Calendar");
  await expect(page.locator("html")).toHaveAttribute("data-cal-ready", "");
  await expect(page.locator(".cal")).toBeVisible();
  await expect(page.locator(".cal")).toHaveAttribute("data-calendar-sync", "local");
  await expect(page.locator('.cal__views[aria-label="Calendar view"]')).toBeVisible();
  await expect(page.getByRole("tab")).toHaveText(["List", "Week", "Month", "Year"]);
});

test("events calendar changes views, filters the archive, and opens event details", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/events", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-cal-ready", "");
  const listTab = page.getByRole("tab", { name: "List" });
  await listTab.click();
  await expect(listTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".cal__list")).toBeVisible();

  const workshop = page.locator('.cal__filter button[data-series="workshop"]');
  await workshop.click();
  await expect(workshop).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".cal__lrow")).toHaveCount(1);

  const eventButton = page.locator(".cal__lrow").first();
  await eventButton.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Close", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(eventButton).toBeFocused();

  await page.getByRole("tab", { name: "Year" }).click();
  await expect(page.locator(".cal__mini")).toHaveCount(12);
});

test("the theme toggle persists light and dark mode while brand navigation uses a client transition", async ({ page }) => {
  await page.goto("/people", { waitUntil: "domcontentloaded" });
  const toggle = page.locator("[data-theme-toggle]");
  await expect(toggle).toHaveAttribute("aria-label", "Switch to light mode");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.locator('.nav__link[href="/news"]').click();
  await expect(page).toHaveURL(/\/news$/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".editorial-hero h1")).toHaveCSS("color", "rgb(250, 250, 250)");
  await expect(page.locator(".editorial-hero h1 + p")).toHaveCSS("color", "rgba(255, 255, 255, 0.84)");
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
  ).toBe("none");

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
  expect(surface.backdrop).toBe("none");
  expect(surface.boxShadow).toBe("none");
  expect(surface.transitionProperty).toContain("width");
  expect(surface.transitionDuration).toContain("0.82s");

  await expect(page.locator("footer nav")).toHaveCount(0);
  await expect(page.locator(".foot__partner")).toHaveCount(4);
  await expect(page.locator(".foot__host-lockup img")).toHaveCount(2);
  await expect(page.locator(".hh__host-lockup img")).toHaveCount(2);
  await expect(page.locator(".foot__contact")).not.toContainText("Farzana Akter Lima");
  await expect(page.locator(".foot__contact")).not.toContainText("durbin.cassa@iub.edu.bd");
  await expect(page.locator(".foot__contact")).toContainText("Project manager");
  await expect(page.locator(".foot__contact")).toContainText("Contact");
  await expect(page.locator(".foot__support")).toHaveCSS("background-color", "rgba(255, 255, 255, 0.08)");
  await expect(page.locator(".foot__support")).toHaveCSS("backdrop-filter", "blur(24px) saturate(1.3)");
  await expect(page.locator(".foot__support")).toHaveCSS("border-top-width", "0px");
  await expect.poll(() => page.locator(".foot__support").evaluate((support) => {
    const footer = support.closest("footer")?.getBoundingClientRect();
    return (footer?.bottom ?? 0) - support.getBoundingClientRect().bottom;
  })).toBeGreaterThanOrEqual(32);
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
  // Reduced from 28px: the badge sits over the playing hero video, so its
  // backdrop changes every video frame and the blur was being recomputed
  // continuously. It still reads as glass at 12px.
  await expect(page.locator(".hh__eyebrow")).toHaveCSS("backdrop-filter", "blur(12px) saturate(1.6)");
  await expect(page.locator(".hh__sub")).toHaveCount(0);
  await expect(page.locator(".hero__lede")).toContainText(
    "Citizen of distant world. The cosmos through the eyes of student volunteers",
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

test("the About page begins with the programme story and clear next steps", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/about", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".about-hero")).toHaveCount(0);
  await expect(page.locator("h1")).toContainText("Distance should inspire wonder");
  await expect(page.locator(".about-facts__grid li")).toHaveCount(0);
  await expect(page.locator(".about-timeline li")).toHaveCount(4);
  await expect(page.locator(".about-mosaic figure")).toHaveCount(4);
  await expect(page.locator(".about-path__grid li")).toHaveCount(0);
  await expect(page.locator('.about-close__actions a[href="/exhibition"]')).toBeVisible();
  await expect(page.locator(".about-close__actions a")).toHaveCount(1);
  await page.locator("[data-theme-toggle]").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".about-close h2")).toHaveCSS("color", "rgb(250, 250, 250)");
  await expect(page.locator(".about-close h2 + p")).toHaveCSS("color", "rgba(255, 255, 255, 0.84)");
  await expect(page.locator(".about-governance h2")).toHaveText("Volunteer led. Expert supervised. Public by design.");
  await expect(page.locator('.about-mosaic img[alt^="The Horsehead Nebula"]')).toHaveAttribute("src", /ngc2023-2/);
  await expect(page.getByRole("button", { name: "About", exact: true })).toHaveClass(/is-active/);
  await expect(page.locator(".about-design")).toHaveCount(0);
  await expect(page.locator("[data-about-video]")).toHaveCount(0);
  await expect(page.locator(".about-marquee")).toHaveCount(0);
  await expect(page.locator("[data-about-depth]")).toHaveCount(0);
  await expect(page.locator(".about-horizontal__visual")).toHaveCount(1);
  await expect(page.locator("[data-about-track] > section")).toHaveCount(4);
  for (const panel of ["about-field", "about-governance"]) {
    await expect(page.locator(`[data-about-track] > section.${panel}`)).toHaveCount(1);
  }
  const scrollVideo = page.locator("[data-about-scroll-video]");
  // The source is attached by script on desktop only, so the 8.5MB file is never
  // fetched at widths where the horizontal track collapses to a vertical stack.
  await expect(scrollVideo).toHaveAttribute("data-src", "/videos/pexels-night-sky-12336940.mp4");
  await expect.poll(() => scrollVideo.evaluate((video: HTMLVideoElement) => video.currentSrc)).toContain("pexels-night-sky-12336940.mp4");
  await expect.poll(() => scrollVideo.evaluate((video: HTMLVideoElement) => video.readyState)).toBeGreaterThanOrEqual(1);
  const horizontal = page.locator("[data-about-horizontal]");
  await expect.poll(() => horizontal.evaluate((node) => (node as HTMLElement).offsetHeight > innerHeight * 2)).toBe(true);
  await horizontal.evaluate((node) => scrollTo(0, node.getBoundingClientRect().top + scrollY + ((node as HTMLElement).offsetHeight - innerHeight) * .45));
  await expect.poll(() => page.locator("[data-about-track]").evaluate((node) => getComputedStyle(node).transform)).not.toBe("none");
  // The track transform is the whole contract now. The --about-progress custom
  // property it used to also publish was dropped: nothing consumed it once the
  // decorative overlay went, and rewriting it each frame invalidated style for
  // the entire four-panel subtree.
  await expect.poll(() => page.locator("[data-about-track]").evaluate((node) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(node).transform);
    return Math.abs(matrix.m41) / Math.max(1, node.scrollWidth - innerWidth);
  })).toBeGreaterThan(.35);
  await expect.poll(() => scrollVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(.1);
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
