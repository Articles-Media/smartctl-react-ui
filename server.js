const express = require('express')
const fs = require('fs').promises
const path = require('path')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

const startupRouter = require('./routes/startup')
app.use('/api', startupRouter)

const smartctlRouter = require('./routes/smartctl')
app.use('/api', smartctlRouter)

const rootPath = path.join(__dirname, '..')
const configPath = path.join(__dirname, 'config.js')
const contextMenuPath = path.join(__dirname, '..', 'context-menu')

app.get('/api/config', async (req, res) => {
    try {
        const content = await fs.readFile(configPath, 'utf8')
        res.json({
            content,
            obj: configPath ? require(configPath).default : null
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

app.post('/api/config', async (req, res) => {
    try {
        const { content } = req.body
        if (typeof content !== 'string') return res.status(400).json({ error: 'Invalid content' })
        await fs.writeFile(configPath, content, 'utf8')
        res.json({ ok: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

if (process.env.NODE_ENV === 'production') {
    const dist = path.join(__dirname, 'dist')
    app.use(express.static(dist))
    app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const port = process.env.PORT || 3064
app.listen(port, () => console.log(`API server running on http://localhost:${port}`))
