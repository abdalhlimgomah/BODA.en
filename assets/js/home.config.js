tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#f97316", // Orange as primary accent
        secondary: "#1e3a8a", // Navy Blue
        "background-light": "#f3f4f6", // Light gray background
        "background-dark": "#0f172a", // Dark blue/slate background
        "surface-light": "#ffffff",
        "surface-dark": "#1e293b",
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        "xl": "1rem",
        "2xl": "1.5rem",
      },
    },
  },
};
