import { defineStore } from 'pinia'

export const useStatusStore = defineStore('status', {
  state: () => ({
    isLoading: false,
    status: 'done'
  }),
  getters: {
    getLoading: (state) => state.isLoading,
    getStatus: (state) => state.status
  },
  actions: {
    setLoading(value: boolean) {
      this.isLoading = value
    },
    setStatus(value: string) {
      this.status = value
    }
  }
})