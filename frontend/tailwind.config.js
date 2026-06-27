// tailwind.config.js
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        grayGlass: "rgba(255,255,255,0.04)",
        grayBorder: "rgba(255,255,255,0.08)",
      },
      boxShadow: {
        smooth: "0 4px 16px rgba(0,0,0,0.4)",
        glow: "0 0 20px rgba(255,255,255,0.08)",
      },
      backdropBlur: { xs: "2px" },
      animation: {
        "gradient-sweep": "gradient-sweep 8s ease infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        "gradient-sweep": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
