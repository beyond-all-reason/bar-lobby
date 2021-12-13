import index from '@/views/index.vue'
import intro from '@/views/intro.vue'
import login from '@/views/login.vue'
import home_index from '@/views/home/index.vue'
import learn_index from '@/views/learn/index.vue'
import library_index from '@/views/library/index.vue'
import multiplayer_index from '@/views/multiplayer/index.vue'
import profile_index from '@/views/profile/index.vue'
import replays_index from '@/views/replays/index.vue'
import singleplayer_index from '@/views/singleplayer/index.vue'
import debug_inputs from '@/views/debug/inputs.vue'
import debug_perf from '@/views/debug/perf.vue'
import debug_playground from '@/views/debug/playground.vue'
import home_news from '@/views/home/news.vue'
import home_updates from '@/views/home/updates.vue'
import learn_basics from '@/views/learn/basics.vue'
import learn_commands from '@/views/learn/commands.vue'
import learn_guides from '@/views/learn/guides.vue'
import library_maps from '@/views/library/maps.vue'
import library_units from '@/views/library/units.vue'
import multiplayer_casual from '@/views/multiplayer/casual.vue'
import multiplayer_custom from '@/views/multiplayer/custom.vue'
import multiplayer_ranked from '@/views/multiplayer/ranked.vue'
import multiplayer_tournaments from '@/views/multiplayer/tournaments.vue'
import profile_achievements from '@/views/profile/achievements.vue'
import profile_matches from '@/views/profile/matches.vue'
import profile_overview from '@/views/profile/overview.vue'
import profile_stats from '@/views/profile/stats.vue'
import replays_local from '@/views/replays/local.vue'
import replays_online from '@/views/replays/online.vue'
import singleplayer_campaign from '@/views/singleplayer/campaign.vue'
import singleplayer_custom from '@/views/singleplayer/custom.vue'
import singleplayer_missions from '@/views/singleplayer/missions.vue'
import singleplayer_tutorials from '@/views/singleplayer/tutorials.vue'

export default [
  {
    name: 'index',
    path: '/',
    component: index,
  },
  {
    name: 'intro',
    path: '/intro',
    component: intro,
  },
  {
    name: 'login',
    path: '/login',
    component: login,
  },
  {
    name: 'home',
    path: '/home',
    component: home_index,
    meta: {
      title: 'Home',
    },
  },
  {
    name: 'learn',
    path: '/learn',
    component: learn_index,
    meta: {
      title: 'Learn',
      order: 4,
    },
    redirect: '/learn/basics',
  },
  {
    name: 'library',
    path: '/library',
    component: library_index,
    meta: {
      title: 'Library',
      order: 3,
    },
    redirect: '/library/units',
  },
  {
    name: 'multiplayer',
    path: '/multiplayer',
    component: multiplayer_index,
    meta: {
      title: 'Multiplayer',
      order: 1,
    },
    redirect: '/multiplayer/ranked',
  },
  {
    name: 'profile',
    path: '/profile',
    component: profile_index,
    meta: {
      title: 'Profile',
    },
    redirect: '/profile/overview',
  },
  {
    name: 'replays',
    path: '/replays',
    component: replays_index,
    meta: {
      title: 'Replays',
      order: 2,
    },
    redirect: '/replays/local',
  },
  {
    name: 'singleplayer',
    path: '/singleplayer',
    component: singleplayer_index,
    meta: {
      title: 'Singleplayer',
      order: 0,
    },
    redirect: '/singleplayer/campaign',
  },
  {
    name: 'debug-inputs',
    path: '/debug/inputs',
    component: debug_inputs,
  },
  {
    name: 'debug-perf',
    path: '/debug/perf',
    component: debug_perf,
  },
  {
    name: 'debug-playground',
    path: '/debug/playground',
    component: debug_playground,
  },
  {
    name: 'home-news',
    path: '/home/news',
    component: home_news,
    meta: {
      title: 'News',
      order: 0,
    },
  },
  {
    name: 'home-updates',
    path: '/home/updates',
    component: home_updates,
    meta: {
      title: 'Updates',
      order: 1,
    },
  },
  {
    name: 'learn-basics',
    path: '/learn/basics',
    component: learn_basics,
    meta: {
      title: 'Basics',
      order: 0,
    },
  },
  {
    name: 'learn-commands',
    path: '/learn/commands',
    component: learn_commands,
    meta: {
      title: 'Commands',
      order: 1,
    },
  },
  {
    name: 'learn-guides',
    path: '/learn/guides',
    component: learn_guides,
    meta: {
      title: 'Guides',
      order: 2,
    },
  },
  {
    name: 'library-maps',
    path: '/library/maps',
    component: library_maps,
    meta: {
      title: 'Maps',
      order: 1,
    },
  },
  {
    name: 'library-units',
    path: '/library/units',
    component: library_units,
    meta: {
      title: 'Units',
      order: 0,
    },
  },
  {
    name: 'multiplayer-casual',
    path: '/multiplayer/casual',
    component: multiplayer_casual,
    meta: {
      title: 'Casual',
      order: 1,
    },
  },
  {
    name: 'multiplayer-custom',
    path: '/multiplayer/custom',
    component: multiplayer_custom,
    meta: {
      title: 'Custom',
      order: 2,
    },
  },
  {
    name: 'multiplayer-ranked',
    path: '/multiplayer/ranked',
    component: multiplayer_ranked,
    meta: {
      title: 'Ranked',
      order: 0,
    },
  },
  {
    name: 'multiplayer-tournaments',
    path: '/multiplayer/tournaments',
    component: multiplayer_tournaments,
    meta: {
      title: 'Tournaments',
      order: 3,
    },
  },
  {
    name: 'profile-achievements',
    path: '/profile/achievements',
    component: profile_achievements,
    meta: {
      title: 'Achievements',
      order: 1,
    },
  },
  {
    name: 'profile-matches',
    path: '/profile/matches',
    component: profile_matches,
    meta: {
      title: 'Matches',
      order: 3,
    },
  },
  {
    name: 'profile-overview',
    path: '/profile/overview',
    component: profile_overview,
    meta: {
      title: 'Overview',
      order: 0,
    },
  },
  {
    name: 'profile-stats',
    path: '/profile/stats',
    component: profile_stats,
    meta: {
      title: 'Stats',
      order: 2,
    },
  },
  {
    name: 'replays-local',
    path: '/replays/local',
    component: replays_local,
    meta: {
      title: 'Local',
      order: 0,
    },
  },
  {
    name: 'replays-online',
    path: '/replays/online',
    component: replays_online,
    meta: {
      title: 'Online',
      order: 1,
    },
  },
  {
    name: 'singleplayer-campaign',
    path: '/singleplayer/campaign',
    component: singleplayer_campaign,
    meta: {
      title: 'Campaign',
      order: 0,
    },
  },
  {
    name: 'singleplayer-custom',
    path: '/singleplayer/custom',
    component: singleplayer_custom,
    meta: {
      title: 'Custom',
      order: 2,
    },
  },
  {
    name: 'singleplayer-missions',
    path: '/singleplayer/missions',
    component: singleplayer_missions,
    meta: {
      title: 'Missions',
      order: 1,
    },
  },
  {
    name: 'singleplayer-tutorials',
    path: '/singleplayer/tutorials',
    component: singleplayer_tutorials,
    meta: {
      title: 'Tutorials',
      order: 3,
    },
  },
]
