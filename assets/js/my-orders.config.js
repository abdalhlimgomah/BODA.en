tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#1e3a8a", // Deep Blue
        secondary: "#f97316", // Orange
        "background-light": "#f3f4f6", // Light gray background
        "background-dark": "#111827", // Dark gray background
        "surface-light": "#ffffff",
        "surface-dark": "#1f2937",
        "text-light": "#1f2937",
        "text-dark": "#f9fafb",
        "accent-yellow": "#facc15", // For the help button
      },
      fontFamily: {
        display: ["Cairo", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
      },
    },
  },
};
