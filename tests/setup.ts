import { TextEncoder, TextDecoder } from "util"
import { setConfig } from "next/config"

global.TextEncoder = TextEncoder as any
global.TextDecoder = TextDecoder as any

setConfig({
  publicRuntimeConfig: {
  },
  serverRuntimeConfig: {
  },
})


