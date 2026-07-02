import Sidebar from '@/components/Sidebar'

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-[240px] flex-1 p-6 md:p-8 min-h-screen">
        {children}
      </main>
    </div>
  )
}
