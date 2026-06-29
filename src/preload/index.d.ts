import type { PikeApi } from './index'

declare global {
  interface Window {
    pike: PikeApi
  }
}

export {}
