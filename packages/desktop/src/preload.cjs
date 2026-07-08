const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('opcDesktop', {
  apiBaseUrl: process.env.OPC_DESKTOP_API_BASE_URL,
})
