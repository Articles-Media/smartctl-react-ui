const express = require('express');
const router = express.Router();
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, exec, execFile } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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

router.post('/open-smartmontools-folder', (req, res) => {
    console.log("/api/open-smartmontools-folder");

    const smartmontoolsFolder = path.join('C:', 'Program Files', 'smartmontools');

    // The 'start' command in Windows opens a folder in File Explorer
    exec(`start "" "${smartmontoolsFolder}"`, (error) => {
        if (error) {
            console.error('Error opening smartmontools folder:', error);
            return res.status(500).json({ message: 'Failed to open smartmontools folder.', error: error.message });
        }
        res.json({ message: 'smartmontools folder opened successfully.' });
    });
});

router.post('/open-reports-folder', (req, res) => {
    console.log("/api/open-reports-folder");

    const reportsFolder = path.join('saved_reports');

    // The 'start' command in Windows opens a folder in File Explorer
    exec(`start "" "${reportsFolder}"`, (error) => {
        if (error) {
            console.error('Error opening reports folder:', error);
            return res.status(500).json({ message: 'Failed to open reports folder.', error: error.message });
        }
        res.json({ message: 'Reports folder opened successfully.' });
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

router.get('/drives', async (req, res) => {
    console.log("/api/drives");

    try {
        const configPath = path.join(__dirname, '..', '..', 'config.js');
        const configContent = fsSync.readFileSync(configPath, 'utf8');

        const pathMatch = configContent.match(/"smartctlPath":\s*"([^"]+)"/);
        const smartctlPath = pathMatch ? pathMatch[1] : 'C:/Program Files/smartmontools/bin/smartctl.exe';

        // 1. Run --scan to get the list of devices
        const { stdout: scanStdout } = await execPromise(`"${smartctlPath}" --scan`);

        // Parse paths (e.g., "/dev/sda -d ata # ..." becomes "/dev/sda")
        const drivePaths = scanStdout.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#'))
            .map(line => line);
        // .map(line => line.split(' ')[0]); 

        // 2. Run -i concurrently for each discovered drive to fetch detailed info
        const driveDetailsPromises = drivePaths.map(async (drivePath, driveIndex) => {
            try {
                const strippedDrivePath = drivePath.split(' ')[0]; // e.g., "/dev/pd0"

                // This splits "/dev/pd0" and takes the last part -> "pd0"
                const diskId = strippedDrivePath.split('/').pop();

                const { stdout: infoStdout } = await execPromise(`"${smartctlPath}" -i ${strippedDrivePath}`);

                const modelFamilyMatch = infoStdout.match(/Model Family:\s+(.*)/i);
                const modelNameMatch = infoStdout.match(/(?:Device Model|Model Number):\s+(.*)/i);
                const serialNumberMatch = infoStdout.match(/Serial Number:\s+(.*)/i);

                return {
                    path: drivePath,
                    disk_id: diskId,
                    disk_index: `/dev/pd${driveIndex}`,
                    model_family: modelFamilyMatch ? modelFamilyMatch[1].trim() : null,
                    model_name: modelNameMatch ? modelNameMatch[1].trim() : null,
                    serial_number: serialNumberMatch ? serialNumberMatch[1].trim() : null
                };
            } catch (err) {
                console.error(`Error fetching info for ${drivePath}:`, err.message);
                return {
                    path: drivePath,
                    error: 'Failed to retrieve detailed info'
                };
            }
        });

        // Wait for all the individual drive queries to finish
        const drives = await Promise.all(driveDetailsPromises);

        // 3. Get storage info (Capacity and Free Space) using PowerShell
        const psCommand = `powershell -NoProfile -Command "$disks = Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3'; $parts = Get-Partition | Where-Object DriveLetter; $disks | Select-Object DeviceID, VolumeName, Size, FreeSpace, @{Name='DiskNumber';Expression={$letter = $_.DeviceID.Substring(0,1); $p = @($parts | Where-Object DriveLetter -eq $letter)[0]; if ($null -ne $p) { $p.DiskNumber }}} | ConvertTo-Json -Compress"`;

        const { stdout: storageStdout } = await execPromise(psCommand);
        let storageInfo = [];
        if (storageStdout.trim()) {
            const parsedStorage = JSON.parse(storageStdout);

            // Ensure it's an array and filter out nulls
            const rawStorage = (Array.isArray(parsedStorage) ? parsedStorage : [parsedStorage]).filter(Boolean);

            storageInfo = rawStorage.map(drive => {
                // Map the DiskNumber to the path smartctl expects on Windows.
                if (drive.DiskNumber !== null && drive.DiskNumber !== undefined) {
                    // '/dev/pd0' maps to PhysicalDrive0 in Windows smartmontools
                    drive.SmartctlPath = `/dev/pd${drive.DiskNumber}`;

                    // Alternatively, if you are using raw win32 calls elsewhere:
                    // drive.Win32Path = `\\\\.\\PhysicalDrive${drive.DiskNumber}`;
                }
                return drive;
            });
        }

        res.json({
            drivePaths: drivePaths,
            drives: drives,
            storage: storageInfo,
            message: 'Drives fetched successfully.'
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

                // Save the report to a JSON file
                const serialNumber = parsedData.serial_number || 'Unknown';
                const date = new Date().toISOString().split('T')[0]; // yyyy-mm-dd
                const reportFilename = `${date}-${serialNumber}.json`;
                const rootDir = process.cwd();
                const reportsDir = path.join(rootDir, 'saved_reports');

                if (!fsSync.existsSync(reportsDir)) {
                    fsSync.mkdirSync(reportsDir, { recursive: true });
                }

                const reportPath = path.join(reportsDir, reportFilename);
                fsSync.writeFileSync(reportPath, JSON.stringify(parsedData, null, 2));

                // 3. Return the rich, human-readable JSON back to the client
                res.json({
                    success: true,
                    drive: targetDrive,
                    saved_report: reportFilename,
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

router.get('/reports', (req, res) => {
    console.log("/api/reports");

    const rootDir = process.cwd();
    const reportsDir = path.join(rootDir, 'saved_reports');

    if (!fsSync.existsSync(reportsDir)) {
        return res.json({ reports: [] });
    }

    const reportFiles = fsSync.readdirSync(reportsDir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
            const filePath = path.join(reportsDir, file);
            const stats = fsSync.statSync(filePath);

            let fileContent = {};
            try {
                fileContent = JSON.parse(fsSync.readFileSync(filePath, 'utf8'));
            } catch (err) {
                console.error(`Failed to parse report ${file}:`, err.message);
            }

            return {
                ...fileContent,
                fileContent,
                filename: file,
                created_at: stats.birthtime,
                updated_at: stats.mtime
            };
        });

    res.json({ reports: reportFiles });
});

module.exports = router;