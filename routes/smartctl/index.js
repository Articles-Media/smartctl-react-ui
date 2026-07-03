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

router.post('/open-folder', (req, res) => {
    console.log("/api/open-folder");

    const startupFolder = path.join('C:', 'Program Files', 'smartmontools');

    // The 'start' command in Windows opens a folder in File Explorer
    exec(`start "" "${startupFolder}"`, (error) => {
        if (error) {
            console.error('Error opening startup folder:', error);
            return res.status(500).json({ message: 'Failed to open startup folder.', error: error.message });
        }
        res.json({ message: 'Startup folder opened successfully.' });
    });
});

module.exports = router;
