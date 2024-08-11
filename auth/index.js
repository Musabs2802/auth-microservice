const express = require('express')
const axios = require('axios')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const app = express()

// Configure body parser
app.use(express.json())

app.get('/', (req, res) => {
    res.status(200).json({message: "Auth Microservice"})
})

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body

        if (!name || !email || !password) {
            return res.status(422).json({message: "Field(s) missing"})
        }

        const dbResponse = await axios.post(`${process.env.DB_BASE_URL}/api/auth/register`, { name, email, password, role })
        if (dbResponse.status == 201) {
            return res.status(201).json({message: 'Item created', _id: dbResponse.data._id})
        }
        else {
            return res.status(dbResponse.status).json({message: dbResponse.data.message})
        }

    } catch (error) {
        return res.status(500).json({message: error.message})
    }
})

app.post('/api/auth/login', async (req, res) => {
    try {
        const {email, password} = req.body

        if (!email || !password) {
            return res.status(422).json({message: "Field(s) missing"})
        }

        const dbUser = await axios.post(`${process.env.DB_BASE_URL}/api/auth/login`, { email, password })
        if (dbUser.status == 200) {
                const user = dbUser.data
                const accessToken = jwt.sign({
                    userId: user._id}, 
                    process.env.JWT_ACCESS_TOKEN, 
                    {subject:'accessApi', expiresIn: '1h'})
                
                return res.status(200).json({ 
                    id: user._id, 
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    accessToken })
            }
        else {
            return res.status(dbUser.status).json({message: dbUser.data.message})
        }
    }
    catch (error) {
        return res.status(500).json({message: error.message})
    }
})

app.get('/api/users/user', authenticate, async (req, res) => {
    try {
        const dbUser = await axios.get(`${process.env.DB_BASE_URL}/api/users/findOne/${req.user.id}`)

        if (dbUser.status == 200) {
            return res.status(200).json(dbUser.data)
        }
        else {
            return res.status(dbUser.status).json({message: dbUser.data.message})
        }
    }
    catch (error) {
        return res.status(500).json({message: error})
    }
})

app.get('/api/admin', authenticate, authorize(['admin']), async (req, res) => {
    return res.status(200).json({ message: "Admin Authorized Endpoints" })
})

app.get('/api/moderator', authenticate, authorize(['moderator', 'admin']), async (req, res) => {
    return res.status(200).json({ message: "Admin / Moderator Authorized Endpoints" })
})

function authorize(roles=[]) {
    return async (req, res, next) => {
        const user = await axios.get(`${process.env.DB_BASE_URL}/api/users/findOne/${req.user.id}`)
        
        if (user && roles.includes(user.data.role)) {
            next()
        }
        else {
            return res.status(403).json({message: "Access Denied"}) 
        }
    }
}

async function authenticate(req, res, next) {
    try {
        const accessToken = req.headers.authorization.split(' ')[1]
        
        if (accessToken) {
            const decodedToken = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN)
               
            req.user = { id: decodedToken.userId }
            next()
        }
        else {
            return res.status(401).json({message: 'Access token not found'})
        }
    }
    catch (error) {
        return res.status(401).json({ message: 'Access token invalid or expired' })
    }
}

app.listen(3000, () => console.log('Microservice (auth) started on port 3000'))