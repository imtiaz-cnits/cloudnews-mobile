/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#050B14',
          card: '#0B1728',
          primary: '#0066CC',
          accent: '#00A8FF',
          cyan: '#00A8FF',
          secondary: '#172233',
        }
      },
      fontFamily: {
        jakarta: ["PlusJakartaSans-Regular"],
        "jakarta-medium": ["PlusJakartaSans-Medium"],
        "jakarta-semibold": ["PlusJakartaSans-SemiBold"],
        "jakarta-bold": ["PlusJakartaSans-Bold"],
        "jakarta-extrabold": ["PlusJakartaSans-ExtraBold"],
        "jakarta-light": ["PlusJakartaSans-Light"],
      }
    },
  },
  plugins: [],
};
