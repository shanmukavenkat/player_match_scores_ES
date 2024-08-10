const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'cricketMatchDetails.db')

let db = null

const initializeDBServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('http://localhost:3000') // Corrected the URL format
    })
  } catch (e) {
    console.log(e.message)
    process.exit(1)
  }
}

initializeDBServer() // The function should be called to initialize the DB

// Converting snake_case to camelCase

const camelCase = snakeCase => {
  const camelCaseObj = {}

  for (const key in snakeCase) {
    // Added a loop to iterate over the keys of the object
    const camelCaseKey = key
      .split('_')
      .map((word, index) =>
        index === 0 ? word : word[0].toUpperCase() + word.slice(1),
      )
      .join('')

    camelCaseObj[camelCaseKey] = snakeCase[key] // Assign the value to the new camelCase key
  }

  return camelCaseObj // The function should return the converted object
}

///getting the list of players
app.get('/players/', async (request, response) => {
  const getData = `
    SELECT 
    * 
    FROM 
    player_details;
  `

  const newData = await db.all(getData) // Corrected db.get to db.all to get multiple rows
  const playersArray = newData.map(camelCase) // Corrected the logic to map the entire array
  response.send(playersArray)
})

///getting the details about specific player

app.get('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params

  const theData = `
SELECT 
* 
FROM 
player_details
WHERE player_id = ${playerId};`

  const gettingData = await db.get(theData)
  const dataArray = camelCase(gettingData)
  response.send(dataArray)
})

app.put('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const {playerName} = request.body

  const theQuery = ` UPDATE 
  player_details
  SET 
  player_name = '${playerName}'
  WHERE player_id = ${playerId};
`
  await db.run(theQuery)
  response.send('Player Details Updated')
})

app.get('/matches/:matchId/', async (request, response) => {
  const {matchId} = request.params

  const theQuery = `SELECT 
  * 
  FROM 
  match_details
  WHERE match_id = ${matchId};`

  const theData = await db.get(theQuery)

  const dataArray = camelCase(theData)
  response.send(dataArray)
})

app.get('/players/:playerId/matches', async (request, response) => {
  const {playerId} = request.params

  const theQuery = `
    SELECT
    match_id AS matchId ,
    match AS match,
    year AS year 
    FROM player_match_score NATURAL JOIN match_details
    WHERE player_id = ${playerId};`

  const theData = await db.all(theQuery)
  const convertArray = theData.map(camelCase)
  response.send(convertArray)
})

app.get('/matches/:matchId/players', async (request, response) => {
  const {matchId} = request.params
  const theQuery = ` SELECT 
      player_details.player_id AS playerId,
      player_details.player_name AS playerName
    FROM 
      player_match_score 
    INNER JOIN 
      player_details 
    ON 
      player_match_score.player_id = player_details.player_id
    WHERE 
      player_match_score.match_id = ${matchId};`
  const theData = await db.all(theQuery)
  const convertArray = theData.map(camelCase)
  response.send(convertArray)
})

app.get('/players/:playerId/playerScores', async (request, response) => {
  const {playerId} = request.params

  const theQuery = `
    SELECT
    player_details.player_id AS playerId,
    player_details.player_name AS playerName,
    SUM(player_match_score.score) AS totalScore,
    SUM(fours) AS totalFours,
    SUM(sixes) AS totalSixes 
    FROM 
    player_details INNER JOIN player_match_score ON
    player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};
    `
  const theData = await db.get(theQuery)
  const convertArray = camelCase(theData)
  response.send(convertArray)
})
module.exports = app
