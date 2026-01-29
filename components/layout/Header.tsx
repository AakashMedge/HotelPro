import Link from 'next/link';

export default function Header() {
    return (
        <header className="sticky top-0 z-50 glass">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="text-xl font-bold tracking-tighter">
                    HOTEL<span className="text-zinc-500">PRO</span>
                </Link>
                <nav className="hidden md:flex gap-8 text-sm font-medium">
                    <Link href="/customer" className="hover:text-zinc-500 transition-colors">Menu</Link>
                    <Link href="/qr" className="hover:text-zinc-500 transition-colors">QR Scan</Link>
                    <Link href="/login" className="hover:text-zinc-500 transition-colors">Login</Link>
                </nav>
                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                        Portal
                    </Link>
                </div>
            </div>
        </header>
    );
}
