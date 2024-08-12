const express = require('express')
const authRouter = require('./src/routes/auth.route')
const usersRouter = require('./src/routes/users.route')
const moderatorRouter = require('./src/routes/moderator.route')
const adminRouter = require('./src/routes/admin.route')

require('dotenv').config()

const app = express()

// Configure body parser
app.use(express.json())

app.get('/', (req, res) => {
    res.status(200).json({message: "Auth Microservice"})
})

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/admin', adminRouter)
app.use('/api/moderator', moderatorRouter)


app.listen(3000, () => console.log('Microservice (auth) started on port 3000'))