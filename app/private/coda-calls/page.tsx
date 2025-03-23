'use client';

import { createCodaRow } from '@/app/lib/coda';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/ui/header';
import { Phone } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import ReactConfetti from 'react-confetti';

interface CallData {
  name: string;
  duration: number;
  rating: number;
  comments: string;
  dateTime: string;
  rowId: string;
  eventId: string;
  occasionId?: string;
  callType: 'Regular' | 'Incoming' | 'Incoming(Event)' | 'Skip' | 'Event';
  way: 'Voice' | 'Messenger' | 'Video' | 'In person';
}

interface ValidationErrors {
  name?: string;
  duration?: string;
  dateTime?: string;
  comments?: string;
  rowId?: string;
  callType?: string;
  way?: string;
}

function CodaCallsContent() {
  const searchParams = useSearchParams();
  const customDurationRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [customDuration, setCustomDuration] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSqueezed, setIsSqueezed] = useState(false);
  const isDebug = searchParams.get('debug') === 'true';
  const [callData, setCallData] = useState<CallData>({
    name: '',
    duration: 5,
    rating: 5,
    comments: '',
    dateTime: new Date().toISOString().slice(0, 16),
    rowId: '',
    eventId: '',
    occasionId: '',
    callType: 'Regular',
    way: 'Voice',
  });

  useEffect(() => {
    const getSearchParams = async () => {
      const name = searchParams.get('n') || searchParams.get('Name');
      const accessSecret = searchParams.get('s') || searchParams.get('access_secret');
      const rowId = searchParams.get('r') || searchParams.get('RowID');
      const callType = searchParams.get('t') as 'Regular' | 'Incoming' | 'Incoming(Event)' | 'Skip' | null;
      const duration = searchParams.get('d');
      const comments = searchParams.get('c');
      const eventId = searchParams.get('e') || searchParams.get('EventID');
      const dateTime = searchParams.get('dt');
      const way = searchParams.get('w') as 'Voice' | 'Messenger' | 'Video' | 'In person' | null;
      const occasionId = searchParams.get('o') || searchParams.get('OccasionID');

      if (!accessSecret) {
        setError('Missing access secret');
        return;
      }

      if (!rowId) {
        setError('Missing RowID parameter');
        return;
      }

      // Check if this occasion was already logged
      if (occasionId) {
        const loggedOccasions = JSON.parse(localStorage.getItem('loggedOccasions') || '{}');
        const occasionHash = `${rowId}-${occasionId}`;
        if (loggedOccasions[occasionHash]) {
          setShowDuplicateModal(true);
          return;
        }
      }

      const parsedDuration = duration ? parseInt(duration) : null;
      const standardDurations = [1, 3, 5, 10, 20, 30, 45, 60];
      const isCustomDuration = parsedDuration !== null && !standardDurations.includes(parsedDuration);

      // Handle date/time override
      let parsedDateTime = new Date().toISOString().slice(0, 16);
      if (dateTime) {
        try {
          const dt = new Date(dateTime);
          if (isNaN(dt.getTime())) {
            throw new Error('Invalid date format');
          }
          if (!dateTime.includes('T')) {
            const now = new Date();
            dt.setHours(now.getHours());
            dt.setMinutes(now.getMinutes());
          }
          parsedDateTime = dt.toISOString().slice(0, 16);
        } catch (err) {
          console.error('Error parsing date:', err);
        }
      }

      setCallData(prev => {
        const newData = { 
          ...prev, 
          name: name ? decodeURIComponent(name) : prev.name,
          rowId,
          callType: eventId ? 'Event' : (callType || prev.callType),
          duration: parsedDuration || prev.duration,
          comments: comments ? decodeURIComponent(comments) : prev.comments,
          eventId: eventId || prev.eventId,
          dateTime: parsedDateTime,
          way: way || prev.way,
          occasionId: occasionId || prev.occasionId
        };
        return newData;
      });

      if (isCustomDuration) {
        setShowCustomDuration(true);
        setCustomDuration(parsedDuration);
      }
    };

    getSearchParams();
  }, [searchParams]);

  const validateForm = useCallback((): boolean => {
    const errors: ValidationErrors = {};
    let isValid = true;

    if (!callData.rowId) {
      errors.rowId = 'RowID is required';
      isValid = false;
    }

    if (!callData.name.trim()) {
      errors.name = 'Name is required';
      isValid = false;
    }

    if (!callData.callType) {
      errors.callType = 'Call type is required';
      isValid = false;
    }

    if (callData.duration <= 0) {
      errors.duration = 'Duration must be greater than 0';
      isValid = false;
    }
    else if (callData.duration > 120) {
      errors.duration = 'Duration must be less or equal to 120 minutes';
      isValid = false;
    }

    if (!callData.dateTime) {
      errors.dateTime = 'Date and time is required';
      isValid = false;
    } else {
      const selectedDate = new Date(callData.dateTime);
      const now = new Date();
      if (selectedDate > now) {
        errors.dateTime = 'Date and time cannot be in the future';
        isValid = false;
      }
    }

    if (callData.comments.length > 10000) {
      errors.comments = 'Comments cannot exceed 10000 characters';
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  }, [callData]);

  useEffect(() => {
    const isValid = validateForm();
    console.log('Form validity changed:', isValid);
    setIsFormValid(isValid);
  }, [callData, validateForm]);

  const handleDurationClick = useCallback((minutes: number | 'custom') => {
    if (minutes === 'custom') {
      setShowCustomDuration(true);
      setCallData(prev => ({ ...prev, duration: 0 }));
      setTimeout(() => {
        customDurationRef.current?.focus();
      }, 0);
    } else {
      setShowCustomDuration(false);
      setCustomDuration(null);
      setCallData(prev => ({ ...prev, duration: minutes }));
    }
  }, []);

  const handleCustomDurationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const minutes = parseInt(value);
    
    // Update both customDuration and callData
    setCustomDuration(minutes || 0);
    setCallData(prev => ({ 
      ...prev, 
      duration: minutes || 0 
    }));
  }, []);

  const handleRatingClick = useCallback((rating: number) => {
    setCallData(prev => ({ ...prev, rating }));
  }, []);

  const handleDateTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCallData(prev => ({ ...prev, dateTime: e.target.value }));
  }, []);

  const handleCommentsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCallData(prev => ({ ...prev, comments: e.target.value }));
  }, []);

  const handleCallTypeChange = useCallback((type: 'Regular' | 'Incoming' | 'Incoming(Event)' | 'Skip' | 'Event') => {
    setCallData(prev => ({ ...prev, callType: type }));
  }, []);

  const handleWayChange = useCallback((way: 'Voice' | 'Messenger' | 'Video' | 'In person') => {
    setCallData(prev => ({ ...prev, way }));
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      if (!isFormValid) {
        return;
      }

      setIsSubmitting(true);
      const accessSecret = searchParams.get('s') || searchParams.get('access_secret');
      if (!accessSecret) {
        throw new Error("Missing access secret");
      }

      if (!isDebug) {
        await createCodaRow(
          {
            name: callData.name,
            duration: callData.duration,
            rating: callData.rating,
            comments: callData.comments,
            dateTime: callData.dateTime,
            callType: callData.callType,
            rowId: callData.rowId,
            eventId: callData.eventId,
            way: callData.way,
          },
          accessSecret
        );
      } else {
        console.log('Debug mode: Would send data:', callData);
      }

      // Store the logged occasion if occasionId exists
      if (callData.occasionId) {
        const loggedOccasions = JSON.parse(localStorage.getItem('loggedOccasions') || '{}');
        const occasionHash = `${callData.rowId}-${callData.occasionId}`;
        loggedOccasions[occasionHash] = new Date().toISOString();
        localStorage.setItem('loggedOccasions', JSON.stringify(loggedOccasions));
      }

      // Show success modal and confetti
      setShowSuccessModal(true);
      setShowConfetti(true);
      setIsSqueezed(true);

      // Close the window after a delay
      setTimeout(() => {
        setShowConfetti(false);
        window.close();
      }, 5000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [isFormValid, callData, searchParams, isDebug]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Command+Enter (Mac) or Ctrl+Enter (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isFormValid && !isSubmitting) {
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormValid, isSubmitting, handleSubmit]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header title="Coda Calls" icon={<Phone className="w-6 h-6" />} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <Card className="w-full max-w-2xl mx-auto">
            <CardContent className="p-6">
              <div className="text-red-500 text-center">{error}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <ReactConfetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={200}
            gravity={0.3}
            onConfettiComplete={() => setShowConfetti(false)}
            style={{ position: 'fixed', top: 0, left: 0 }}
          />
        </div>
      )}
      
      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-xl text-center text-red-600">Already Logged</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-4">You have already logged this occasion.</p>
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Close
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-xl text-center text-green-600">Success!</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-4">Thank you! Your call has been logged successfully.</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Close
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      <Header title="Coda Calls" icon={<Phone className="w-6 h-6" />} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <Card className={`w-full max-w-2xl mx-auto transition-all duration-500 ${isSqueezed ? 'scale-95' : 'scale-100'}`}>
          <CardContent className="p-8">
            {isSqueezed ? (
              <div className="text-center space-y-4">
                <div className="text-2xl font-medium text-gray-700 dark:text-gray-300">
                  Call logged successfully!
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  Thank you for keeping track of your relationships.
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-2xl text-center">
                    Log Call with {callData.name}
                  </CardTitle>
                </CardHeader>
                {/* Call Type Section */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Call Type</h3>
                  <div className="flex" role="radiogroup" aria-label="Call Type">
                    {((callData.eventId 
                      ? ['Event', 'Incoming', 'Incoming(Event)', 'Skip'] 
                      : ['Regular', 'Incoming', 'Incoming(Event)', 'Skip']) as Array<'Regular' | 'Incoming' | 'Incoming(Event)' | 'Skip' | 'Event'>).map((type, index) => (
                      <button
                        key={type}
                        onClick={() => handleCallTypeChange(type)}
                        tabIndex={0}
                        role="radio"
                        aria-checked={callData.callType === type}
                        disabled={isSqueezed}
                        className={`flex-1 py-2 px-4 text-sm font-medium transition-colors whitespace-nowrap ${
                          index === 0 ? 'rounded-l-lg' : ''
                        } ${
                          index === 3 ? 'rounded-r-lg' : ''
                        } ${
                          callData.callType === type
                            ? type === 'Regular'
                              ? 'bg-gray-500 text-white'
                              : type === 'Event'
                                ? 'bg-purple-500 text-white'
                                : type === 'Incoming' || type === 'Incoming(Event)'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-red-500 text-white'
                            : 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700'
                        } border ${
                          index === 0 ? 'border-r-0' : ''
                        } ${
                          index === 3 ? 'border-l-0' : ''
                        } ${isSqueezed ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Way Section */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Way of Communication</h3>
                  <div className="flex" role="radiogroup" aria-label="Way">
                    {([
                      { value: 'Voice', label: '🎙️ Voice' },
                      { value: 'Messenger', label: '💬 Messenger' },
                      { value: 'Video', label: '📹 Video' },
                      { value: 'In person', label: '👥 In&nbsp;person' }
                    ] as Array<{ value: 'Voice' | 'Messenger' | 'Video' | 'In person', label: string }>).map((way, index) => (
                      <button
                        key={way.value}
                        onClick={() => handleWayChange(way.value)}
                        tabIndex={0}
                        role="radio"
                        aria-checked={callData.way === way.value}
                        disabled={isSqueezed}
                        className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                          index === 0 ? 'rounded-l-lg' : ''
                        } ${
                          index === 3 ? 'rounded-r-lg' : ''
                        } ${
                          callData.way === way.value
                            ? 'bg-blue-500 text-white'
                            : 'bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700'
                        } border ${
                          index === 0 ? 'border-r-0' : ''
                        } ${
                          index === 3 ? 'border-l-0' : ''
                        } ${isSqueezed ? 'opacity-50 cursor-not-allowed' : ''}`}
                        dangerouslySetInnerHTML={{ __html: way.label }}
                      />
                    ))}
                  </div>
                </div>

                {/* Duration Section */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Duration (minutes)</h3>
                  <div className="grid grid-cols-3 gap-2" role="group" aria-label="Duration">
                    {[1, 3, 5, 10, 20, 30, 45, 60, 'custom'].map((minutes) => (
                      <button
                        key={minutes}
                        onClick={() => handleDurationClick(minutes as number | 'custom')}
                        tabIndex={0}
                        role="radio"
                        disabled={isSqueezed}
                        aria-checked={
                          (minutes === 'custom' && showCustomDuration) || 
                          (typeof minutes === 'number' && callData.duration === minutes)
                        }
                        className={`p-3 rounded-lg border transition-colors whitespace-nowrap ${
                          (minutes === 'custom' && showCustomDuration) || 
                          (typeof minutes === 'number' && callData.duration === minutes)
                            ? 'bg-blue-500 text-white border-blue-600'
                            : 'bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700'
                        } ${isSqueezed ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {minutes === 'custom' ? 'Custom' : `${minutes} min${minutes === 1 ? '' : 's'}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Duration Input */}
                {showCustomDuration && (
                  <div className="mt-2">
                    <input
                      ref={customDurationRef}
                      type="number"
                      value={customDuration?.toString() || ''}
                      onChange={handleCustomDurationChange}
                      placeholder="Enter duration in minutes"
                      className="w-full p-2 border rounded dark:bg-slate-800"
                      min="1"
                      max="120"
                      tabIndex={0}
                      disabled={isSqueezed}
                    />
                    {validationErrors.duration && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.duration}</p>
                    )}
                  </div>
                )}

                {/* Rating Stars */}
                <div className="flex justify-center space-x-2" role="group" aria-label="Rating">
                  {[1, 2, 3, 4, 5, 6].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRatingClick(star)}
                      tabIndex={0}
                      role="radio"
                      disabled={isSqueezed}
                      aria-checked={star === callData.rating}
                      className={`text-2xl focus:outline-none ${isSqueezed ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {star <= callData.rating ? '★' : '☆'}
                    </button>
                  ))}
                </div>

                {/* DateTime Input */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Date and Time
                  </label>
                  <input
                    type="datetime-local"
                    value={callData.dateTime}
                    onChange={handleDateTimeChange}
                    className="w-full p-2 border rounded dark:bg-slate-800"
                    tabIndex={0}
                    disabled={isSqueezed}
                  />
                  {validationErrors.dateTime && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.dateTime}</p>
                  )}
                </div>

                {/* Comments */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Comments
                  </label>
                  <textarea
                    value={callData.comments}
                    onChange={handleCommentsChange}
                    className="w-full p-2 border rounded h-32 dark:bg-slate-800"
                    placeholder="Add any notes about the call..."
                    maxLength={1000}
                    tabIndex={0}
                    autoComplete="on"
                    disabled={isSqueezed}
                  />
                  {validationErrors.comments && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.comments}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={!isFormValid || isSubmitting || isSqueezed}
                  tabIndex={0}
                  className={`w-full py-3 rounded-lg transition-colors flex items-center justify-center ${
                    isFormValid && !isSubmitting && !isSqueezed
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save to Coda'
                  )}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function CodaCallsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header title="Coda Calls" icon={<Phone className="w-6 h-6" />} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <Card className="w-full max-w-2xl mx-auto">
            <CardContent className="p-6">
              <div className="text-center">Loading...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <CodaCallsContent />
    </Suspense>
  );
} 