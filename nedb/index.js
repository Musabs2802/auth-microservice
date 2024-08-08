const express = require('express')
const datastore = require('nedb-promises')
const bcrypt = require('bcrypt')

const app = express()

// Configure body parser
app.use(express.json())

const users = datastore.create('./databases/Users.db')

app.get('/', (req, res) => {
    res.status(200).json({message: "Datastore (nedb) Microservice"})
})

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body

    if (await users.findOne({ email })) {
        return res.status(409).json({message: 'Email Duplicated'})
    }

    const hash = await bcrypt.hash(password, 10)

    const user = await users.insert({
        name, 
        email, 
        password: hash
    })

    return res.status(201).json({message: 'Item created', _id: user._id})
})

app.listen(3001, () => console.log("Microservice (nedb) started on port 3001"))