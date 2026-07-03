const express = require('express');
const router = express.Router();
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, exec } = require('child_process');

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

router.post('/open-startup', (req, res) => {
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

router.get('/detect-startup', (req, res) => {
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

router.post('/toggle-startup', async (req, res) => {
    console.log("/api/toggle-startup");

    // Adjusted path to find _install.bat in the root folder
    const targetFile = path.resolve(__dirname, '..', '..', '_install.bat');
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
});

module.exports = router;
