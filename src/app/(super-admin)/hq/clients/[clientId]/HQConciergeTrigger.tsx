
'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import HQConciergeChatPane from './HQConciergeChatPane';

interface Props {
    clientId: string;
    hotelName: string;
}

export default function HQConciergeTrigger({ clientId, hotelName }: Props) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (searchParams.get('chat') === 'true') {
            setIsOpen(true);
        }
    }, [searchParams]);

    const handleClose = () => {
        setIsOpen(false);
        // Remove ?chat=true from URL without full reload
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('chat');
        router.replace(`?${newParams.toString()}`);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-indigo-100 text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-sm shadow-indigo-500/5 active:scale-95"
            >
                <MessageSquare className="w-4 h-4" />
                Line of Communication
            </button>

            <HQConciergeChatPane
                clientId={clientId}
                hotelName={hotelName}
                isOpen={isOpen}
                onClose={handleClose}
            />
        </>
    );
}
