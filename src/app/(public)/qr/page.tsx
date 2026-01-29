import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function QRPage() {
    return (
        <>
            <Header />
            <main className="flex-grow flex items-center justify-center p-6">
                <div className="max-w-md w-full premium-card p-12 text-center space-y-6">
                    <div className="w-48 h-48 bg-zinc-100 dark:bg-zinc-800 mx-auto rounded-3xl flex items-center justify-center">
                        <span className="text-zinc-400">QR CODE SCANNER</span>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold">Scan QR</h1>
                        <p className="text-zinc-500">Scan the QR code on your table to see the menu and order.</p>
                    </div>
                    <button className="button-primary w-full">Open Camera</button>
                </div>
            </main>
            <Footer />
        </>
    );
}
