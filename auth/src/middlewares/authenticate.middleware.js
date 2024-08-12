const jwt = require('jsonwebtoken')

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
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ message: 'Access token expired' })
        }
        else if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ message: 'Access token invalid' })
        }
        else {
            return res.status(500).json({ message: error.message })
        }
    }
}

module.exports = authenticate