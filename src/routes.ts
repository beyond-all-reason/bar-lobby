import index from '@/views/index.vue'
import login from '@/views/login.vue'
import updater from '@/views/updater.vue'
import development_index from '@/views/development/index.vue'
import home_index from '@/views/home/index.vue'
import library_index from '@/views/library/index.vue'
import multiplayer_index from '@/views/multiplayer/index.vue'
import profile_index from '@/views/profile/index.vue'
import singleplayer_index from '@/views/singleplayer/index.vue'
import debug_fade from '@/views/debug/fade.vue'
import debug_inputs from '@/views/debug/inputs.vue'
import debug_playground from '@/views/debug/playground.vue'
import debug_slide from '@/views/debug/slide.vue'
import development_game_dev from '@/views/development/game-dev.vue'
import development_lobby_dev from '@/views/development/lobby-dev.vue'
import development_map_dev from '@/views/development/map-dev.vue'
import development_server_dev from '@/views/development/server-dev.vue'
import development_website_dev from '@/views/development/website-dev.vue'
import home_changes from '@/views/home/changes.vue'
import home_donate from '@/views/home/donate.vue'
import home_home from '@/views/home/home.vue'
import home_news from '@/views/home/news.vue'
import home_store from '@/views/home/store.vue'
import library_commands from '@/views/library/commands.vue'
import library_guides from '@/views/library/guides.vue'
import library_maps from '@/views/library/maps.vue'
import library_replays from '@/views/library/replays.vue'
import library_tutorials from '@/views/library/tutorials.vue'
import library_units from '@/views/library/units.vue'
import multiplayer_casual from '@/views/multiplayer/casual.vue'
import multiplayer_custom from '@/views/multiplayer/custom.vue'
import multiplayer_ranked from '@/views/multiplayer/ranked.vue'
import multiplayer_tournaments from '@/views/multiplayer/tournaments.vue'
import profile_achievements from '@/views/profile/achievements.vue'
import profile_matches from '@/views/profile/matches.vue'
import profile_overview from '@/views/profile/overview.vue'
import profile_stats from '@/views/profile/stats.vue'
import singleplayer_campaign from '@/views/singleplayer/campaign.vue'
import singleplayer_custom from '@/views/singleplayer/custom.vue'
import singleplayer_scenarios from '@/views/singleplayer/scenarios.vue'
import singleplayer_tutorials from '@/views/singleplayer/tutorials.vue'

export default [
  {
    name: 'index',
    path: '/',
    component: index,
    meta: {
      empty: true,
    },
  },
  {
    name: 'login',
    path: '/login',
    component: login,
    meta: {
      empty: true,
      blurBg: true,
    },
  },
  {
    name: 'updater',
    path: '/updater',
    component: updater,
    meta: {
      empty: true,
      blurBg: true,
    },
  },
  {
    name: 'development',
    path: '/development',
    component: development_index,
    meta: {
      title: 'Development',
      order: 5,
      transition: {
        name: 'slide-below',
      },
    },
    redirect: '/development/game-dev',
  },
  {
    name: 'home',
    path: '/home',
    component: home_index,
    meta: {
      title: 'Home',
      order: 0,
      transition: {
        name: 'slide-below',
      },
    },
    redirect: '/home/home',
  },
  {
    name: 'library',
    path: '/library',
    component: library_index,
    meta: {
      title: 'Library',
      order: 2,
      transition: {
        name: 'slide-below',
      },
    },
    redirect: '/library/replays',
  },
  {
    name: 'multiplayer',
    path: '/multiplayer',
    component: multiplayer_index,
    meta: {
      title: 'Multiplayer',
      order: 1,
      transition: {
        name: 'slide-below',
      },
    },
    redirect: '/multiplayer/ranked',
  },
  {
    name: 'profile',
    path: '/profile',
    component: profile_index,
    meta: {
      title: 'Profile',
      transition: {
        name: 'slide-below',
      },
    },
    redirect: '/profile/overview',
  },
  {
    name: 'singleplayer',
    path: '/singleplayer',
    component: singleplayer_index,
    meta: {
      title: 'Singleplayer',
      order: 0,
      offline: true,
      transition: {
        name: 'slide-below',
      },
    },
    redirect: '/singleplayer/campaign',
  },
  {
    name: 'debug-fade',
    path: '/debug/fade',
    component: debug_fade,
    meta: {
      title: 'Fade',
      order: 2,
      transition: {
        name: 'fade',
      },
    },
  },
  {
    name: 'debug-inputs',
    path: '/debug/inputs',
    component: debug_inputs,
    meta: {
      title: 'Inputs',
      order: 0,
    },
  },
  {
    name: 'debug-playground',
    path: '/debug/playground',
    component: debug_playground,
    meta: {
      title: 'Playground',
      order: 1,
    },
  },
  {
    name: 'debug-slide',
    path: '/debug/slide',
    component: debug_slide,
    meta: {
      title: 'Slide',
      order: 2,
      transition: {
        name: 'slide-below',
      },
    },
  },
  {
    name: 'development-game-dev',
    path: '/development/game-dev',
    component: development_game_dev,
    meta: {
      title: 'Game',
      order: 0,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'development-lobby-dev',
    path: '/development/lobby-dev',
    component: development_lobby_dev,
    meta: {
      title: 'Lobby',
      order: 2,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'development-map-dev',
    path: '/development/map-dev',
    component: development_map_dev,
    meta: {
      title: 'Maps',
      order: 1,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'development-server-dev',
    path: '/development/server-dev',
    component: development_server_dev,
    meta: {
      title: 'Server',
      order: 3,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'development-website-dev',
    path: '/development/website-dev',
    component: development_website_dev,
    meta: {
      title: 'Website',
      order: 4,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'home-changes',
    path: '/home/changes',
    component: home_changes,
    meta: {
      title: 'Changes',
      order: 2,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'home-donate',
    path: '/home/donate',
    component: home_donate,
    meta: {
      title: 'Donate',
      order: 3,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'home-home',
    path: '/home/home',
    component: home_home,
    meta: {
      title: 'Home',
      order: 0,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'home-news',
    path: '/home/news',
    component: home_news,
    meta: {
      title: 'News',
      order: 1,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'home-store',
    path: '/home/store',
    component: home_store,
    meta: {
      title: 'Store',
      order: 4,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'library-commands',
    path: '/library/commands',
    component: library_commands,
    meta: {
      title: 'Commands',
      order: 4,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'library-guides',
    path: '/library/guides',
    component: library_guides,
    meta: {
      title: 'Guides',
      order: 3,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'library-maps',
    path: '/library/maps',
    component: library_maps,
    meta: {
      title: 'Maps',
      order: 1,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'library-replays',
    path: '/library/replays',
    component: library_replays,
    meta: {
      title: 'Replays',
      order: 0,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'library-tutorials',
    path: '/library/tutorials',
    component: library_tutorials,
    meta: {
      title: 'Tutorials',
      order: 5,
      transition: {
        name: 'slide-left',
      },
    },
    redirect: '/singleplayer/tutorials',
  },
  {
    name: 'library-units',
    path: '/library/units',
    component: library_units,
    meta: {
      title: 'Units',
      order: 1,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'multiplayer-casual',
    path: '/multiplayer/casual',
    component: multiplayer_casual,
    meta: {
      title: 'Casual',
      order: 1,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'multiplayer-custom',
    path: '/multiplayer/custom',
    component: multiplayer_custom,
    meta: {
      title: 'Custom',
      order: 2,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'multiplayer-ranked',
    path: '/multiplayer/ranked',
    component: multiplayer_ranked,
    meta: {
      title: 'Ranked',
      order: 0,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'multiplayer-tournaments',
    path: '/multiplayer/tournaments',
    component: multiplayer_tournaments,
    meta: {
      title: 'Tournaments',
      order: 3,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'profile-achievements',
    path: '/profile/achievements',
    component: profile_achievements,
    meta: {
      title: 'Achievements',
      order: 1,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'profile-matches',
    path: '/profile/matches',
    component: profile_matches,
    meta: {
      title: 'Matches',
      order: 3,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'profile-overview',
    path: '/profile/overview',
    component: profile_overview,
    meta: {
      title: 'Overview',
      order: 0,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'profile-stats',
    path: '/profile/stats',
    component: profile_stats,
    meta: {
      title: 'Stats',
      order: 2,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'singleplayer-campaign',
    path: '/singleplayer/campaign',
    component: singleplayer_campaign,
    meta: {
      title: 'Campaign',
      order: 0,
      offline: true,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'singleplayer-custom',
    path: '/singleplayer/custom',
    component: singleplayer_custom,
    meta: {
      title: 'Custom',
      order: 2,
      offline: true,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'singleplayer-scenarios',
    path: '/singleplayer/scenarios',
    component: singleplayer_scenarios,
    meta: {
      title: 'Scenarios',
      order: 1,
      offline: true,
      transition: {
        name: 'slide-left',
      },
    },
  },
  {
    name: 'singleplayer-tutorials',
    path: '/singleplayer/tutorials',
    component: singleplayer_tutorials,
    meta: {
      title: 'Tutorials',
      order: 3,
      offline: true,
      transition: {
        name: 'slide-left',
      },
    },
  },
]
