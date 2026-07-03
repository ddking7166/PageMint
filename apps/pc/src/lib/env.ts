export { envValue } from '../config/env.js'

import { loadEnvFiles } from '../config/env.js'

export function loadLocalEnv(): void {
  loadEnvFiles()
}
