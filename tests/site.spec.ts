import { expect, test } from "@playwright/test";

const routes = ["/", "/exhibition", "/news-and-events", "/people", "/about", "/manual"];
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
  await expect(page.locator(".nav__olink").first()).toBeFocused();
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
  await expect(page.locator(".nav__manual")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator(".nav__manual")).toHaveCSS("color", "rgb(10, 10, 10)");
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

test("about inclusion and orbit stay separated at tablet width", async ({ page }) => {
  await page.setViewportSize({ width: 803, height: 805 });
  await page.goto("/about", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".about-orbit__word")).toHaveCount(0);

  const layout = await page.locator(".about-inclusion__grid").evaluate((grid) => {
    const image = grid.querySelector<HTMLElement>(".about-inclusion__image")?.getBoundingClientRect();
    const copy = grid.querySelector<HTMLElement>(".about-inclusion__copy")?.getBoundingClientRect();
    const orbit = document.querySelector<HTMLElement>(".about-orbit")?.getBoundingClientRect();
    const heroCopy = document.querySelector<HTMLElement>(".about-hero__copy")?.getBoundingClientRect();
    return {
      imageHeight: image?.height ?? 0,
      imageBottom: image?.bottom ?? 0,
      copyTop: copy?.top ?? 0,
      orbitTop: orbit?.top ?? 0,
      heroCopyBottom: heroCopy?.bottom ?? 0,
    };
  });

  expect(layout.imageHeight).toBeGreaterThan(400);
  expect(layout.copyTop).toBeGreaterThan(layout.imageBottom + 20);
  expect(layout.orbitTop).toBeGreaterThan(layout.heroCopyBottom);
});

test("legacy exhibition pages open the requested object in the popup", async ({ page }) => {
  await page.goto("/exhibition/ngc2023", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/exhibition\?object=ngc2023$/);
  await expect(page.locator("[data-exmodal]")).toBeVisible();
  await expect(page.locator("[data-exmodal-title]")).toHaveText("Horsehead Nebula");
});

test("desktop navigation stays flat and promotes the manual", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".nav__link")).toHaveText(["People", "Exhibition", "News & Events", "About Us"]);
  await expect(page.locator("[data-submenu-toggle]")).toHaveCount(0);
  await expect(page.locator('.nav__link[href="/about"]')).toHaveText("About Us");
  await expect(page.locator('.nav__link[href="/exhibition"]')).toHaveAttribute("data-astro-reload", "true");
  await expect(page.locator(".nav__manual")).toHaveAttribute("href", "/manual");
  await expect(page.locator(".nav__manual")).toHaveClass(/btn--solid/);
  await expect(page.locator(".nav__manual")).toHaveCSS("border-radius", "100px");
  await expect(page.locator(".nav__manual-icon")).toHaveCount(1);
});

test("the Exhibition tab opens the collection and About Us opens its own page", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/#about", { waitUntil: "domcontentloaded" });
  await page.locator('.nav__link[href="/exhibition"]').click();
  await expect(page).toHaveURL(/\/exhibition$/);
  await expect(page.locator("h1")).toHaveText("An exhibition of deep space");

  await page.locator('.nav__link[href="/about"]').click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.locator("h1")).toContainText("The sky belongs");
});

test("News and Events presents one unified feed without calendar or highlight filters", async ({ page }) => {
  await page.goto("/news-and-events", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1")).toHaveText("News & Events");
  await expect(page.locator("[data-news-filter]")).toHaveCount(0);
  await expect(page.locator("#upcoming-events")).toHaveCount(0);
  const total = await page.locator("[data-highlight-list] > li").count();
  await expect(page.locator("[data-highlight-list] > li:not([hidden])")).toHaveCount(total);
});

test("the site remains dark-only and brand navigation uses a client transition", async ({ page }) => {
  await page.goto("/people", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-theme-toggle]")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("dark");
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

test("the homepage navigation compacts into a centered glass bar and the footer stays minimal", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".nav__bar")).toHaveCSS("border-top-width", "0px");
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
  await expect(page.locator("[data-nav]")).not.toHaveAttribute("data-nav-ink", /.+/);
  await expect(page.locator(".nav__name")).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(page.locator(".nav__link").first()).toHaveCSS("color", "rgba(255, 255, 255, 0.84)");
  await expect(page.locator(".nav__manual")).toHaveCSS("color", "rgb(10, 10, 10)");
  await page.evaluate(() => window.scrollTo(0, window.innerHeight));
  await expect(page.locator("[data-nav]")).toHaveAttribute("data-scrolled", "");
  await expect(page.locator(".nav__name")).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect.poll(
    () => page.locator(".nav__bar").evaluate((bar) => getComputedStyle(bar).backdropFilter),
    { timeout: 2000 },
  ).toContain("32px");

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
  expect(surface.width).toBeLessThan(1000);
  expect(Math.abs(surface.centre - 640)).toBeLessThan(1);
  expect(surface.backdrop).toContain("blur");
  expect(surface.backdrop).toContain("32px");
  expect(surface.boxShadow).toBe("none");
  expect(surface.background).toBe("rgba(255, 255, 255, 0.16)");
  expect(surface.borderWidth).toBe("0px");
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
  await expect(page.locator(".foot__base")).toHaveCSS("text-align", "center");
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
});

test("the About Us page presents the programme story and clear next steps", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/about", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1")).toContainText("The sky belongs");
  await expect(page.locator(".about-facts__grid li")).toHaveCount(4);
  await expect(page.locator(".about-timeline li")).toHaveCount(4);
  await expect(page.locator(".about-mosaic figure")).toHaveCount(4);
  await expect(page.locator(".about-path__grid li")).toHaveCount(4);
  await expect(page.locator('.about-close__actions a[href="/exhibition"]')).toBeVisible();
  await expect(page.locator('.nav__link[href="/about"]')).toHaveAttribute("aria-current", "page");
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
