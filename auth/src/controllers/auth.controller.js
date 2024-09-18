const axios = require('axios')
const jwt = require('jsonwebtoken')
const { authenticator } = require('otplib')
const qrcode = require('qrcode')
const crypto = require('crypto')
const NodeCache = require('node-cache')

const cache = new NodeCache()

const authRegister = async (req, res) => {
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
}

const authLogin = async (req, res) => {
    try {
        const {email, password} = req.body

        if (!email || !password) {
            return res.status(422).json({message: "Field(s) missing"})
        }

        const dbUser = await axios.post(`${process.env.DB_BASE_URL}/api/auth/login`, { email, password })
        if (dbUser.status == 200) {
                const user = dbUser.data

                if (user['2faEnabled']) {
                    const tempToken = crypto.randomUUID()
                    cache.set(process.env.CACHE_TEMP_TOKEN_PREFIX + tempToken, user._id, process.CACHE_TEMP_EXPIRES_IN_SECONDS)
                    
                    return res.status(200).json({ tempToken, expiresInSeconds: process.env.CACHE_TEMP_EXPIRES_IN_SECONDS})
                }
                else {
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
            }
        else {
            return res.status(dbUser.status).json({message: dbUser.data.message})
        }
    }
    catch (error) {
        return res.status(500).json({message: error.message})
    }
}

const authLogin2fa = async (req, res) => {
    try {
        const { tempToken, totp } = req.body

        if (tempToken && totp) {
            const userId = cache.get(process.env.CACHE_TEMP_TOKEN_PREFIX + tempToken)

            if (userId) {
                const dbUser = await axios.get(`${process.env.DB_BASE_URL}/api/auth/id/${userId}`)
                if (dbUser.status == 200) {
                    const user = dbUser.data
                    const isVerified = authenticator.check(totp, user['2faSecret'])

                    if (isVerified) {
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
                        return res.status(401).json({ message: "OTP invalid"})
                    }
                }
                else {
                    return res.status(dbUser.status).json({message: dbUser.data.message})
                }
            }
            else {
                return res.status(401).json({ message: "Token invalid"})
            }
        }
        else {
            return res.status(422).json({ message: 'Field(s) missing'})
        }
    }
    catch(error) {
        return res.status(500).json({message: error.message})
    }
}

const authRefreshLogin = async (req, res) => {
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
}

const auth2faGenerate = async (req, res) => {
    try {
        const dbUser = await axios.get(`${process.env.DB_BASE_URL}/api/users/${req.user.id}`)

        if (dbUser.status == 200) {
            const user = dbUser.data
            const secret = authenticator.generateSecret()
            const uri = authenticator.keyuri(user.email, 'CodeHabitat', secret)

            await axios.post(`${process.env.DB_BASE_URL}/api/auth/2fa/generate`, { userId: req.user.id, secret})

            const qr = await qrcode.toBuffer(uri, { type: 'image/png' })

            res.setHeader('Content-Disposition', 'attachment; filename=qrcode.png')
            return res.status(200).type('image/png').send(qr)
        }
        else {
            return res.status(dbUser.status).json({message: dbUser.data.message})
        }
    }
    catch(error) {
        return res.status(500).json({ message: error })
    }
}

const authValidate2fa = async (req, res) => {
    try {
        const { totp } = req.body

        if (totp) {
            const dbUser = await axios.get(`${process.env.DB_BASE_URL}/api/users/${req.user.id}`)

            if (dbUser.status == 200) {
                const user = dbUser.data
                const verified = authenticator.check(totp, user['2faSecret'])

                if (verified) {
                    await axios.post(`${process.env.DB_BASE_URL}/api/auth/2fa/validate`, { userId: req.user.id })

                    return res.status(200).json({ message: 'TOTP validated' })
                }
                else {
                    return res.status(400).json({ message: "TOTP invalid" })
                }
            }
            else {
                return res.status(dbUser.status).json({message: dbUser.data.message})
            }
        }
        else {
            return res.status(422).json({ message: 'TOTP required' })
        }
    }
    catch(error) {
        return res.status(500).json({ message: error })
    }
}

const authLogout = async (req, res) => {
    try {
        await axios.post(`${process.env.DB_BASE_URL}/api/auth/logout`, { userId: req.userId })

        return res.status(204)
    }
    catch (error) {
        return res.status(500).json({message: error})
    }
}

module.exports = { authRegister, authLogin, authLogin2fa, authRefreshLogin, auth2faGenerate, authValidate2fa, authLogout }