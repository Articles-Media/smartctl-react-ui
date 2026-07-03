const express = require('express')
const fs = require('fs').promises
const fsSync = require('fs')
const path = require('path')
const cors = require('cors')
const os = require('os');
const { execSync, execFileSync, exec } = require('child_process')

const app = express()
app.use(cors())
app.use(express.json())


const rootPath = path.join(__dirname, '..')
const configPath = path.join(__dirname, 'config.js')
const contextMenuPath = path.join(__dirname, '..', 'context-menu')

// Serve extension static files (icons etc.) when requested via URL.
// For extensions outside this folder, icon data URLs are returned directly in the API response.
app.use('/extensions', express.static(path.join(rootPath, 'extensions')))

const mimeTypes = {
    '.ico': 'image/x-icon',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
}

function fileToDataUrl(filePath, buffer) {
    const ext = path.extname(filePath).toLowerCase()
    const mime = mimeTypes[ext] || 'application/octet-stream'
    return `data:${mime};base64,${buffer.toString('base64')}`
}

function escapePowerShellSingleQuotes(value) {
    return value.replace(/'/g, "''")
}

function createStartupShortcut(shortcutPath, targetFile) {
    const startupFolder = path.dirname(shortcutPath)
    fsSync.mkdirSync(startupFolder, { recursive: true })

    const script = [
        '$WshShell = New-Object -ComObject WScript.Shell',
        `$Shortcut = $WshShell.CreateShortcut('${escapePowerShellSingleQuotes(shortcutPath)}')`,
        `$Shortcut.TargetPath = '${escapePowerShellSingleQuotes(targetFile)}'`,
        `$Shortcut.WorkingDirectory = '${escapePowerShellSingleQuotes(path.dirname(targetFile))}'`,
        '$Shortcut.Save()'
    ].join('; ')

    execFileSync('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        script
    ], { stdio: 'pipe' })
}

app.post('/api/open-startup', (req, res) => {
    console.log("/api/open-startup");

    const startupFolder = path.join(os.homedir(), 'AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup');

    // The 'start' command in Windows opens a folder in File Explorer
    exec(`start "" "${startupFolder}"`, (error) => {
        if (error) {
            console.error('Error opening startup folder:', error);
            return res.status(500).json({ message: 'Failed to open startup folder.', error: error.message });
        }
        res.json({ message: 'Startup folder opened successfully.' });
    });
});

app.get('/api/detect-startup', (req, res) => {

    const shortcutName = 'Articles Media smartctl-react-ui.lnk';
    const startupFolder = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');

    const shortcutPath = path.join(startupFolder, shortcutName);

    // Check if the shortcut exists
    const isEnabled = fsSync.existsSync(shortcutPath);

    res.json({
        enabled: isEnabled,
        message: isEnabled ? 'Startup is currently enabled.' : 'Startup is currently disabled.'
    });

});

app.post('/api/toggle-startup', async (req, res) => {

    console.log("/api/toggle-startup");

    const targetFile = path.resolve(__dirname, '..', '_install.bat'); // Path to your target file
    const shortcutName = 'Articles Media smartctl-react-ui.lnk';
    const startupFolder = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
    const shortcutPath = path.join(startupFolder, shortcutName);

    try {
        if (fsSync.existsSync(shortcutPath)) {
            fsSync.unlinkSync(shortcutPath);
            res.json({ message: 'Startup disabled (shortcut removed).', enabled: false });
        } else {
            createStartupShortcut(shortcutPath, targetFile);

            if (!fsSync.existsSync(shortcutPath)) {
                throw new Error(`Shortcut was not created at ${shortcutPath}`);
            }

            res.json({ message: 'Startup enabled (shortcut created).', enabled: true });
        }
    } catch (error) {
        console.error('Error toggling startup:', error);
        res.status(500).json({ message: 'Failed to toggle startup.', error: error.message });
    }

})

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
