
import type { Config } from "tailwindcss"
export default {
  content: ["./app/**/*.{ts,tsx}","./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { primary:"#417c59", primaryDark:"#1b472e", accent:"#113b24" } } },
  plugins: []
} satisfies Config
