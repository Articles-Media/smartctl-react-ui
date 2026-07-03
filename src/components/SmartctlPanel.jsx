import { useEffect, useMemo, useRef, useState } from "react"
import useSmartctlReactStore from "../hooks/useSmartctlReactStore"

export default function SmartctlPanel({

}) {

    const drives = useSmartctlReactStore((state) => state.drives)
    const setDrives = useSmartctlReactStore((state) => state.setDrives)
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

    function openStartup(startup) {
        fetch('/api/smartctl/open-folder', { method: 'POST' })
            .then((r) => r.json())
            .then((data) => {
                console.log(data)
            })
            .catch((e) => {
                alert('Failed to open folder: ' + e.message)
            })
    }

    function fetchDrives(startup) {
        fetch('/api/smartctl/drives', { method: 'GET' })
            .then((r) => r.json())
            .then((data) => {
                console.log(data)
                setDrives(data.drives)
                setLastDrivesFetchTime(Date.now())
            })
            .catch((e) => {
                alert('Failed to fetch drives: ' + e.message)
            })
    }

    function driveQuickScan(driveId, driveIndex) {
        fetch(`/api/smartctl/quick-scan?driveIndex=${encodeURIComponent(driveIndex)}`, { method: 'GET' })
            .then((r) => r.json())
            .then((data) => {
                console.log(data)
            })
            .catch((e) => {
                alert('Failed to fetch drives: ' + e.message)
            })
    }

    const enabledCheck = useRef()
    const [enabled, setEnabled] = useState(false)

    useEffect(() => {
        checkInstalled(true)
    }, [])

    return (
        <div
            className="card"
            style={{
                marginBottom: 12,
            }}
        >
            <h2>Smartctl Tools</h2>

            <p
                onClick={() => {
                    openStartup()
                }}
                style={{
                    textDecoration: 'underline',
                    cursor: 'pointer'
                }}
            >                
                {enabled ?
                    <strong>✅ Detected Installation!</strong>
                    :
                    <strong>❌ Missing Installation!</strong>
                }

            </p>

            {drives.length > 0 && (
                <div>
                    <h3 className="" style={{ marginBottom: 10 }}>
                        Detected Drives:
                    </h3>
                    <ul style={{ marginTop: 5, marginBottom: 20 }}>
                        {drives.map((drive) => (
                            <li key={drive} style={{ marginBottom: 10 }}>
                                <div>{drive}</div>
                                <button
                                    onClick={() => {
                                        driveQuickScan(drive, drives.indexOf(drive))
                                    }}
                                >
                                    Quick Scan
                                </button>
                                <button
                                    onClick={() => {
                                        // toggleStartup()
                                    }}
                                >
                                    Full Scan
                                </button>
                            </li>
                        ))}
                    </ul>
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