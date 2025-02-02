import express, { json } from 'express'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { open } from 'sqlite'
import sqlite3 from 'sqlite3'
import serverless from 'serverless-http'

const app = express()
app.use(json())

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = join(__dirname, '../../cricketMatchDetails.db') // Adjust path for Netlify

let db

const initializeDBServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    console.log('Database connected')
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
}

initializeDBServer()

// Converting snake_case to camelCase
const camelCase = (snakeCase) => {
  if (!snakeCase) return null
  const camelCaseObj = {}
  for (const key in snakeCase) {
    const camelCaseKey = key
      .split('_')
      .map((word, index) =>
        index === 0 ? word : word[0].toUpperCase() + word.slice(1),
      )
      .join('')
    camelCaseObj[camelCaseKey] = snakeCase[key]
  }
  return camelCaseObj
}

// Get the list of players
app.get('/players/', async (request, response) => {
  try {
    const getData = `SELECT * FROM player_details;`
    const newData = await db.all(getData)
    response.json(newData.map(camelCase))
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// Get details about a specific player
app.get('/players/:playerId/', async (request, response) => {
  try {
    const { playerId } = request.params
    const theData = await db.get(`SELECT * FROM player_details WHERE player_id = ?`, [playerId])
    response.json(camelCase(theData))
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// Update player details
app.put('/players/:playerId/', async (request, response) => {
  try {
    const { playerId } = request.params
    const { playerName } = request.body
    await db.run(`UPDATE player_details SET player_name = ? WHERE player_id = ?`, [playerName, playerId])
    response.json({ message: 'Player Details Updated' })
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// Get match details
app.get('/matches/:matchId/', async (request, response) => {
  try {
    const { matchId } = request.params
    const theData = await db.get(`SELECT * FROM match_details WHERE match_id = ?`, [matchId])
    response.json(camelCase(theData))
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// Get matches played by a specific player
app.get('/players/:playerId/matches', async (request, response) => {
  try {
    const { playerId } = request.params
    const theData = await db.all(`
      SELECT match_id AS matchId, match, year 
      FROM player_match_score NATURAL JOIN match_details 
      WHERE player_id = ?`, [playerId])
    response.json(theData.map(camelCase))
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// Get players in a specific match
app.get('/matches/:matchId/players', async (request, response) => {
  try {
    const { matchId } = request.params
    const theData = await db.all(`
      SELECT player_details.player_id AS playerId, player_details.player_name AS playerName
      FROM player_match_score 
      INNER JOIN player_details 
      ON player_match_score.player_id = player_details.player_id
      WHERE player_match_score.match_id = ?`, [matchId])
    response.json(theData.map(camelCase))
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// Get player scores
app.get('/players/:playerId/playerScores', async (request, response) => {
  try {
    const { playerId } = request.params
    const theData = await db.get(`
      SELECT player_details.player_id AS playerId, player_details.player_name AS playerName,
      SUM(player_match_score.score) AS totalScore,
      SUM(fours) AS totalFours,
      SUM(sixes) AS totalSixes 
      FROM player_details 
      INNER JOIN player_match_score ON player_details.player_id = player_match_score.player_id
      WHERE player_details.player_id = ?`, [playerId])
    response.json(camelCase(theData))
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})

// Export the serverless function
export const handler = serverless(app)
