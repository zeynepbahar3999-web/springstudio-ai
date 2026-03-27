module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        s: { bg:'#050508', bg2:'#0c0c12', bg3:'#13131c', card:'#0f0f18',
             border:'rgba(255,255,255,0.07)', cyan:'#00d4aa', blue:'#0ea5e9',
             purple:'#a78bfa', text:'#eef2ff', muted:'rgba(238,242,255,0.5)',
             dim:'rgba(238,242,255,0.28)' }
      },
      fontFamily: { syne:['Syne','sans-serif'], body:['DM Sans','sans-serif'], mono:['DM Mono','monospace'] }
    }
  },
  plugins: []
}
