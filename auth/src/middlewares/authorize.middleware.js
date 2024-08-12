const axios = require('axios')

function authorize(roles=[]) {
    return async (req, res, next) => {
        const user = await axios.get(`${process.env.DB_BASE_URL}/api/users/${req.user.id}`)
        
        if (user && roles.includes(user.data.role)) {
            next()
        }
        else {
            return res.status(403).json({message: "Access Denied"}) 
        }
    }
}

module.exports = authorize