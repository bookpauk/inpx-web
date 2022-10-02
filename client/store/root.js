// initial state
const state = {
    config: {},
    lastReloadTime: 0,
    settings: {
        accessToken: '',
        limit: 20,
        expanded: [],
        expandedSeries: [],
        showCounts: true,
        showRate: true,
        showGenres: true,
        showDeleted: false,
        abCacheEnabled: true,
        langDefault: '',
    },    
};

// getters
const getters = {};

// actions
const actions = {};

// mutations
const mutations = {
    setConfig(state, value) {
        state.config = value;
    },
    setLastReloadTime(state, value) {
        state.lastReloadTime = value;
    },
    setSettings(state, value) {
        state.settings = Object.assign({}, state.settings, value);
    },
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
};
