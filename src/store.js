import Vue from 'vue'
import Vuex from 'vuex'
import createLogger from 'vuex/dist/logger'
import VuexPersistence from 'vuex-persist'

import { logger } from './logging.js'
import { web3Actions, track, bind } from './aux.js'

Vue.use(Vuex)

const vuexLocal = new VuexPersistence({
  storage: window.localStorage,
  reducer: state => ({ notifications: state.notifications, web3provider: state.web3provider })
})

const state = {
  notifications: [],
  web3: {},
  web3error: null,
  web3provider: 'http://localhost:8545'
}

const getters = {
}

/*

var actions = {
  createProposal: ({ state, commit }, { title, description, address, amount, bytecode, onTxHash, onConfirm }) => {
    const wei = web3.utils.toWei(amount, 'ether')
    if (bytecode === 'null') bytecode = '0x'
    const json = {title: title, description: description, bytecode: bytecode, version: 1}
    ipfs.files.add(Buffer.from(JSON.stringify(json)), (err, res) => {
      if (err) {
        console.log('ipfs err! ', err, res, wei)
      } else {
        const hash = '0x' + Buffer.from(res[0].hash).toString('hex')
        DAO.methods.newProposal(address, wei, hash, bytecode).call((err, res) => {
          if (err) {
            console.log('sim err', err)
          } else {
            DAO.methods.newProposal(address, wei, hash, bytecode).send({from: state.web3.account, gasLimit: 1000000}, (err, txHash) => {
              console.log('res', err, txHash)
              onTxHash(txHash)
              // onConfirm()
            })
          }
        })
      }
    })
  }
}

*/

var actions = {}

actions = Object.assign(actions, web3Actions(state.web3provider))

const mutations = {
  setWeb3: (state, web3) => {
    Vue.set(state, 'web3', web3)
  },
  setWeb3Error: (state, error) => {
    logger.warn({ extra: error }, 'Web3 threw error')
    Vue.set(state, 'web3error', error)
  },
  clearWeb3Error: (state) => {
    Vue.set(state, 'web3error', null)
  },
  commitTx: (state, { txHash, abi, params }) => {
    logger.info({ extra: { txHash, params } }, 'Transaction committed')
    state.notifications.splice(0, 0, {
      type: 'commitTx',
      status: 'warn',
      finalized: false,
      txHash: txHash,
      abi: abi,
      params: params
    })
  },
  mineTx: (state, { txHash, success }) => {
    logger.info({ extra: { txHash, success } }, 'Transaction mined')
    const m = state.notifications.map((n, i) => [n, i]).filter(m => m[0].txHash === txHash)[0]
    const n = m[0]
    const i = m[1]
    Vue.set(n, 'status', success ? 'ok' : 'error')
    Vue.set(n, 'finalized', true)
    Vue.set(state.notifications, i, n)
  },
  clearNotification: (state, index) => {
    state.notifications.splice(index, 1)
  },
  clearNotifications: (state) => {
    Vue.set(state, 'notifications', [])
  },
  setProvider: (state, url) => {
    Vue.set(state, 'web3provider', url)
  }
}

var plugins = [vuexLocal.plugin]

if (process.env.NODE_ENV !== 'production') {
  plugins.push(createLogger())
}

const store = new Vuex.Store({ state, getters, actions, mutations, plugins })

const web3 = bind(store, {})

store.state.notifications.filter(n => !n.finalized).map(n => {
  const hash = n.txHash
  track(web3, hash, (success) => {
    store.commit('mineTx', { txHash: hash, success: success })
  })
})

export default store
