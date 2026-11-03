import { createGameServer } from './server'

const port = Number(process.env.PORT) || 3001
const host = process.env.HOST || '0.0.0.0'
const { httpServer } = createGameServer()

httpServer.listen(port, host, () => {
  console.log(`CART CHAOS serveur  http://localhost:${port}`)
  console.log(`Santé               http://localhost:${port}/health`)
})
