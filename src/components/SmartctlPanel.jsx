import { useEffect, useMemo, useRef, useState } from "react"
import useSmartctlReactStore from "../hooks/useSmartctlReactStore"
import DrivesList from "./DrivesList"

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

            <div
                style={{
                    display: 'flex',
                    // justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 20,
                }}
            >
                <div
                    onClick={() => {
                        openSmartmontoolsFolder()
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