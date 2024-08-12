const express = require('express')
const authRouter = require('./src/routes/auth.route')
const usersRouter = require('./src/routes/users.route')
const userRefreshTokenRouter = require('./src/routes/userRefreshToken.route')

const app = express()

// Configure body parser
app.use(express.json())

app.get('/', (req, res) => {
    res.status(200).json({message: "Datastore (nedb) Microservice"})
})

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/userRefreshToken', userRefreshTokenRouter)

app.listen(3001, () => console.log("Microservice (nedb) started on port 3001"))