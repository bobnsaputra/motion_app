import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';
import './Login.css';

export type LoginMode = 'login' | 'signup' | 'forgot_password' | 'update_password';

interface LoginProps {
    onLoginSuccess: (user: any) => void;
    initialMode?: LoginMode;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, initialMode = 'login' }) => {
    const [mode, setMode] = useState<LoginMode>(initialMode);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
    const turnstileRef = useRef<TurnstileInstance>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
        setSuccessMessage('');
        // Clear the unverified email if they start typing a new one
        if (e.target.name === 'email') setUnverifiedEmail(null);
    };

    const validateForm = () => {
        if (mode === 'signup' || mode === 'update_password') {
            if (formData.password !== formData.confirmPassword) {
                setError('Passwords do not match');
                return false;
            }
            if (formData.password.length < 6) {
                setError('Password must be at least 6 characters');
                return false;
            }
        }
        
        // ALL modes require Cloudflare Turnstile token now!
        if (!captchaToken) {
            setError('Please complete the security check');
            return false;
        }
        
        if (mode !== 'update_password' && !formData.email.includes('@')) {
            setError('Please enter a valid email');
            return false;
        }
        return true;
    };

    const resetCaptcha = () => {
        setCaptchaToken(null);
        if (turnstileRef.current) {
            turnstileRef.current.reset();
        }
    };

    const handleResendVerification = async () => {
        if (!unverifiedEmail) return;
        setLoading(true);
        setError('');
        setSuccessMessage('');
        
        try {
            const { error: resendError } = await supabase.auth.resend({
                type: 'signup',
                email: unverifiedEmail,
                options: {
                    emailRedirectTo: window.location.origin,
                    captchaToken: captchaToken || undefined, // Send it along!
                }
            });
            
            if (resendError) throw resendError;
            
            setSuccessMessage(`We just sent a fresh verification link to ${unverifiedEmail}!`);
            setUnverifiedEmail(null);
        } catch (err: any) {
            setError(err.message || 'Failed to resend the verification email.');
        } finally {
            setLoading(false);
            resetCaptcha(); // Force a new token to be generated
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!validateForm()) return;

        setLoading(true);

        try {
            if (mode === 'login') {
                // Sign in with Supabase with Captcha Token
                const { data, error: authError } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        captchaToken: captchaToken || undefined
                    }
                });

                if (authError) throw authError;

                if (data.user) {
                    const user = {
                        id: data.user.id,
                        username: data.user.user_metadata?.username || formData.email.split('@')[0],
                        email: data.user.email || '',
                    };
                    onLoginSuccess(user);
                }
            } else if (mode === 'signup') {
                // Sign up with Supabase with Captcha Token
                const { data, error: authError } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        data: {
                            username: formData.username,
                        },
                        captchaToken: captchaToken || undefined,
                        emailRedirectTo: window.location.origin
                    },
                });

                if (authError) throw authError;

                // UX Polish: Detect if email confirmation is required
                if (data.user && !data.session) {
                    switchMode('login'); // Pop them back to login securely
                    setSuccessMessage('Account created! Please check your inbox and click the verification link to log in.');
                    return;
                }

                if (data.user && data.session) {
                    const user = {
                        id: data.user.id,
                        username: formData.username,
                        email: data.user.email || '',
                    };
                    onLoginSuccess(user);
                }
            } else if (mode === 'forgot_password') {
                // Send password reset email with Captcha Token
                const { error: authError } = await supabase.auth.resetPasswordForEmail(formData.email, {
                    redirectTo: window.location.origin,
                    captchaToken: captchaToken || undefined
                });
                
                if (authError) throw authError;
                
                setSuccessMessage('Password reset link sent! Check your email.');
                setFormData({ ...formData, email: '' });
            } else if (mode === 'update_password') {
                // Update the authenticated user's password
                const { data, error: authError } = await supabase.auth.updateUser({
                    password: formData.password
                });
                
                if (authError) throw authError;
                
                // Password updated successfully!
                if (data.user) {
                    const user = {
                        id: data.user.id,
                        username: data.user.user_metadata?.username || data.user.email?.split('@')[0] || '',
                        email: data.user.email || '',
                    };
                    onLoginSuccess(user);
                }
            }
        } catch (err: any) {
            let errorMessage = err.message || 'Authentication failed';
            
            // Catch the generic email verification error
            if (errorMessage === 'Email not confirmed') {
                errorMessage = 'Please check your inbox and verify your email address before signing in.';
                setUnverifiedEmail(formData.email);
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
            resetCaptcha(); // Captcha tokens are single-use! Clear it so the user solves a fresh one.
        }
    };

    const switchMode = (newMode: LoginMode) => {
        setMode(newMode);
        setError('');
        setSuccessMessage('');
        resetCaptcha(); 
        setUnverifiedEmail(null); 
        setFormData({
            username: '',
            email: mode === 'forgot_password' && newMode === 'login' ? formData.email : '',
            password: '',
            confirmPassword: ''
        });
    };

    // Derived text values
    const getTitleAndSubtitle = () => {
        if (mode === 'login') return { title: 'Welcome back, director', btn: 'Sign In' };
        if (mode === 'signup') return { title: 'Join the stage', btn: 'Create Account' };
        if (mode === 'forgot_password') return { title: 'Reset your password', btn: 'Send Reset Link' };
        if (mode === 'update_password') return { title: 'Set new password', btn: 'Update Password' };
        return { title: 'Stage Motion', btn: 'Submit' };
    };

    const { title, btn } = getTitleAndSubtitle();

    return (
        <div className="login-container">
            <div className="login-background">
                <div className="gradient-orb orb-1"></div>
                <div className="gradient-orb orb-2"></div>
                <div className="gradient-orb orb-3"></div>
            </div>

            {/* Stage elements */}
            <div className="stage-scene">
                {/* Curtains */}
                <div className="curtain curtain-left"></div>
                <div className="curtain curtain-right"></div>
                <div className="curtain-valance"></div>

                {/* Spotlights */}
                <div className="spotlight spotlight-1"></div>
                <div className="spotlight spotlight-2"></div>
                <div className="spotlight spotlight-3"></div>

                {/* Stage figures */}
                <div className="stage-floor">
                    <div className="stage-figure figure-1">
                        <div className="figure-head"></div>
                        <div className="figure-body"></div>
                    </div>
                    <div className="stage-figure figure-2">
                        <div className="figure-head"></div>
                        <div className="figure-body"></div>
                    </div>
                    <div className="stage-figure figure-3">
                        <div className="figure-head"></div>
                        <div className="figure-body"></div>
                    </div>
                </div>
            </div>

            <div className="login-card">
                <div className="login-header">
                    <div className="login-icon">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                            <path d="M2 17l10 5 10-5"/>
                            <path d="M2 12l10 5 10-5"/>
                        </svg>
                    </div>
                    <h1 className="login-title">Stage Motion</h1>
                    <p className="login-subtitle">
                        {title}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && (
                        <div className="error-message" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                                    <path d="M8 1C4.13 1 1 4.13 1 8s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm0 13c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm1-10H7v5h2V4zm0 6H7v2h2v-2z" fill="currentColor" />
                                </svg>
                                <span>{error}</span>
                            </div>
                            {unverifiedEmail && (
                                <button 
                                    type="button"
                                    onClick={handleResendVerification}
                                    style={{ 
                                        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', 
                                        borderRadius: '4px', padding: '8px 12px', color: '#fff', fontSize: '13px',
                                        marginTop: '4px', cursor: 'pointer', transition: 'all 0.2s ease', alignSelf: 'flex-start'
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                                    disabled={loading || !captchaToken}
                                >
                                    Resend Verification Email
                                </button>
                            )}
                        </div>
                    )}

                    {successMessage && (
                        <div className="success-message" style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {mode === 'signup' && (
                        <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                required
                                placeholder="Enter your username"
                                autoComplete="username"
                            />
                        </div>
                    )}

                    {mode !== 'update_password' && (
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                placeholder="your.email@example.com"
                                autoComplete="email"
                            />
                        </div>
                    )}

                    {mode !== 'forgot_password' && (
                        <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label htmlFor="password">{mode === 'update_password' ? 'New Password' : 'Password'}</label>
                                {mode === 'login' && (
                                    <button 
                                        type="button" 
                                        onClick={() => switchMode('forgot_password')}
                                        style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                                        className="hover:underline"
                                    >
                                        Forgot password?
                                    </button>
                                )}
                            </div>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    required
                                    placeholder={mode === 'update_password' ? 'Enter a strong new password' : 'Enter your password'}
                                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                            <path d="M12 5C5.63 5 2 12 2 12s3.63 7 10 7 10-7 10-7-3.63-7-10-7zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" fill="currentColor" />
                                            <circle cx="12" cy="12" r="3" fill="currentColor" />
                                        </svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                            <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {(mode === 'signup' || mode === 'update_password') && (
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                required
                                placeholder="Confirm your password"
                                autoComplete="new-password"
                            />
                        </div>
                    )}

                    {mode !== 'update_password' && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', minHeight: '65px' }}>
                            <Turnstile 
                                ref={turnstileRef}
                                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'} 
                                onSuccess={(token) => {
                                    setCaptchaToken(token);
                                    if (error === 'Please complete the security check') {
                                        setError('');
                                    }
                                }}
                                onExpire={() => setCaptchaToken(null)}
                                onError={() => setCaptchaToken(null)}
                                options={{
                                    theme: 'dark'
                                }}
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading || (mode !== 'update_password' && !captchaToken)}
                    >
                        {loading ? <span className="loading-spinner"></span> : btn}
                    </button>

                    {mode !== 'update_password' && (
                        <div className="form-footer">
                            <button
                                type="button"
                                className="toggle-mode-btn"
                                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                            >
                                {mode === 'login'
                                    ? "Don't have an account? Sign up"
                                    : 'Return to sign in'}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default Login;
