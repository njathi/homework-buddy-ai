'use client';
import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { UploadCloud, Mic, ImageIcon } from 'lucide-react';

// Type definitions
interface User {
  email: string;
  name?: string;
  picture?: string;
}

interface HistoryItem {
  question: string;
  answer: string;
  timestamp: number;
}

const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
const recognizer = SpeechRecognition ? new SpeechRecognition() : null;

export default function HomeworkHelperUI() {
  const [question, setQuestion] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [showTopUp, setShowTopUp] = useState<boolean>(false);
  const [processingPayment, setProcessingPayment] = useState<boolean>(false);
  const [showAuth, setShowAuth] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });
  const [token, setToken] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || '';
    }
    return '';
  });
  const userId = user ? user.email : null;
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [feedbackGiven, setFeedbackGiven] = useState<boolean>(false);
  const [showFollowup, setShowFollowup] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [promoCode, setPromoCode] = useState<string>('');
  const [promoMsg, setPromoMsg] = useState<string>('');
  const [showError, setShowError] = useState<boolean>(true);
  const [gradeLevel, setGradeLevel] = useState<string>('Parent-friendly');
  const [stepByStep, setStepByStep] = useState<boolean>(false);

  const fetchCredits = async (): Promise<void> => {
    try {
      const res = await fetch(`/api/user/credits?userId=${userId}`);
      const data = await res.json();
      setCredits(data.credits);
    } catch (err) {
      console.error('Failed to fetch credits', err);
      setError('Could not load credits.');
    }
  };

  const triggerStkPush = async (amount: number): Promise<void> => {
    try {
      setProcessingPayment(true);
      const res = await fetch('/api/mpesa/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '254712345678', amount, userId })
      });
      const data = await res.json();
      alert(data.message || 'Payment initiated. Check your phone.');
    } catch (err) {
      console.error('M-PESA STK error', err);
      alert('Failed to initiate payment. Try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleVoiceInput = (): void => {
    if (!recognizer) return alert('Speech recognition not supported in this browser.');

    recognizer.continuous = false;
    recognizer.interimResults = false;
    recognizer.lang = 'en-US';

    recognizer.onstart = () => setIsListening(true);
    recognizer.onend = () => setIsListening(false);

    recognizer.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setQuestion((prev: string) => (prev ? prev + ' ' : '') + transcript);
    };

    recognizer.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognizer.start();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      setImage(reader.result as string);
      setLoading(true);
      try {
        const ocrRes = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: reader.result, userId })
        });
        const { text } = await ocrRes.json();
        setQuestion(text);
      } catch (error) {
        console.error('OCR failed:', error);
        setError('OCR processing failed.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Analytics event logger
  const logEvent = async (eventType: string, details: Record<string, any> = {}): Promise<void> => {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, eventType, details })
    });
  };

  // Log question asked
  const handleSubmit = async (): Promise<void> => {
    if (!question.trim()) return;
    if (credits !== null && credits <= 0) {
      setError('You have no credits left.');
      setShowTopUp(true);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: question,
          userId,
          gradeLevel,
          stepByStep,
        })
      });
      const { answer } = await res.json();
      setResponse(answer);
      await logEvent('question_asked', { question, gradeLevel, stepByStep });
      const creditRes = await fetch('/api/user/deduct-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const creditData = await creditRes.json();
      setCredits(creditData.credits);
      await logEvent('credit_used', { newCredits: creditData.credits });
    } catch (error) {
      console.error('AI response failed:', error);
      setResponse("Sorry, I couldn't understand that. Please try again.");
      setError('Failed to get AI response.');
    } finally {
      setLoading(false);
    }
  };

  // Onboarding modal logic
  useEffect(() => {
    const seenOnboarding = localStorage.getItem('seenOnboarding');
    if (!seenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleCloseOnboarding = (): void => {
    setShowOnboarding(false);
    localStorage.setItem('seenOnboarding', 'true');
  };

  // Log feedback given
  const handleFeedback = (type: 'yes' | 'no'): void => {
    setFeedback(type);
    setFeedbackGiven(true);
    logEvent('feedback_given', { feedback: type, question, answer: response });
    if (type === 'no') setShowFollowup(true);
  };

  // Log followup feedback
  const handleFollowup = (type: 'simpler' | 'detail'): void => {
    setShowFollowup(false);
    setResponse('');
    setQuestion((prev: string) => prev ? prev : '');
    setFeedbackGiven(false);
    setFeedback(null);
    logEvent('feedback_followup', { followup: type, question });
    if (type === 'simpler') {
      setQuestion((prev: string) => prev + ' Please explain in simpler terms.');
    } else if (type === 'detail') {
      setQuestion((prev: string) => prev + ' Please provide more detail.');
    }
  };

  // Load history from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('qaHistory');
    if (stored) setHistory(JSON.parse(stored));
  }, []);

  // Save to history after a successful answer
  useEffect(() => {
    if (response && question) {
      const newEntry: HistoryItem = { question, answer: response, timestamp: Date.now() };
      const updated = [newEntry, ...history].slice(0, 20); // keep last 20
      setHistory(updated);
      localStorage.setItem('qaHistory', JSON.stringify(updated));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const handleHistoryClick = (q: string): void => {
    setQuestion(q);
    setShowHistory(false);
    setResponse('');
    setFeedbackGiven(false);
    setFeedback(null);
    setShowFollowup(false);
  };

  // Grant free trial credits if new user and no credits
  useEffect(() => {
    if (credits === 0 && !localStorage.getItem('freeTrialGiven')) {
      setCredits(3);
      localStorage.setItem('freeTrialGiven', 'true');
      // Optionally, you could POST to backend to update credits for real users
    }
  }, [credits]);

  // Log subscription changes
  const handleSubscribe = async (): Promise<void> => {
    try {
      await fetch('/api/user/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscribe: true })
      });
      setIsSubscribed(true);
      setShowTopUp(false);
      setCredits(9999); // simulate unlimited
      await logEvent('subscribed', {});
    } catch (err) {
      setError('Failed to subscribe.');
    }
  };

  const handleCancelSubscription = async (): Promise<void> => {
    try {
      await fetch('/api/user/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscribe: false })
      });
      setIsSubscribed(false);
      setCredits(0);
      await logEvent('subscription_cancelled', {});
    } catch (err) {
      setError('Failed to cancel subscription.');
    }
  };

  // Log promo code applied
  const handleApplyPromo = async (): Promise<void> => {
    let promoSuccess = false;
    if (promoCode.trim().toUpperCase() === 'SCHOOL100') {
      setCredits(100);
      setPromoMsg('Success! 100 free credits added.');
      setShowTopUp(false);
      promoSuccess = true;
    } else if (promoCode.trim().toUpperCase() === 'FAMILYFREE') {
      setIsSubscribed(true);
      setCredits(9999);
      setPromoMsg('Success! Unlimited access granted.');
      setShowTopUp(false);
      promoSuccess = true;
    } else {
      setPromoMsg('Invalid code. Please try again.');
    }
    await logEvent('promo_applied', { code: promoCode, success: promoSuccess });
  };

  // Error dismiss logic
  useEffect(() => {
    if (error) setShowError(true);
  }, [error]);

  // Remove localStorage for credits, history, and subscription
  // Fetch credits, history, and subscription from backend on mount
  useEffect(() => {
    fetchCredits();
    fetchHistory();
    fetchSubscription();
    // eslint-disable-next-line
  }, []);

  // Fetch history from backend
  const fetchHistory = async (): Promise<void> => {
    try {
      const res = await fetch(`/api/user/history?userId=${userId}`);
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err) {
      setError('Could not load history.');
    }
  };

  // Save new Q&A to backend after each answer
  useEffect(() => {
    if (response && question) {
      fetch('/api/user/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, question, answer: response })
      }).then(() => fetchHistory());
    }
    // eslint-disable-next-line
  }, [response]);

  // Fetch subscription status from backend
  const fetchSubscription = async (): Promise<void> => {
    try {
      const res = await fetch(`/api/user/subscription?userId=${userId}`);
      const data = await res.json();
      setIsSubscribed(data.subscribed);
    } catch (err) {
      setError('Could not load subscription status.');
    }
  };

  // Auth handlers
  const handleAuth = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auth failed');
      if (authMode === 'signup') {
        setAuthMode('login');
        setAuthError('Signup successful! Please log in.');
        return;
      }
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
      setShowAuth(false);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  const handleLogout = (): void => {
    setUser(null);
    setToken('');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  // Google Sign-In handler
  useEffect(() => {
    if (!window.google || user) return;
    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'REPLACE_WITH_YOUR_GOOGLE_CLIENT_ID',
      callback: (response: any) => {
        // Decode JWT to get user info
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const profile = JSON.parse(jsonPayload);
        const googleUser: User = { email: profile.email, name: profile.name, picture: profile.picture };
        setUser(googleUser);
        setToken(response.credential);
        localStorage.setItem('user', JSON.stringify(googleUser));
        localStorage.setItem('token', response.credential);
      },
    });
    window.google.accounts.id.renderButton(
      document.getElementById('google-signin-btn')!,
      { theme: 'outline', size: 'large', width: 260 }
    );
  }, [user]);

  // Require login before using main features
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white shadow-md rounded-xl p-8 w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold mb-4">Homework Helper AI</h1>
          <p className="mb-4 text-gray-600">Sign up or log in to get started.</p>
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              required
              autoFocus
            />
            <input
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              required
            />
            {authError && <div className="text-red-600 text-sm">{authError}</div>}
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-semibold">
              {authMode === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          </form>
          <div className="my-4 flex items-center justify-center">
            <span className="h-px w-16 bg-gray-300" />
            <span className="mx-2 text-gray-400 text-xs">OR</span>
            <span className="h-px w-16 bg-gray-300" />
          </div>
          <div id="google-signin-btn" className="flex justify-center"></div>
          <div className="mt-4 text-sm">
            {authMode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button className="text-blue-600 underline" onClick={() => { setAuthMode('signup'); setAuthError(''); }}>Sign up</button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button className="text-blue-600 underline" onClick={() => { setAuthMode('login'); setAuthError(''); }}>Log in</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-2 sm:p-6">
      {/* Loading Spinner Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <Spinner />
          <span className="text-white text-lg ml-4">Processing...</span>
        </div>
      )}
      {/* Error Alert */}
      {error && showError && (
        <Alert type="error" className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-xs w-full">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button className="ml-4 text-red-700 font-bold" onClick={() => setShowError(false)} aria-label="Dismiss error">&times;</button>
          </div>
        </Alert>
      )}
      {/* Onboarding Modal */}
      <Modal open={showOnboarding} onClose={handleCloseOnboarding}>
        <div className="bg-white p-6 rounded-xl shadow-md max-w-sm w-full text-center" tabIndex={-1}>
          <h2 id="onboarding-title" className="text-lg font-semibold mb-4">Welcome to Homework Helper AI!</h2>
          <ul className="text-left mb-4 list-disc list-inside text-gray-700">
            <li>Type your question, upload a photo, or use voice input.</li>
            <li>Get a simple, friendly explanation for any homework problem.</li>
            <li>Pay per question or subscribe for unlimited access.</li>
            <li>Track your credits at the top of the page.</li>
          </ul>
          <Button className="w-full" aria-label="Close onboarding" onClick={handleCloseOnboarding} tabIndex={0}>Got it!</Button>
        </div>
      </Modal>
      {/* History Modal */}
      <Modal open={showHistory} onClose={() => setShowHistory(false)}>
        <div className="bg-white p-6 rounded-xl shadow-md max-w-lg w-full text-center overflow-y-auto max-h-[80vh]" tabIndex={-1}>
          <h2 id="history-title" className="text-lg font-semibold mb-4">Your Q&A History</h2>
          {history.length === 0 ? (
            <div className="text-gray-500">No history yet.</div>
          ) : (
            <ul className="text-left space-y-4">
              {history.map((item, idx) => (
                <li key={item.timestamp + idx} className="border-b pb-2">
                  <div className="font-semibold">Q: {item.question}</div>
                  <div className="text-gray-700">A: {item.answer}</div>
                  <Button size="sm" className="mt-1" aria-label={`Ask again: ${item.question}`} onClick={() => handleHistoryClick(item.question)}>Ask Again</Button>
                </li>
              ))}
            </ul>
          )}
          <Button className="w-full mt-4" variant="outline" aria-label="Close history" onClick={() => setShowHistory(false)} tabIndex={0}>Close</Button>
        </div>
      </Modal>
      {/* Top-Up Modal */}
      <Modal open={showTopUp} onClose={() => setShowTopUp(false)}>
        <div className="bg-white p-6 rounded-xl shadow-md max-w-sm w-full text-center">
          <h2 className="text-lg font-semibold mb-4">Out of credits</h2>
          <p className="mb-4">Top up to continue using Homework Helper.</p>
          <div className="mb-2 text-sm text-blue-700">
            Subscription status: {isSubscribed ? 'Active (Unlimited questions)' : 'Not subscribed'}
          </div>
          <div className="mb-2">
            <input
              type="text"
              placeholder="Promo/Partner Code"
              value={promoCode}
              onChange={e => setPromoCode(e.target.value)}
              className="border rounded px-2 py-1 w-full mb-1"
            />
            <Button className="w-full mb-1" variant="outline" onClick={handleApplyPromo}>Apply Code</Button>
            {promoMsg && <div className="text-sm mt-1 text-green-700">{promoMsg}</div>}
          </div>
          {!isSubscribed ? (
            <>
          <Button className="w-full mb-2" onClick={() => triggerStkPush(10)} disabled={processingPayment}>Pay KES 10</Button>
              <Button className="w-full mb-2" onClick={handleSubscribe} disabled={processingPayment}>Subscribe (KES 300/month)</Button>
            </>
          ) : (
            <Button className="w-full mb-2" variant="outline" onClick={handleCancelSubscription}>Cancel Subscription</Button>
          )}
          <Button variant="outline" className="w-full" onClick={() => setShowTopUp(false)}>Cancel</Button>
        </div>
      </Modal>
      <header className="w-full flex justify-end items-center mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">{user.email}</span>
          <Button size="sm" variant="outline" onClick={handleLogout}>Log out</Button>
        </div>
      </header>
      <h1 className="text-3xl font-bold mb-4 text-center">Homework Helper AI</h1>
      <p className="text-gray-600 mb-6 text-center max-w-xl">
        Snap a photo or type in a homework question. Get a simple, friendly explanation in seconds.
      </p>
      <div className="text-sm text-green-700 mb-4">Credits: {credits !== null ? credits : 'Loading...'}</div>
      <div className="flex justify-end w-full max-w-xl mb-2">
        <Button size="sm" variant="outline" aria-label="Show history" onClick={() => setShowHistory(true)} tabIndex={0}>History</Button>
      </div>
      <div className="w-full max-w-xl bg-white shadow-md rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
          <label className="flex flex-col text-sm font-medium">
            Grade/Level
            <select
              value={gradeLevel}
              onChange={e => setGradeLevel(e.target.value)}
              className="border rounded px-2 py-1 mt-1"
              aria-label="Select grade or level for explanation"
            >
              <option>Parent-friendly</option>
              <option>Primary</option>
              <option>High School</option>
              <option>University</option>
            </select>
          </label>
          <label className="flex items-center space-x-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={stepByStep}
              onChange={e => setStepByStep(e.target.checked)}
              className="accent-blue-600"
              aria-label="Show step-by-step solution"
            />
            <span>Step-by-step</span>
          </label>
        </div>
        <Input
          placeholder="Type your homework question here..."
          value={question}
          aria-label="Homework question input"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuestion(e.target.value)}
        />
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <label className="flex items-center space-x-1 cursor-pointer" aria-label="Upload photo of homework question">
            <ImageIcon size={16} aria-hidden="true" />
            <span>Upload Photo</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" aria-label="Upload image" />
          </label>
          <Button variant="outline" className="flex items-center space-x-1" aria-label={isListening ? 'Listening for voice input' : 'Start voice input'} onClick={handleVoiceInput} tabIndex={0}>
            <Mic size={16} className={isListening ? 'animate-pulse text-red-500' : ''} aria-hidden="true" />
            <span>{isListening ? 'Listening...' : 'Speak'}</span>
          </Button>
          <Button onClick={handleSubmit} disabled={loading} aria-label="Get help with question" tabIndex={0}>{loading ? 'Loading...' : 'Get Help'}</Button>
        </div>
        {response && (
          <React.Fragment>
          <Card>
            <CardContent className="p-4">
              <p className="text-gray-800 whitespace-pre-wrap">{response}</p>
            </CardContent>
          </Card>
            {/* Feedback Section */}
            {!feedbackGiven && (
              <div className="flex items-center space-x-2 mt-2">
                <span>Was this helpful?</span>
                <Button size="sm" variant="outline" onClick={() => handleFeedback('yes')}>Yes</Button>
                <Button size="sm" variant="outline" onClick={() => handleFeedback('no')}>No</Button>
              </div>
            )}
            {showFollowup && (
              <div className="flex items-center space-x-2 mt-2">
                <span>How can we improve?</span>
                <Button size="sm" variant="outline" onClick={() => handleFollowup('simpler')}>Make it simpler</Button>
                <Button size="sm" variant="outline" onClick={() => handleFollowup('detail')}>Give more detail</Button>
              </div>
            )}
            {feedbackGiven && feedback === 'yes' && (
              <div className="text-green-600 mt-2">Thank you for your feedback!</div>
            )}
          </React.Fragment>
        )}
      </div>
    </div>
  );
}
