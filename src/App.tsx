import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import type { RankingsState } from './types';

interface AppProps {
  initialData: RankingsState;
}

function App({ initialData }: AppProps) {
  const [rankingsData, setRankingsData] = useState<RankingsState>(initialData);

  useEffect(() => {
    console.log('Received new rankings data:', initialData);
    setRankingsData(initialData);
  }, [initialData]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <Award className="w-6 h-6 text-blue-400" />;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-100 border-yellow-400';
      case 2:
        return 'bg-gray-100 border-gray-400';
      case 3:
        return 'bg-amber-100 border-amber-600';
      default:
        return 'bg-white border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Top Salespeople Rankings</h1>
            <div className="text-sm text-gray-500">
              Last updated: {rankingsData.lastUpdated}
            </div>
          </div>
          
          <div className="space-y-4">
            {rankingsData.rankings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Waiting for rankings data...
              </div>
            ) : (
              rankingsData.rankings.map((person) => (
                <div
                  key={person.rank}
                  className={`flex items-center p-4 border-2 rounded-lg transition-all duration-300 transform hover:scale-[1.02] ${getRankStyle(person.rank)}`}
                >
                  <div className="flex items-center w-16">
                    {getRankIcon(person.rank)}
                    <span className="ml-2 font-bold text-gray-700">#{person.rank}</span>
                  </div>
                  <div className="flex-1 ml-4">
                    <h3 className="text-lg font-semibold text-gray-800">{person.name}</h3>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;