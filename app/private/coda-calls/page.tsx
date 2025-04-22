'use client';

import { createCodaRow, getCodaFriendsList } from '@/app/lib/coda';
import { isOccasionLogged, markOccasionAsLogged } from '@/app/lib/kv';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/ui/header';
import { ArrowUpDown, Phone, Search, Settings } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactConfetti from 'react-confetti';
import { Toaster, toast } from 'sonner';

interface CodaFriend {
  name: string;
  rowUid: string;
  callHistoryCount: number;
}

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
  const [isOccasionAlreadyLogged, setIsOccasionAlreadyLogged] = useState(false);
  const isDebug = searchParams.get('debug') === 'true';
  
  // Advanced Options State
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [advancedOption, setAdvancedOption] = useState<'nextDaytime' | 'daysUntil' | null>(null);
  const [nextDaytimeValue, setNextDaytimeValue] = useState<string | null>(null);
  const [daysUntilValue, setDaysUntilValue] = useState<number | null>(null);

  // Friend selection state
  const [friends, setFriends] = useState<CodaFriend[]>([]);
  const [sortOrder, setSortOrder] = useState<'alphabetical' | 'frequency'>('frequency');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);

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

  // Sort and filter friends
  const sortedAndFilteredFriends = useMemo(() => {
    let filtered = friends;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(friend => 
        friend.name.toLowerCase().includes(query)
      );
    }

    return [...filtered].sort((a, b) => {
      if (sortOrder === 'alphabetical') {
        return a.name.localeCompare(b.name);
      } else {
        return b.callHistoryCount - a.callHistoryCount;
      }
    });
  }, [friends, sortOrder, searchQuery]);

  // Initial setup and parameter handling
  useEffect(() => {
    const setupFromParams = async () => {
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

      // Function to get current local time as YYYY-MM-DDTHH:mm
      const getCurrentLocalISOString = () => {
          const now = new Date();
          const tzOffset = now.getTimezoneOffset() * 60000; // offset in milliseconds
          // Create Date object adjusted for local timezone, then convert to ISO and slice
          return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
      };

      // Handle date/time override
      let finalDateTimeString: string;

      if (dateTime) {
        try {
          // Check if only date is provided (no 'T')
          if (!dateTime.includes('T')) {
            const datePart = dateTime; // Assuming 'YYYY-MM-DD' format
            if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
                 throw new Error('Invalid date format (expected YYYY-MM-DD)');
            }
            const now = new Date(); // Get current local time
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            // Construct YYYY-MM-DDTHH:mm string directly
            finalDateTimeString = `${datePart}T${hours}:${minutes}`;
          } else {
            // dateTime includes 'T', parse and adjust to local YYYY-MM-DDTHH:mm
            const dt = new Date(dateTime);
            if (isNaN(dt.getTime())) {
              throw new Error('Invalid date/time format');
            }
            const tzOffset = dt.getTimezoneOffset() * 60000;
            finalDateTimeString = new Date(dt.getTime() - tzOffset).toISOString().slice(0, 16);
          }
        } catch (err) {
          console.error('Error parsing date/time parameter:', err);
          finalDateTimeString = getCurrentLocalISOString(); // Fallback to current local time
        }
      } else {
         // No dateTime parameter, use current local time
         finalDateTimeString = getCurrentLocalISOString();
      }

      // Process duration parameter
      const parsedDuration = duration ? parseInt(duration) : null;
      const standardDurations = [1, 3, 5, 10, 20, 30, 45, 60];
      const isCustomDuration = parsedDuration !== null && !standardDurations.includes(parsedDuration);

      // Update call data state
      setCallData(prev => ({
        ...prev,
        name: name ? decodeURIComponent(name) : prev.name,
        rowId: rowId || prev.rowId,
        callType: eventId ? 'Event' : (callType || prev.callType),
        // Use parsedDuration only if it's standard, otherwise keep default/previous
        duration: (parsedDuration !== null && !isCustomDuration) ? parsedDuration : prev.duration,
        comments: comments ? decodeURIComponent(comments) : prev.comments,
        eventId: eventId || prev.eventId,
        dateTime: finalDateTimeString, // Use the final processed string
        way: way || prev.way,
        occasionId: occasionId || prev.occasionId
      }));

      // Set state for custom duration UI if needed
      if (isCustomDuration) {
        setShowCustomDuration(true);
        setCustomDuration(parsedDuration);
      }

      // Only load friends list if no rowId is provided
      if (!rowId) {
        try {
          setIsLoadingFriends(true);
          const friendsList = await getCodaFriendsList(accessSecret);
          setFriends(friendsList);
          setShowFriendModal(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load friends');
        } finally {
          setIsLoadingFriends(false);
        }
        return;
      }

      // Handle occasion checking only when both rowId and occasionId are provided
      if (rowId && occasionId) {
        try {
          const isLogged = await isOccasionLogged(rowId, occasionId);
          if (isLogged) {
            setShowDuplicateModal(true);
            setIsOccasionAlreadyLogged(true);
            return;
          }
        } catch (err) {
          console.error('Error checking occasion status:', err);
          // Continue without blocking in case of Redis error
        }
      }
    };

    setupFromParams();
  }, [searchParams]);

  // Handle friend selection
  const handleFriendSelect = useCallback((friend: CodaFriend) => {
    setCallData(prev => ({
      ...prev,
      name: friend.name,
      rowId: friend.rowUid
    }));
    setShowFriendModal(false);
  }, []);

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

    if (callData.callType !== 'Skip') {
      if (callData.duration <= 0) {
        errors.duration = 'Duration must be greater than 0';
        isValid = false;
      }
      else if (callData.duration > 300) {
        errors.duration = 'Duration must be less or equal to 300 minutes';
        isValid = false;
      }
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

    if (callData.callType !== 'Skip' && callData.comments.length > 10000) {
      errors.comments = 'Comments cannot exceed 10000 characters';
      isValid = false;
    }

    // Advanced options validation
    if (advancedOption === 'nextDaytime' && !nextDaytimeValue) {
      isValid = false;
    }
    if (advancedOption === 'daysUntil' && (daysUntilValue === null || daysUntilValue < 0)) {
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  }, [callData, advancedOption, nextDaytimeValue, daysUntilValue]);

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

  const handleAdvancedOptionChange = useCallback((option: 'nextDaytime' | 'daysUntil' | null) => {
    setAdvancedOption(option);
    // Reset the other value when switching
    if (option === 'nextDaytime') {
      setDaysUntilValue(null);
    } else if (option === 'daysUntil') {
      setNextDaytimeValue(null);
    } else {
        setDaysUntilValue(null);
        setNextDaytimeValue(null);
    }
  }, []);

  const handleNextDaytimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNextDaytimeValue(e.target.value);
  }, []);

  const handleDaysUntilChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? null : parseInt(e.target.value);
    // Add basic validation for daysUntilValue if needed, e.g., min/max
    setDaysUntilValue(value);
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      if (!isFormValid) {
        return;
      }

      setIsSubmitting(true);
      toast.info('Saving your call log...', {
        duration: 2000 // Long duration as we don't know how long the API call will take
      });

      const accessSecret = searchParams.get('s') || searchParams.get('access_secret');
      if (!accessSecret) {
        throw new Error("Missing access secret");
      }

      // Prepare submission data with Skip defaults if needed
      const submissionData = {
        ...callData,
        ...(callData.callType === 'Skip' ? {
          duration: 5,
          rating: 5,
          way: 'Voice',
          comments: ''
        } : {}),
        // Add advanced options if selected
        ...(advancedOption === 'nextDaytime' && nextDaytimeValue ? { nextCallTime: nextDaytimeValue } : {}),
        ...(advancedOption === 'daysUntil' && daysUntilValue !== null ? { daysUntilNextCall: daysUntilValue } : {})
      };

      if (!isDebug) {
        await createCodaRow(
          submissionData,
          accessSecret
        );

        // Mark occasion as logged if it exists
        if (submissionData.rowId && submissionData.occasionId) {
          try {
            await markOccasionAsLogged(submissionData.rowId, submissionData.occasionId);
          } catch (err) {
            console.error('Error marking occasion as logged:', err);
            // Continue without blocking in case of Redis error
          }
        }
      } else {
        console.log('Debug mode: Would send data:', submissionData);
      }

      // Show success modal and confetti
      setShowSuccessModal(true);
      setShowConfetti(true);
      setIsSqueezed(true);

      // Close the window after a 3-second delay
      setTimeout(() => {
        setShowConfetti(false);
        window.close();
      }, 3000); // Reduced from 5000

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [isFormValid, callData, searchParams, isDebug, advancedOption, nextDaytimeValue, daysUntilValue]);

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

  // Auto-close when duplicate modal is shown
  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;
    if (showDuplicateModal) {
      timerId = setTimeout(() => {
        window.close();
      }, 3000); // Close after 3 seconds
    }
    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [showDuplicateModal]);

  // Determine if the submit button should be disabled
  const isButtonDisabled = !isFormValid || isSubmitting || isSqueezed || isOccasionAlreadyLogged;

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Toaster position="top-center" closeButton richColors />
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
      <Toaster position="top-center" closeButton richColors />
      {/* Friend Selection Modal */}
      {showFriendModal && (
        <div className="fixed left-0 top-0 right-0 bottom-0 w-full h-full bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <CardHeader className="flex-none">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Select Friend</CardTitle>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setSortOrder(prev => 
                      prev === 'alphabetical' ? 'frequency' : 'alphabetical'
                    )}
                    className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-500"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    <span>{sortOrder === 'alphabetical' ? 'A→Z' : 'Frequency'}</span>
                  </button>
                </div>
              </div>
              <div className="mt-4 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search friends..."
                  className="w-full p-2 pr-8 border rounded dark:bg-slate-800"
                />
                <Search className="absolute right-2 top-2.5 w-5 h-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {isLoadingFriends ? (
                <div className="text-center py-4">Loading friends...</div>
              ) : (
                <div className="space-y-2">
                  {sortedAndFilteredFriends.map(friend => (
                    <button
                      key={friend.rowUid}
                      onClick={() => handleFriendSelect(friend)}
                      className="w-full p-3 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
                    >
                      <span>{friend.name}</span>
                      <span className="text-sm text-gray-500">
                        {friend.callHistoryCount} calls
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {showConfetti && (
        <div className="fixed left-0 top-0 right-0 bottom-0 w-full h-full pointer-events-none z-50">
          <ReactConfetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={200}
            gravity={0.3}
            onConfettiComplete={() => setShowConfetti(false)}
          />
        </div>
      )}
      
      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <div className="fixed left-0 top-0 right-0 bottom-0 w-full h-full bg-black/50 flex items-center justify-center z-50">
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
        <div className="fixed left-0 top-0 right-0 bottom-0 w-full h-full bg-black/50 flex items-center justify-center z-50">
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
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 transition-all duration-200 ${isTextareaFocused ? 'pb-48 md:pb-8' : ''}`}>
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
                        className={`flex-1 py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                          index === 0 ? 'rounded-l-lg' : ''
                        } ${ 
                          index === (callData.eventId ? 3 : 3) ? 'rounded-r-lg' : ''
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
                          index > 0 ? 'border-l-0' : ''
                        } ${isSqueezed ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Way Section */}
                {callData.callType !== 'Skip' && (
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
                          className={`flex-1 py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium transition-colors ${
                            index === 0 ? 'rounded-l-lg' : ''
                          } ${ 
                            index === 3 ? 'rounded-r-lg' : ''
                          } ${ 
                            callData.way === way.value
                              ? 'bg-blue-500 text-white'
                              : 'bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700'
                          } border ${ 
                            index > 0 ? 'border-l-0' : ''
                          } ${isSqueezed ? 'opacity-50 cursor-not-allowed' : ''}`}
                          dangerouslySetInnerHTML={{ __html: way.label }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Duration Section */}
                {callData.callType !== 'Skip' && (
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
                )}

                {/* Custom Duration Input */}
                {showCustomDuration && callData.callType !== 'Skip' && (
                  <div className="mt-2">
                    <input
                      ref={customDurationRef}
                      type="number"
                      value={customDuration?.toString() || ''}
                      onChange={handleCustomDurationChange}
                      placeholder="Enter duration in minutes"
                      className="w-full p-2 border rounded dark:bg-slate-800"
                      min="1"
                      max="300"
                      tabIndex={0}
                      disabled={isSqueezed}
                    />
                    {validationErrors.duration && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.duration}</p>
                    )}
                  </div>
                )}

                {/* Rating Stars */}
                {callData.callType !== 'Skip' && (
                  <div className="flex justify-center space-x-2" role="group" aria-label="Rating">
                    {[1, 2, 3, 4, 5, 6].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRatingClick(star)}
                        tabIndex={0}
                        role="radio"
                        disabled={isSqueezed}
                        aria-checked={star === callData.rating}
                        className={`text-2xl focus:outline-hidden ${isSqueezed ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {star <= callData.rating ? '★' : '☆'}
                      </button>
                    ))}
                  </div>
                )}

                {/* DateTime Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">
                      Date and Time
                    </label>
                    <button
                      onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                      className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 ${isAdvancedOpen ? 'bg-gray-200 dark:bg-gray-700' : ''} ${isSqueezed ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label="Advanced Options"
                      aria-expanded={isAdvancedOpen}
                      disabled={isSqueezed}
                    >
                      <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
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

                {/* Advanced Options Collapsible Section */}
                {isAdvancedOpen && (
                  <div className="mt-4 p-4 border rounded dark:border-gray-700 space-y-4">
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Override default next call schedule:</div>
                    <div className="space-y-3">
                       {/* Option: None (Default) */}
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="advancedOption"
                          value="none"
                          checked={advancedOption === null}
                          onChange={() => handleAdvancedOptionChange(null)}
                          disabled={isSqueezed}
                          className="form-radio h-4 w-4 text-blue-600"
                        />
                        <span className="text-sm">Use Default Schedule</span>
                      </label>

                       {/* Option: Next Date */}
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="advancedOption"
                          value="nextDaytime"
                          checked={advancedOption === 'nextDaytime'}
                          onChange={() => handleAdvancedOptionChange('nextDaytime')}
                          disabled={isSqueezed}
                          className="form-radio h-4 w-4 text-blue-600"
                        />
                        <span className="text-sm">Set Specific Next Call Date</span>
                      </label>
                      {advancedOption === 'nextDaytime' && (
                        <input
                          type="date"
                          value={nextDaytimeValue || ''}
                          onChange={handleNextDaytimeChange}
                          className="w-full p-2 border rounded dark:bg-slate-800 ml-6 text-sm max-w-[calc(100%-1.5rem)]"
                          disabled={isSqueezed}
                        />
                      )}

                       {/* Option: Days Until */}
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="advancedOption"
                          value="daysUntil"
                          checked={advancedOption === 'daysUntil'}
                          onChange={() => handleAdvancedOptionChange('daysUntil')}
                          disabled={isSqueezed}
                          className="form-radio h-4 w-4 text-blue-600"
                        />
                        <span className="text-sm">Set Days Until Next Call</span>
                      </label>
                      {advancedOption === 'daysUntil' && (
                        <input
                          type="number"
                          value={daysUntilValue?.toString() || ''}
                          onChange={handleDaysUntilChange}
                          placeholder="Enter number of days"
                          className="w-full p-2 border rounded dark:bg-slate-800 ml-6 text-sm max-w-[calc(100%-1.5rem)]"
                          min="0"
                          disabled={isSqueezed}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Comments */}
                {callData.callType !== 'Skip' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Comments
                    </label>
                    <textarea
                      value={callData.comments}
                      onChange={handleCommentsChange}
                      onFocus={() => setIsTextareaFocused(true)}
                      onBlur={() => setIsTextareaFocused(false)}
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
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={isButtonDisabled}
                  tabIndex={0}
                  className={`w-full py-3 rounded-lg transition-colors flex items-center justify-center ${
                    !isButtonDisabled
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
                      Processing...
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