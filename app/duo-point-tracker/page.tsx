'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/ui/header';
import { Trophy } from 'lucide-react';
import { useState } from 'react';

const DuolingoPointTracker = () => {
  const [startingPoints, setStartingPoints] = useState<number>(0);
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [customPoints, setCustomPoints] = useState<{ [key: string]: number }>({});

  const generateMonthlyCalendar = () => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    let calendar = [];
    let currentPoints = startingPoints;
    let weeklyChallengeDone = false;
    let goalCompletionDay = null;

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(currentYear, currentMonth - 1, day);
      const isDayOfWeek = currentDate.getDay() === 2; // Tuesday
      
      const dateKey = `${currentYear}-${currentMonth}-${day}`;
      let dailyPoints = customPoints[dateKey] ?? 3;
      let weeklyBonus = 0;
      
      if (isDayOfWeek && !weeklyChallengeDone) {
        weeklyBonus = 5;
        weeklyChallengeDone = true;
      }
      
      currentPoints += dailyPoints + weeklyBonus;

      const dayData = {
        day,
        dailyPoints,
        weeklyBonus,
        totalDailyPoints: dailyPoints + weeklyBonus,
        cumulativePoints: currentPoints,
        isTuesday: isDayOfWeek,
        dateKey
      };

      // Check for goal completion
      if (!goalCompletionDay && currentPoints >= 50) {
        goalCompletionDay = dayData;
      }

      calendar.push(dayData);

      // Reset weekly challenge after it's used
      if (weeklyChallengeDone && !isDayOfWeek) {
        weeklyChallengeDone = false;
      }
    }

    return { calendar, goalCompletionDay };
  };

  const { calendar: monthlyCalendar, goalCompletionDay } = generateMonthlyCalendar();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header title="Duolingo Point Tracker" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-2xl mx-auto">
          <CardContent className="p-6">
            <div className="flex space-x-4 mb-4">
              <div className="space-y-2">
                <label className="block">Starting Points</label>
                <input 
                  type="number"
                  value={startingPoints}
                  onChange={(e) => setStartingPoints(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border rounded"
                  min="0"
                  max="50"
                />
              </div>
              <div className="space-y-2">
                <label className="block">Month</label>
                <select 
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                  className="w-full p-2 border rounded"
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(currentYear, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Headers */}
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="font-bold">{day}</div>
              ))}

              {/* Padding for first week */}
              {monthlyCalendar[0] && 
                [...Array((currentDate => 
                  currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1
                )(new Date(currentYear, currentMonth - 1, 1)))].map((_, i) => (
                  <div key={`pad-${i}`} className="border"></div>
                ))
              }

              {/* Days */}
              {monthlyCalendar.map((dayData) => {
                const isGoalDay = goalCompletionDay && goalCompletionDay.day === dayData.day;
                
                let bgClass = '';
                if (isGoalDay) {
                  bgClass = 'bg-green-200';
                } else if (dayData.isTuesday) {
                  bgClass = 'bg-yellow-100';
                }

                return (
                  <div 
                    key={dayData.day} 
                    className={`border p-1 ${bgClass} ${isGoalDay ? 'font-bold' : ''}`}
                  >
                    <div className="text-xs font-bold">
                      {dayData.day}
                      {isGoalDay && <Trophy className="inline w-3 h-3 ml-1 text-green-600" />}
                    </div>
                    <div className="text-xs">
                      <input
                        type="number"
                        value={customPoints[dayData.dateKey] ?? dayData.dailyPoints}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          setCustomPoints(prev => ({
                            ...prev,
                            [dayData.dateKey]: value
                          }));
                        }}
                        className="w-8 text-center border-none bg-transparent"
                        min="0"
                      />
                      {dayData.isTuesday && ` +5`}
                    </div>
                    <div className="text-xs font-semibold">
                      {dayData.cumulativePoints}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Goal Information */}
            <div className="mt-4 text-center">
              <p className="font-bold">
                {goalCompletionDay 
                  ? `Goal Completion: ${goalCompletionDay.day} (${goalCompletionDay.cumulativePoints} points)` 
                  : 'Goal Not Reached'}
              </p>
              <p className="text-sm text-gray-600">
                • Daily Points: 3
                • Weekly Challenge (Tuesday): +5
                • Monthly Goal: 50 points
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DuolingoPointTracker;
