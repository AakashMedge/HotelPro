export default function Footer() {
    return (
        <footer className="border-t border-zinc-100 dark:border-zinc-900 py-12 px-4">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="text-sm text-zinc-500">
                    © 2026 HotelPro Systems. All rights reserved.
                </div>
                <div className="flex gap-8 text-sm text-zinc-500">
                    <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Privacy</a>
                    <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Terms</a>
                    <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Support</a>
                </div>
            </div>
        </footer>
    );
}
