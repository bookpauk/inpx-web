// initial state
const state = {
    apiError: null,
};

// getters
const getters = {};

// actions
const actions = {};

// mutations
const mutations = {
    setApiError(state, value) {
        state.apiError = value;
    },
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
};
