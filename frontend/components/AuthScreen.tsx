import React from 'react';
import LoginScreen from './ui/login-1';

interface AuthScreenProps {
    onAuthSuccess: (token: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
    return (
        <LoginScreen onAuthSuccess={onAuthSuccess} />
    );
};

export default AuthScreen;
