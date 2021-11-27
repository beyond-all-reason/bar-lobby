import index from '@/views/index.vue'
import home from '@/views/home.vue'
import intro from '@/views/intro.vue'
import login from '@/views/login.vue'
import profile from '@/views/profile.vue'
import settings from '@/views/settings.vue'
import campaign_index from '@/views/campaign/index.vue'
import missions_index from '@/views/missions/index.vue'
import replays_index from '@/views/replays/index.vue'
import versus_index from '@/views/versus/index.vue'
import campaign_continue from '@/views/campaign/continue.vue'
import campaign_load from '@/views/campaign/load.vue'
import campaign_new from '@/views/campaign/new.vue'
import campaign_replay_mission from '@/views/campaign/replay-mission.vue'
import debug_inputs from '@/views/debug/inputs.vue'
import debug_perf from '@/views/debug/perf.vue'
import debug_vee from '@/views/debug/vee.vue'
import missions_co_op from '@/views/missions/co-op.vue'
import missions_leaderboard from '@/views/missions/leaderboard.vue'
import missions_solo from '@/views/missions/solo.vue'
import replays_my_replays from '@/views/replays/my-replays.vue'
import replays_public_replays from '@/views/replays/public-replays.vue'
import versus_casual from '@/views/versus/casual.vue'
import versus_custom from '@/views/versus/custom.vue'
import versus_leaderboards from '@/views/versus/leaderboards.vue'
import versus_ranked from '@/views/versus/ranked.vue'

export default [
  {
    name: 'index',
    path: '/',
    component: index,
  },
  {
    name: 'home',
    path: '/home',
    component: home,
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
    name: 'profile',
    path: '/profile',
    component: profile,
  },
  {
    name: 'settings',
    path: '/settings',
    component: settings,
  },
  {
    name: 'campaign',
    path: '/campaign',
    component: campaign_index,
  },
  {
    name: 'missions',
    path: '/missions',
    component: missions_index,
  },
  {
    name: 'replays',
    path: '/replays',
    component: replays_index,
  },
  {
    name: 'versus',
    path: '/versus',
    component: versus_index,
  },
  {
    name: 'Continue',
    path: '/campaign/continue',
    component: campaign_continue,
  },
  {
    name: 'Load',
    path: '/campaign/load',
    component: campaign_load,
  },
  {
    name: 'New',
    path: '/campaign/new',
    component: campaign_new,
  },
  {
    name: 'Replay Mission',
    path: '/campaign/replay-mission',
    component: campaign_replay_mission,
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
    name: 'debug-vee',
    path: '/debug/vee',
    component: debug_vee,
  },
  {
    name: 'Co-op',
    path: '/missions/co-op',
    component: missions_co_op,
  },
  {
    name: 'Leaderboard',
    path: '/missions/leaderboard',
    component: missions_leaderboard,
  },
  {
    name: 'Solo',
    path: '/missions/solo',
    component: missions_solo,
  },
  {
    name: 'My replays',
    path: '/replays/my-replays',
    component: replays_my_replays,
  },
  {
    name: 'Public Replays',
    path: '/replays/public-replays',
    component: replays_public_replays,
  },
  {
    name: 'Casual',
    path: '/versus/casual',
    component: versus_casual,
  },
  {
    name: 'Custom',
    path: '/versus/custom',
    component: versus_custom,
  },
  {
    name: 'Leaderboard',
    path: '/versus/leaderboards',
    component: versus_leaderboards,
  },
  {
    name: 'Ranked',
    path: '/versus/ranked',
    component: versus_ranked,
  },
]
