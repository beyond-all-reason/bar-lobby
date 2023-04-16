

interface Army {
  win: number;
  lost: number;
  winRate: number;
}

export interface SeasonData {
  gameType: string | null;
  rank: number | null;
  gamesPlayed: number | null;
  winRate: number;
  averageAPM: number | null;
  featuredUnit?: string | null;
  openSkill?: number | null;
  win: number | null;
  lost: number | null;
  armada: Army;
  legion: Army;
  cortex: Army;
}


export interface SeasonType {
  seasonName: string;
  seasonData: SeasonData[];
}

export const seasonsData: SeasonType[] = [
  {
    seasonName: "Season V Apr 1 - May 31",
    seasonData: [
      {
        gameType: "1v1",
        rank: 4,
        gamesPlayed: 47,
        winRate: 0.5319,
        win: 25,
        lost: 22,
        armada: {
          win: 12,
          lost: 13,
          winRate: 0.4800,
        },
        cortex: {
          win: 10,
          lost: 7,
          winRate: 0.5882,
        },
        legion: {
          win: 3,
          lost: 2,
          winRate: 0.6000,
        },
        averageAPM: 140,
        featuredUnit: "mammoth",
        openSkill: 32,
      },
      {
        gameType: "2v2",
        rank: 20,
        gamesPlayed: 36,
        winRate: 0.6667,
        win: 24,
        lost: 12,
        armada: {
          win: 8,
          lost: 4,
          winRate: 0.6667,
        },
        cortex: {
          win: 12,
          lost: 4,
          winRate: 0.7500,
        },
        legion: {
          win: 4,
          lost: 4,
          winRate: 0.5000,
        },
        averageAPM: 130,
        featuredUnit: "razorback",
        openSkill: 27,
      },
      {
        gameType: "3v3",
        rank: 19,
        gamesPlayed: 43,
        winRate: 0.6047,
        win: 26,
        lost: 17,
        armada: {
          win: 10,
          lost: 5,
          winRate: 0.6667,
        },
        cortex: {
          win: 11,
          lost: 5,
          winRate: 0.6875,
        },
        legion: {
          win: 5,
          lost: 7,
          winRate: 0.4167,
        },
        averageAPM: 135,
        featuredUnit: "titan",
        openSkill: 30,
      },
      {
        gameType: "4v4",
        rank: 20,
        gamesPlayed: 58,
        winRate: 0.5172,
        win: 30,
        lost: 28,
        armada: {
          win: 14,
          lost: 10,
          winRate: 0.5833,
        },
        cortex: {
          win: 12,
          lost: 10,
          winRate: 0.5455,
        },
        legion: {
          win: 4,
          lost: 8,
          winRate: 0.3333,
        },
        averageAPM: 145,
        featuredUnit: "razorback",
        openSkill: 38,
      },
    ],
  },
  {
    seasonName: "Season VI Jun 1 - Jul 31",
    seasonData: [
      {
        gameType: "1v1",
        rank: 19,
        gamesPlayed: 39,
        winRate: 0.5897,
        win: 23,
        lost: 16,
        armada: {
          win: 11,
          lost: 9,
          winRate: 0.55,
        },
        cortex: {
          win: 8,
          lost: 7,
          winRate: 0.5333,
        },
        legion: {
          win: 4,
          lost: 0,
          winRate: 1.0,
        },
        averageAPM: 130,
        featuredUnit: "razorback",
        openSkill: 29,
      },
      {
        gameType: "2v2",
        rank: 4,
        gamesPlayed: 34,
        winRate: 0.5882,
        win: 20,
        lost: 14,
        armada: {
          win: 10,
          lost: 8,
          winRate: 0.5556,
        },
        cortex: {
          win: 7,
          lost: 4,
          winRate: 0.6364,
        },
        legion: {
          win: 3,
          lost: 2,
          winRate: 0.6,
        },
        averageAPM: 135,
        featuredUnit: "mammoth",
        openSkill: 33,
      },
      {
        gameType: "3v3",
        rank: 20,
        gamesPlayed: 48,
        winRate: 0.5,
        win: 24,
        lost: 24,
        armada: {
          win: 12,
          lost: 12,
          winRate: 0.5,
        },
        cortex: {
          win: 10,
          lost: 10,
          winRate: 0.5,
        },
        legion: {
          win: 2,
          lost: 2,
          winRate: 0.5,
        },
        averageAPM: 140,
        featuredUnit: "titan",
        openSkill: 31,
      },
      {
        gameType: "4v4",
        rank: 20,
        gamesPlayed: 60,
        winRate: 0.4667,
        win: 28,
        lost: 32,
        armada: {
          win: 16,
          lost: 12,
          winRate: 0.5714,
        },
        cortex: {
          win: 8,
          lost: 8,
          winRate: 0.5,
        },
        legion: {
          win: 4,
          lost: 12,
          winRate: 0.25,
        },
        averageAPM: 145,
        featuredUnit: "razorback",
        openSkill: 36,
      },
    ],
  },
  {
    seasonName: "Season VII Aug 1 - Sept 30",
    seasonData: [
      {
        gameType: "1v1",
        rank: 20,
        gamesPlayed: 44,
        winRate: 0.5,
        win: 22,
        lost: 22,
        armada: {
          win: 11,
          lost: 11,
          winRate: 0.5,
        },
        cortex: {
          win: 9,
          lost: 13,
          winRate: 0.4091,
        },
        legion: {
          win: 2,
          lost: 20,
          winRate: 0.0909,
        },
        averageAPM: 125,
        featuredUnit: "titan",
        openSkill: 27,
      },
      {
        gameType: "2v2",
        rank: 4,
        gamesPlayed: 48,
        winRate: 0.5,
        win: 24,
        lost: 24,
        armada: {
          win: 14,
          lost: 10,
          winRate: 0.5833,
        },
        cortex: {
          win: 9,
          lost: 15,
          winRate: 0.375,
        },
        legion: {
          win: 1,
          lost: 23,
          winRate: 0.0417,
        },
        averageAPM: 140,
        featuredUnit: "razorback",
        openSkill: 32,
      },
      {
        gameType: "3v3",
        rank: 19,
        gamesPlayed: 52,
        winRate: 0.5,
        win: 26,
        lost: 26,
        armada: {
          win: 13,
          lost: 13,
          winRate: 0.5,
        },
        cortex: {
          win: 11,
          lost: 15,
          winRate: 0.4231,
        },
        legion: {
          win: 2,
          lost: 24,
          winRate: 0.0769,
        },
        averageAPM: 135,
        featuredUnit: "mammoth",
        openSkill: 29,
      },
      {
        gameType: "4v4",
        rank: 20,
        gamesPlayed: 56,
        winRate: 0.5536,
        win: 31,
        lost: 25,
        armada: {
          win: 16,
          lost: 14,
          winRate: 0.5333,
        },
        cortex: {
          win: 10,
          lost: 20,
          winRate: 0.3333,
        },
        legion: {
          win: 4,
          lost: 22,
          winRate: 0.1538,
        },
        averageAPM: 145,
        featuredUnit: "titan",
        openSkill: 35,
      },
    ],
  }
]


export const seasonsList = [
  "Season V Apr 1 - May 31",
  "Season VI Jun 1 - Jul 31",
  "Season VII Aug 1 - Sept 30",
]
