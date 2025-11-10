import { authedTest as test, expect } from "./fixtures/index";
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
      // Arrange
      // (No explicit setup needed)

      // Act
      await notesPage.goto();

      // Assert
      await expect(page).toHaveURL(/\/notes/);
      await notesPage.waitForUserProfileLoaded(user.email);
    });

    test("should navigate from notes to settings via navbar", async ({ notesPage, settingsPage, page, user }) => {
      // Arrange
      await notesPage.goto();
      await notesPage.waitForUserProfileLoaded(user.email);

      // Act
      await notesPage.goToSettings();

      // Assert
      await expect(page).toHaveURL(/\/settings/);
      await settingsPage.waitForLoaded();
    });

    test("should navigate from settings back to notes", async ({ settingsPage, page }) => {
      // Arrange
      await settingsPage.goto();
      await settingsPage.waitForLoaded();

      // Act
      await page.getByTestId("navbar-notes-link").click();

      // Assert
      await expect(page).toHaveURL(/\/notes/);
    });

    test("should navigate to note details from notes list", async ({
      authenticatedPage,
      notesListPage,
      noteDetailPage,
      page,
    }) => {
      // Arrange
      const notes = await createSampleNotes(authenticatedPage.page, 1);
      const noteId = notes[0].id;
      await notesListPage.goto();

      // Act
      await noteDetailPage.goto(noteId);

      // Assert
      await expect(page).toHaveURL(`/notes/${noteId}`);
      await noteDetailPage.waitForLoaded();
    });

    test("should navigate back to notes list from note details", async ({
      authenticatedPage,
      noteDetailPage,
      page,
    }) => {
      // Arrange
      const notes = await createSampleNotes(authenticatedPage.page, 1);
      const noteId = notes[0].id;
      await noteDetailPage.goto(noteId);

      // Act
      const breadcrumb = noteDetailPage.page.getByTestId("note-header-notes-breadcrumb");
      await breadcrumb.click();

      // Assert
      await expect(page).toHaveURL(/\/notes$/);
    });
  });

  test.describe("Navigation Consistency", () => {
    test("should maintain navigation state across pages", async ({ notesPage, settingsPage, page }) => {
      // Arrange
      // (No explicit setup needed)

      // Act
      await notesPage.goto();
      const firstNotesUrl = page.url();
      await settingsPage.goto();
      await notesPage.goto();

      // Assert
      await expect(page).toHaveURL(/\/notes$/);
      expect(firstNotesUrl).toMatch(/\/notes$/);
    });

    test("should open landing page from navbar generate button", async ({ notesPage, page, user }) => {
      // Arrange
      await notesPage.goto();
      await notesPage.waitForUserProfileLoaded(user.email);

      // Act
      await notesPage.navbarGenerateNoteButton.click();
      await page.waitForURL((url) => url.pathname === "/", { timeout: 10000 });

      // Assert
      await expect(page).toHaveURL("/");
      await expect(page.getByTestId("landing-page")).toBeVisible();
    });

    test("should handle direct URL navigation", async ({ page }) => {
      // Arrange
      const targetUrl = "/notes";

      // Act
      await page.goto(targetUrl);

      // Assert
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
      // Arrange
      await page.setViewportSize({ width: 390, height: 844 });
      await notesPage.goto();
      await notesPage.waitForUserProfileLoaded(user.email);

      // Act
      await page.getByTestId("navbar-mobile-menu-button").click();
      await page.getByTestId("navbar-mobile-settings-link").click();
      await settingsPage.waitForLoaded();
      await page.getByTestId("navbar-mobile-menu-button").click();
      await page.getByTestId("navbar-mobile-notes-link").click();

      // Assert
      await expect(page).toHaveURL(/\/notes$/);
    });
  });

  test.describe("Page Loading", () => {
    test("should load notes list page completely", async ({ notesListPage, page }) => {
      // Arrange
      await notesListPage.goto();

      // Act
      await notesListPage.waitForNotesToLoad();

      // Assert
      await expect(page).toHaveURL(/\/notes$/);
      const listVisible = await notesListPage.noteList.isVisible().catch(() => false);
      const emptyVisible = await notesListPage.noteListEmptyState.isVisible().catch(() => false);
      expect(listVisible || emptyVisible).toBe(true);
    });

    test("should load settings page completely", async ({ settingsPage }) => {
      // Arrange
      await settingsPage.goto();

      // Act
      await settingsPage.waitForLoaded();

      // Assert
      await expect(settingsPage.container).toBeVisible();
    });

    test("should load note detail page completely", async ({ authenticatedPage, noteDetailPage }) => {
      // Arrange
      const notes = await createSampleNotes(authenticatedPage.page, 1);
      await noteDetailPage.goto(notes[0].id);

      // Act
      await noteDetailPage.waitForLoaded();

      // Assert
      await expect(noteDetailPage.container).toBeVisible();
    });
  });

  test.describe("Error Handling During Navigation", () => {
    test("should handle navigation to non-existent note gracefully", async ({ noteDetailPage }) => {
      // Arrange
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      // Act
      await noteDetailPage.goto(nonExistentId);
      await noteDetailPage.page.waitForLoadState("networkidle");

      // Assert
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
      // Arrange
      // (No explicit setup needed)

      // Act
      await notesPage.goto();
      const notesPageTitle = await page.title();
      await settingsPage.goto();
      const settingsPageTitle = await page.title();

      // Assert
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
      // Arrange
      const notes = await createSampleNotes(authenticatedPage.page, 1);
      const viewportSizes: Record<string, { width: number; height: number }> = {};

      // Act
      await notesPage.goto();
      viewportSizes.notes = page.viewportSize() || { width: 0, height: 0 };
      await settingsPage.goto();
      viewportSizes.settings = page.viewportSize() || { width: 0, height: 0 };
      if (notes.length > 0) {
        await noteDetailPage.goto(notes[0].id);
        viewportSizes.detail = page.viewportSize() || { width: 0, height: 0 };
      }

      // Assert
      if (notes.length > 0) {
        expect(viewportSizes.notes).toEqual(viewportSizes.settings);
        expect(viewportSizes.settings).toEqual(viewportSizes.detail);
      }
    });
  });

  test.describe("Browser Back/Forward", () => {
    test("should support browser back navigation", async ({ page, notesPage, settingsPage }) => {
      // Arrange
      await notesPage.goto();
      await settingsPage.goto();

      // Act
      await page.goBack();

      // Assert
      await expect(page).toHaveURL(/\/notes/);
    });

    test("should support browser forward navigation", async ({ page, notesPage, settingsPage }) => {
      // Arrange
      await notesPage.goto();
      await settingsPage.goto();
      await page.goBack();

      // Act
      await page.goForward();

      // Assert
      await expect(page).toHaveURL(/\/settings/);
    });

    test("should maintain page state in browser history", async ({
      authenticatedPage,
      notesListPage,
      noteDetailPage,
    }) => {
      // Arrange
      const notes = await createSampleNotes(authenticatedPage.page, 1);

      // Act
      await notesListPage.goto();
      await noteDetailPage.goto(notes[0].id);
      await authenticatedPage.page.goBack();

      // Assert
      await expect(authenticatedPage.page).toHaveURL(/\/notes/);
    });
  });
});
