export const themes = ["system", "light", "dark"] as const;

export type Theme = (typeof themes)[number];

export const themeStorageKey = "currentTheme";

export const themeInitializationScript = `
  if (!("_updateTheme" in window)) {
    window._updateTheme = function updateTheme(theme) {
      var selectedTheme = ["system", "light", "dark"].includes(theme) ? theme : "system";
      var classList = document.documentElement.classList;

      classList.remove("system", "light", "dark");
      classList.add(selectedTheme);

      document.querySelectorAll('meta[name="theme-color"]').forEach(function (element) {
        element.remove();
      });

      function addThemeColor(content, media) {
        var meta = document.createElement("meta");
        meta.name = "theme-color";
        meta.content = content;
        if (media) meta.media = media;
        document.head.appendChild(meta);
      }

      if (selectedTheme === "system") {
        addThemeColor("#ffffff", "(prefers-color-scheme: light)");
        addThemeColor("#000000", "(prefers-color-scheme: dark)");
      } else {
        addThemeColor(selectedTheme === "dark" ? "#000000" : "#ffffff");
      }
    };
  }

  try {
    window._updateTheme(localStorage.getItem("${themeStorageKey}") || "system");
  } catch (_) {
    window._updateTheme("system");
  }
`;
