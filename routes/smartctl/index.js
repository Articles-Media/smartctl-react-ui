const express = require('express');
const router = express.Router();
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, exec, execFile } = require('child_process');

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

router.get('/check-install', async (req, res) => {
    console.log("/api/check-install");

    try {
        // 1. Locate and read the config file
        const configPath = path.join(__dirname, '..', '..', 'config.js');
        const configContent = fsSync.readFileSync(configPath, 'utf8');

        // 2. Extract the path (supports both single and double quotes)
        const pathMatch = configContent.match(/smartctlPath\s*:\s*['"]([^'"]+)['"]/);
        const smartctlPath = pathMatch ? pathMatch[1] : 'C:/Program Files/smartmontools/bin/smartctl.exe';

        try {
            // 3. Check if the file exists on the disk
            await fsSync.promises.access(smartctlPath, fsSync.constants.F_OK);

            // File exists!
            return res.json({
                installed: true,
                path: smartctlPath,
                message: 'Executable file found successfully.'
            });

        } catch (accessError) {
            // fs.access throws an error if the file is missing
            return res.json({
                installed: false,
                path: smartctlPath,
                message: 'Executable file not found at the specified path.'
            });
        }

    } catch (err) {
        console.error('Error checking file existence:', err);
        res.status(500).json({ error: 'Server error while verifying file', details: err.message });
    }
});

router.get('/drives', (req, res) => {
    console.log("/api/drives");

    try {
        // Since config.js uses ES modules (export default), but server is CommonJS, 
        // we read the file directly or require the path.
        const configPath = path.join(__dirname, '..', '..', 'config.js');
        const configContent = fsSync.readFileSync(configPath, 'utf8');

        // Simple extraction of smartctlPath from the string content of config.js
        const pathMatch = configContent.match(/"smartctlPath":\s*"([^"]+)"/);
        const smartctlPath = pathMatch ? pathMatch[1] : 'C:/Program Files/smartmontools/bin/smartctl.exe';

        exec(`"${smartctlPath}" --scan`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing smartctl: ${error}`);
                return res.status(500).json({ error: 'Failed to scan drives', details: error.message });
            }

            // Basic parsing of --scan output (usually lines like "/dev/sda -d ata # ...")
            const drives = stdout.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            res.json({
                drives: drives,
                message: 'Drives fetched successfully.'
            });
        });
    } catch (err) {
        console.error('Error fetching drives:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

router.get('/drives', (req, res) => {
    console.log("/api/drives");

    try {
        // Since config.js uses ES modules (export default), but server is CommonJS, 
        // we read the file directly or require the path.
        const configPath = path.join(__dirname, '..', '..', 'config.js');
        const configContent = fsSync.readFileSync(configPath, 'utf8');

        // Simple extraction of smartctlPath from the string content of config.js
        const pathMatch = configContent.match(/"smartctlPath":\s*"([^"]+)"/);
        const smartctlPath = pathMatch ? pathMatch[1] : 'C:/Program Files/smartmontools/bin/smartctl.exe';

        exec(`"${smartctlPath}" --scan`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing smartctl: ${error}`);
                return res.status(500).json({ error: 'Failed to scan drives', details: error.message });
            }

            // Basic parsing of --scan output (usually lines like "/dev/sda -d ata # ...")
            const drives = stdout.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            res.json({
                drives: drives,
                message: 'Drives fetched successfully.'
            });
        });
    } catch (err) {
        console.error('Error fetching drives:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

router.get('/quick-scan', (req, res) => {
    console.log("/api/quick-scan");

    // The client should send the drive index as a query parameter (e.g., /api/quick-scan?driveIndex=0)
    const { driveIndex } = req.query;

    // Validate that driveIndex exists and is a valid number
    if (driveIndex === undefined || isNaN(parseInt(driveIndex, 10))) {
        return res.status(400).json({ error: 'Missing or invalid driveIndex parameter. Must be a number.' });
    }

    // Construct the /dev/pdX command target (e.g., /dev/pd0, /dev/pd1)
    const targetDrive = `/dev/pd${parseInt(driveIndex, 10)}`;

    try {
        // 1. Locate and read the config file for the smartctl path
        const configPath = path.join(__dirname, '..', '..', 'config.js');
        let smartctlPath = 'C:/Program Files/smartmontools/bin/smartctl.exe';

        if (fsSync.existsSync(configPath)) {
            const configContent = fsSync.readFileSync(configPath, 'utf8');
            const pathMatch = configContent.match(/smartctlPath\s*:\s*['"]([^'"]+)['"]/);
            if (pathMatch) {
                smartctlPath = pathMatch[1];
            }
        }

        // 2. Execute smartctl securely using execFile
        // -a: All SMART info
        // -j: Output directly as JSON
        execFile(smartctlPath, ['-a', '-j', targetDrive], (error, stdout, stderr) => {
            try {
                const parsedData = JSON.parse(stdout);

                // Check if smartctl actually recognized the device and threw a fatal error
                if (parsedData.smartctl && parsedData.smartctl.messages) {
                    const errorMessages = parsedData.smartctl.messages.filter(m => m.severity === 'error');
                    if (errorMessages.length > 0) {
                        return res.status(400).json({
                            error: `smartctl returned an error for ${targetDrive}`,
                            details: errorMessages[0].string
                        });
                    }
                }

                // 3. Return the rich, human-readable JSON back to the client
                res.json({
                    success: true,
                    drive: targetDrive,
                    device_info: {
                        model: parsedData.model_name || 'Unknown',
                        serial_number: parsedData.serial_number || 'Unknown',
                        protocol: parsedData.device?.protocol || 'Unknown',
                        capacity_bytes: parsedData.user_capacity?.bytes || 0
                    },
                    health_status: parsedData.smart_status?.passed ? "PASSED" : "FAILED/UNKNOWN",
                    attributes: parsedData.ata_smart_attributes?.table || [],
                    raw_smartctl_data: parsedData 
                });

            } catch (parseError) {
                console.error(`Failed to parse smartctl JSON output. Raw output: ${stdout}`);
                return res.status(500).json({ 
                    error: 'Failed to read drive data', 
                    details: 'smartctl did not return valid JSON' 
                });
            }
        });
    } catch (err) {
        console.error('Error executing quick scan:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

module.exports = router;