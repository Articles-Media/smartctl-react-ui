import { useEffect, useMemo, useRef, useState } from "react"
import useSmartctlReactStore from "../hooks/useSmartctlReactStore"
import DrivesList from "./DrivesList"

const installation_url = "https://github.com/smartmontools/smartmontools/releases/download/RELEASE_7_5/smartmontools-7.5.win32-setup.exe"

export default function SmartctlPanel({

}) {

    const drives = useSmartctlReactStore((state) => state.drives)
    const setDrives = useSmartctlReactStore((state) => state.setDrives)

    const reports = useSmartctlReactStore((state) => state.reports)
    const setReports = useSmartctlReactStore((state) => state.setReports)

    const setStorage = useSmartctlReactStore((state) => state.setStorage)

    const lastDrivesFetchTime = useSmartctlReactStore((state) => state.lastDrivesFetchTime)
    const setLastDrivesFetchTime = useSmartctlReactStore((state) => state.setLastDrivesFetchTime)

    function checkInstalled(startup) {

        if (startup && enabledCheck.current) {
            return
        }

        enabledCheck.current = true

        fetch('/api/smartctl/check-install', { method: 'GET' })
            .then((r) => r.json())
            .then((data) => {
                console.log(data)

                if (data.installed) {
                    setEnabled(true)
                } else {
                    setEnabled(false)
                }

            })
            .catch((e) => {
                alert('Failed to detect installation: ' + e.message)
            })

    }

    function openSmartmontoolsFolder(startup) {
        fetch('/api/smartctl/open-smartmontools-folder', { method: 'POST' })
            .then((r) => r.json())
            .then((data) => {
                console.log(data)
            })
            .catch((e) => {
                alert('Failed to open smartmontools folder: ' + e.message)
            })
    }

    function openReportsFolder(startup) {
        fetch('/api/smartctl/open-reports-folder', { method: 'POST' })
            .then((r) => r.json())
            .then((data) => {
                console.log(data)
            })
            .catch((e) => {
                alert('Failed to open reports folder: ' + e.message)
            })
    }

    function fetchDrives(startup) {
        fetch('/api/smartctl/drives', { method: 'GET' })
            .then((r) => r.json())
            .then((data) => {
                console.log(data)
                setDrives(data.drives)
                setStorage(data.storage)
                setLastDrivesFetchTime(Date.now())
                fetchReports()
            })
            .catch((e) => {
                alert('Failed to fetch drives: ' + e.message)
            })
    }

    function fetchReports(startup) {
        fetch('/api/smartctl/reports', { method: 'GET' })
            .then((r) => r.json())
            .then((data) => {
                console.log(data)
                setReports(data.reports)
            })
            .catch((e) => {
                alert('Failed to fetch reports: ' + e.message)
            })
    }

    const enabledCheck = useRef()
    const [enabled, setEnabled] = useState(false)

    useEffect(() => {
        checkInstalled(true)
    }, [])

    function handleInstallSmartmontools() {
        alert('Opening a new window to download smartmontools via GitHub on a pinned 7.5 release. Using this url: ' + installation_url)
        window.open(
            installation_url,
            '_blank',
            'noopener,noreferrer'
        )
    }

    return (
        <div
            className="card"
            style={{
                marginBottom: 12,
            }}
        >
            <h2>Smartctl Tools</h2>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    // justifyContent: 'space-between',
                    // alignItems: 'center',
                    gap: 10,
                }}
            >
                <div
                    onClick={() => {

                        // TEMP force
                        handleInstallSmartmontools()
                        return

                        if (enabled) {
                            openSmartmontoolsFolder()
                        } else {
                            handleInstallSmartmontools()
                        }

                    }}
                    style={{
                        textDecoration: 'underline',
                        cursor: 'pointer'
                    }}
                >
                    {enabled ?
                        <strong>✅ Detected Installation!</strong>
                        :
                        <div>
                            <strong>❌ Missing Installation! Click to install.</strong>
                            <div
                                style={{
                                    fontSize: 12,
                                    marginTop: 4,
                                    color: '#888'
                                }}
                            >
                                Will install https://github.com/smartmontools/smartmontools/releases/download/RELEASE_7_5/smartmontools-7.5.win32-setup.exe via https://github.com/smartmontools/smartmontools GitHub repository.
                            </div>
                        </div>
                    }

                </div>

                <div
                    onClick={() => {
                        openReportsFolder()
                    }}
                    style={{
                        textDecoration: 'underline',
                        cursor: 'pointer'
                    }}
                >
                    📃 {reports.length || 0} Reports Found
                </div>

            </div>

            {drives.length > 0 && (
                <div>
                    <h3 className="" style={{ marginBottom: 10 }}>
                        Detected Drives:
                    </h3>
                    <DrivesList />
                </div>
            )}

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >

                <div>
                    <button
                        onClick={() => {
                            // toggleStartup()
                        }}
                    >
                        Quick Scan All
                    </button>
                    <button
                        onClick={() => {
                            // toggleStartup()
                        }}
                    >
                        Full Scan All
                    </button>
                </div>

                <button
                    onClick={() => {
                        fetchDrives()
                    }}
                >
                    Check
                </button>

            </div>

        </div>
    )
}