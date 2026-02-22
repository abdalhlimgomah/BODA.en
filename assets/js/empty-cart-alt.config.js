tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#FF5722", // Deep Orange from BODA reference
        secondary: "#102C57", // Deep Navy Blue from BODA reference
        "background-light": "#F3F4F6", // Light gray background
        "background-dark": "#111827", // Dark mode background
        "surface-light": "#FFFFFF",
        "surface-dark": "#1F2937",
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
      },
    },
  },
};
