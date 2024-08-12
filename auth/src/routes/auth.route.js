const express = require('express')
const axios = require('axios')
const jwt = require('jsonwebtoken')
const authenticate = require('../middlewares/authenticate.middleware')

const router = express.Router()

router.post('/register', async (req, res) => {
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

router.post('/login', async (req, res) => {
    try {
        const {email, password} = req.body

        if (!email || !password) {
            return res.status(422).json({message: "Field(s) missing"})
        }

        const dbUser = await axios.post(`${process.env.DB_BASE_URL}/api/auth/login`, { email, password })
        if (dbUser.status == 200) {
                const user = dbUser.data
                const accessToken = jwt.sign({ userId: user._id }, 
                    process.env.JWT_ACCESS_TOKEN, 
                    { subject:'accessToken', expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN })

                const refreshToken = jwt.sign({ userId: user._id },
                    process.env.JWT_REFRESH_TOKEN,
                    { subject:'refreshToken', expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN }
                )
                
                await axios.post(`${process.env.DB_BASE_URL}/api/userRefreshToken`, { refreshToken, userId: user._id })
                
                return res.status(200).json({ 
                    id: user._id, 
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    accessToken,
                    refreshToken })
            }
        else {
            return res.status(dbUser.status).json({message: dbUser.data.message})
        }
    }
    catch (error) {
        return res.status(500).json({message: error.message})
    }
})

router.post('/refreshLogin', async (req, res) => {
    try {
        const { refreshToken } = req.body

        if (refreshToken) {
            const decodedRefreshToken = jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN)

            const dbUserRefreshToken = await axios.get(`${process.env.DB_BASE_URL}/api/userRefreshToken/${refreshToken}/${decodedRefreshToken.userId}`)
            if (dbUserRefreshToken) {
                const userRefreshToken = dbUserRefreshToken.data
                await axios.delete(`${process.env.DB_BASE_URL}/api/userRefreshToken/${userRefreshToken._id}`)

                const accessToken = jwt.sign({ userId: decodedRefreshToken.userId }, 
                    process.env.JWT_ACCESS_TOKEN, 
                    { subject:'accessToken', expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN })

                const newRefreshToken = jwt.sign({ userId: decodedRefreshToken.userId },
                    process.env.JWT_REFRESH_TOKEN,
                    { subject:'refreshToken', expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN }
                )

                await axios.post(`${process.env.DB_BASE_URL}/api/userRefreshToken`, { refreshToken: newRefreshToken, userId: decodedRefreshToken.userId })
                
                return res.status(200).json({ 
                    id: decodedRefreshToken.userId, 
                    accessToken,
                    refreshToken: newRefreshToken })
            }
            else {
                return res.status(401).json({ message: "Token invalid/expired" })
            }
        }
        else {
            res.status(422).json({ message: "Field(s) missing" })
        }
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ message: "Token invalid/expired" })
        }
        else {
          return res.status(500).json({ message: error.message })
       }
    }
})

router.post('/logout', authenticate, async (req, res) => {
    try {
        await axios.post(`${process.env.DB_BASE_URL}/api/auth/logout`, { userId: req.userId })

        return res.status(204)
    }
    catch (error) {
        return res.status(500).json({message: error})
    }
})

module.exports = router