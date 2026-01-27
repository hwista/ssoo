'use client';

import React, { createContext, useState, useContext, ReactNode, Dispatch, SetStateAction } from 'react';

interface GeminiChatContextType {
    question: string;
    setQuestion: Dispatch<SetStateAction<string>>;
    answer: string;
    setAnswer: Dispatch<SetStateAction<string>>;
    loading: boolean;
    setLoading: Dispatch<SetStateAction<boolean>>;
}

const GeminiChatContext = createContext<GeminiChatContextType | undefined>(undefined);

export const GeminiChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);

    return (
        <GeminiChatContext.Provider value={{ question, setQuestion, answer, setAnswer, loading, setLoading }}>
            {children}
        </GeminiChatContext.Provider>
    );
};

export const useGeminiChat = () => {
    const context = useContext(GeminiChatContext);
    if (context === undefined) {
        throw new Error('useGeminiChat must be used within a GeminiChatProvider');
    }
    return context;
};