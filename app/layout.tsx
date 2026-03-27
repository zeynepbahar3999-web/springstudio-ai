import './globals.css'

export const metadata = {
  title: 'SpringStudio — AI Creation Suite',
  description: '1220+ AI modules. Generate images, video, audio, 3D — all in your browser.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen relative z-10">{children}</body>
    </html>
  )
}
