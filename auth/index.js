const express = require('express')
const axios = require('axios')
require('dotenv').config()

const app = express()

// Configure body parser
app.use(express.json())

app.get('/', (req, res) => {
    res.status(200).json({message: "Auth Microservice"})
})

app.post('/api/auth/register', async (req, res) => {
    try {
        console.log(req.body)
        const { name, email, password } = req.body

        if (!name || !email || !password) {
            return res.status(422).json({message: "Field(s) missing"})
        }

        dbResponse = await axios.post(`http://localhost:3001/api/auth/register`, {name, email, password})
        if (dbResponse.status == 201) {
            res.status(201).json({message: 'Item created', _id: dbResponse._id})
        }
        else {
            res.status(dbResponse.status).json({message: dbResponse.message})
        }

    } catch (error) {
        return res.status(500).json({message: error.message})
    }
})
app.listen(3000, () => console.log('Microservice (auth) started on port 3000'))