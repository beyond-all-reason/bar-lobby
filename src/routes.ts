import index from '@/views/index.vue'
import home from '@/views/home.vue'
import intro from '@/views/intro.vue'
import login from '@/views/login.vue'
import debug_inputs from '@/views/debug/inputs.vue'
import debug_perf from '@/views/debug/perf.vue'

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
    name: 'debug-inputs',
    path: '/debug/inputs',
    component: debug_inputs,
  },
  {
    name: 'debug-perf',
    path: '/debug/perf',
    component: debug_perf,
  },
]
