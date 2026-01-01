module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        purple: '#8B5CF6',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'sans-serif'],
      },
      screens: {
        'xs': '475px',
        // default: sm:640px, md:768px, lg:1024px, xl:1280px, 2xl:1536px
      }
    },
  },
  plugins: [],
}
