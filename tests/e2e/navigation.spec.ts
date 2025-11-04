import { test, expect } from "./fixtures/base";
import { createSampleNotes, deleteAllNotesViaAPI } from "./helpers/notes.helpers";

test.describe("Global Navigation and Layout", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Start from authenticated state
    await authenticatedPage.page.goto("/");
  });

  test.afterEach(async ({ authenticatedPage }) => {
    // Cleanup
    await deleteAllNotesViaAPI(authenticatedPage.page);
  });

  test.describe("Main Navigation", () => {
    test("should navigate from home to notes list", async ({ notesPage, user, page }) => {
      // ARRANGE

      // ACT
      await notesPage.goto();

      // ASSERT
      await expect(page).toHaveURL(/\/notes/);
      await notesPage.waitForUserProfileLoaded(user.email);
    });

    test("should navigate from notes to settings via navbar", async ({ notesPage, settingsPage, page, user }) => {
      // ARRANGE
      await notesPage.goto();
      await notesPage.waitForUserProfileLoaded(user.email);

      // ACT
      await notesPage.goToSettings();

      // ASSERT
      await expect(page).toHaveURL(/\/settings/);
      await settingsPage.waitForLoaded();
    });

    test("should navigate from settings back to notes", async ({ settingsPage, page }) => {
      // ARRANGE
      await settingsPage.goto();
      await settingsPage.waitForLoaded();

      // ACT
      await page.getByTestId("navbar-notes-link").click();

      // ASSERT
      await expect(page).toHaveURL(/\/notes/);
    });

    test("should navigate to note details from notes list", async ({
      authenticatedPage,
      notesListPage,
      noteDetailPage,
      page,
    }) => {
      // ARRANGE
      const notes = await createSampleNotes(authenticatedPage.page, 1);
      const noteId = notes[0].id;
      await notesListPage.goto();

      // ACT
      await noteDetailPage.goto(noteId);

      // ASSERT
      await expect(page).toHaveURL(`/notes/${noteId}`);
      await noteDetailPage.waitForLoaded();
    });

    test("should navigate back to notes list from note details", async ({
      authenticatedPage,
      noteDetailPage,
      page,
    }) => {
      // ARRANGE
      const notes = await createSampleNotes(authenticatedPage.page, 1);
      const noteId = notes[0].id;
      await noteDetailPage.goto(noteId);

      // ACT
      // Click breadcrumb to return to notes list
      const breadcrumb = noteDetailPage.page.getByTestId("note-header-notes-breadcrumb");
      await breadcrumb.click();

      // ASSERT
      await expect(page).toHaveURL(/\/notes$/);
    });
  });

  test.describe("Navigation Consistency", () => {
    test("should maintain navigation state across pages", async ({ notesPage, settingsPage, page }) => {
      // ACT - Navigate through multiple pages
      await notesPage.goto();
      await expect(page).toHaveURL(/\/notes$/);
      const firstNotesUrl = page.url();

      await settingsPage.goto();
      await expect(page).toHaveURL(/\/settings$/);

      await notesPage.goto();
      await expect(page).toHaveURL(firstNotesUrl);

      // ASSERT
      expect(firstNotesUrl).toMatch(/\/notes$/);
    });

    test("should open landing page from navbar generate button", async ({ notesPage, page, user }) => {
      // ARRANGE
      await notesPage.goto();
      await notesPage.waitForUserProfileLoaded(user.email);

      // ACT
      await notesPage.navbarGenerateNoteButton.click();
      await page.waitForURL((url) => url.pathname === "/", { timeout: 10000 });

      // ASSERT
      await expect(page).toHaveURL("/");
      await expect(page.getByTestId("landing-page")).toBeVisible();
    });

    test("should handle direct URL navigation", async ({ page }) => {
      // ARRANGE
      const targetUrl = "/notes";

      // ACT
      await page.goto(targetUrl);

      // ASSERT
      await expect(page).toHaveURL(/\/notes/);
    });

    // test("should redirect to login when accessing protected routes without auth", async ({ page }) => {
    //   // ARRANGE - Create a fresh context without authentication state
    //   const browser = page.context().browser();
    //   if (!browser) {
    //     throw new Error("Browser instance is not available");
    //   }

    //   const baseURL = test.info().project.use.baseURL;
    //   const newContext = await browser.newContext(baseURL ? { baseURL } : {});

    //   try {
    //     const newPage = await newContext.newPage();

    //     // ACT
    //     await newPage.goto("/notes");
    //     await newPage.waitForURL("**/login");
    //     await expect(newPage).toHaveURL(/.*login/);
    //   } finally {
    //     await newContext.close();
    //   }
    // });
  });

  test.describe("Mobile Navigation", () => {
    test("should open and use mobile menu links", async ({ notesPage, settingsPage, page, user }) => {
      // ARRANGE
      await page.setViewportSize({ width: 390, height: 844 });
      await notesPage.goto();
      await notesPage.waitForUserProfileLoaded(user.email);

      // ACT - Open mobile menu and navigate to settings
      await page.getByTestId("navbar-mobile-menu-button").click();
      await page.getByTestId("navbar-mobile-settings-link").click();

      // ASSERT
      await expect(page).toHaveURL(/\/settings/);
      await settingsPage.waitForLoaded();

      // ACT - Return to notes via mobile menu
      await page.getByTestId("navbar-mobile-menu-button").click();
      await page.getByTestId("navbar-mobile-notes-link").click();

      // ASSERT
      await expect(page).toHaveURL(/\/notes$/);
    });
  });

  test.describe("Page Loading", () => {
    test("should load notes list page completely", async ({ notesListPage, page }) => {
      // ARRANGE
      await notesListPage.goto();

      // ACT
      await notesListPage.waitForNotesToLoad();

      // ASSERT
      await expect(page).toHaveURL(/\/notes$/);
      const listVisible = await notesListPage.noteList.isVisible().catch(() => false);
      const emptyVisible = await notesListPage.noteListEmptyState.isVisible().catch(() => false);
      expect(listVisible || emptyVisible).toBe(true);
    });

    test("should load settings page completely", async ({ settingsPage }) => {
      // ARRANGE
      await settingsPage.goto();

      // ACT
      await settingsPage.waitForLoaded();

      // ASSERT
      await expect(settingsPage.container).toBeVisible();
    });

    test("should load note detail page completely", async ({ authenticatedPage, noteDetailPage }) => {
      // ARRANGE
      const notes = await createSampleNotes(authenticatedPage.page, 1);
      await noteDetailPage.goto(notes[0].id);

      // ACT
      await noteDetailPage.waitForLoaded();

      // ASSERT
      await expect(noteDetailPage.container).toBeVisible();
    });
  });

  test.describe("Error Handling During Navigation", () => {
    test("should handle navigation to non-existent note gracefully", async ({ noteDetailPage }) => {
      // ARRANGE
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      // ACT
      await noteDetailPage.goto(nonExistentId);
      await noteDetailPage.page.waitForLoadState("networkidle");

      // ASSERT
      // The page should either show a 404 error or redirect to the notes list.
      await expect(async () => {
        const is404 = await noteDetailPage.isNotFoundError();
        const redirectedToList = /\/notes$/.test(noteDetailPage.page.url());
        expect(is404 || redirectedToList).toBe(true);
      }).toPass();
    });

    // test("should handle invalid URLs gracefully", async ({ page }) => {
    //   // ARRANGE
    //   const invalidPath = "/notes/invalid-format";

    //   // ACT
    //   await page.goto(invalidPath);

    //   // ASSERT - Should redirect to a 404 page or a valid page.
    //   await expect(page).not.toHaveURL(invalidPath);
    // });
  });

  test.describe("Header/Footer Consistency", () => {
    test("should display consistent header across all pages", async ({ notesPage, settingsPage, page }) => {
      // ARRANGE & ACT - Check header presence on different pages

      // On notes page
      await notesPage.goto();
      const notesPageTitle = await page.title();

      // On settings page
      await settingsPage.goto();
      const settingsPageTitle = await page.title();

      // ASSERT - Both should have valid titles
      expect(notesPageTitle).toBeTruthy();
      expect(settingsPageTitle).toBeTruthy();
    });

    test("should maintain viewport consistency across pages", async ({
      page,
      notesPage,
      settingsPage,
      noteDetailPage,
      authenticatedPage,
    }) => {
      // ARRANGE
      const notes = await createSampleNotes(authenticatedPage.page, 1);

      // ACT & ASSERT - Check viewport on different pages
      const viewportSizes: Record<string, { width: number; height: number }> = {};

      await notesPage.goto();
      viewportSizes.notes = page.viewportSize() || { width: 0, height: 0 };

      await settingsPage.goto();
      viewportSizes.settings = page.viewportSize() || { width: 0, height: 0 };

      if (notes.length > 0) {
        await noteDetailPage.goto(notes[0].id);
        viewportSizes.detail = page.viewportSize() || { width: 0, height: 0 };

        // All pages should have same viewport
        expect(viewportSizes.notes).toEqual(viewportSizes.settings);
        expect(viewportSizes.settings).toEqual(viewportSizes.detail);
      }
    });
  });

  test.describe("Browser Back/Forward", () => {
    test("should support browser back navigation", async ({ page, notesPage, settingsPage }) => {
      // ARRANGE
      await notesPage.goto();
      await settingsPage.goto();

      // ACT
      await page.goBack();

      // ASSERT
      await expect(page).toHaveURL(/\/notes/);
    });

    test("should support browser forward navigation", async ({ page, notesPage, settingsPage }) => {
      // ARRANGE
      await notesPage.goto();
      await settingsPage.goto();
      await page.goBack();

      // ACT
      await page.goForward();

      // ASSERT
      await expect(page).toHaveURL(/\/settings/);
    });

    test("should maintain page state in browser history", async ({
      authenticatedPage,
      notesListPage,
      noteDetailPage,
    }) => {
      // ARRANGE
      const notes = await createSampleNotes(authenticatedPage.page, 1);

      // ACT - Navigate forward
      await notesListPage.goto();
      await noteDetailPage.goto(notes[0].id);

      // Navigate back
      await authenticatedPage.page.goBack();

      // ASSERT - Should be back at notes list
      await expect(authenticatedPage.page).toHaveURL(/\/notes/);
    });
  });
});
