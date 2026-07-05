import useSmartctlReactStore from "../hooks/useSmartctlReactStore"

export default function DrivesList({ }) {

    const drives = useSmartctlReactStore((state) => state.drives)
    const setDrives = useSmartctlReactStore((state) => state.setDrives)

    const reports = useSmartctlReactStore((state) => state.reports)
    const storage = useSmartctlReactStore((state) => state.storage)

    // const lastDrivesFetchTime = useSmartctlReactStore((state) => state.lastDrivesFetchTime)
    // const setLastDrivesFetchTime = useSmartctlReactStore((state) => state.setLastDrivesFetchTime)

    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    function parseReportObject(reportEntry) {
        if (!reportEntry) return null

        const possible = [
            reportEntry.report,
            reportEntry.data,
            reportEntry.json,
            reportEntry.content,
            reportEntry,
        ]

        for (const value of possible) {
            if (!value) continue

            if (typeof value === 'string') {
                try {
                    const parsed = JSON.parse(value)
                    if (parsed && typeof parsed === 'object') return parsed
                } catch {
                    // Not JSON content, keep searching other fields.
                }
            }

            if (typeof value === 'object' && value.smartctl) {
                return value
            }
        }

        return null
    }

    function getSmartAttribute(reportObj, id) {
        return reportObj?.ata_smart_attributes?.table?.find((attr) => attr.id === id)
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

    return (
        <ul style={{ marginTop: 5, marginBottom: 20 }}>
            {drives.map((drive) => {

                const foundReports = reports.filter((report) => report.filename.split('-').pop().split('.')[0] === drive.serial_number)

                const latestReportEntry = [...foundReports].sort((a, b) => a.filename.localeCompare(b.filename)).at(-1)
                const latestReport = parseReportObject(latestReportEntry)

                const smartPassed = latestReport?.smart_status?.passed
                const temperature = latestReport?.temperature?.current ?? getSmartAttribute(latestReport, 194)?.raw?.value
                const powerOnHours = latestReport?.power_on_time?.hours
                const reallocatedSectors = getSmartAttribute(latestReport, 5)?.raw?.value
                const pendingSectors = getSmartAttribute(latestReport, 197)?.raw?.value
                const offlineUncorrectable = getSmartAttribute(latestReport, 198)?.raw?.value

                const storage_lookup = storage.find((s) => s.SmartctlPath === drive.disk_index)

                return (
                    <li
                        key={drive.path}
                        style={{
                            display: 'flex',
                            // flexDirection: 'column',
                            padding: 10,
                            border: '1px solid #ccc',
                            borderRadius: 5,
                            marginBottom: 10
                        }}
                    >

                        {/* Main info and actions */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                width: '50%',
                                flexShrink: 0,
                            }}
                        >

                            <div
                                style={{
                                    fontSize: 12,
                                    marginBottom: 5,
                                }}
                            >
                                <div>{drive.path}</div>
                                <div>Name: {drive.model_name} | Serial: {drive.serial_number}</div>

                                {storage_lookup && (
                                    <div>
                                        <div>Storage Free: {formatBytes(storage_lookup.FreeSpace)}</div>
                                        <div>Storage Size: {formatBytes(storage_lookup.Size)}</div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <button
                                    style={{
                                        fontSize: 10,
                                    }}
                                    onClick={() => {
                                        driveQuickScan(drive, drives.indexOf(drive))
                                    }}
                                >
                                    Quick Scan
                                </button>
                                <button
                                    style={{
                                        fontSize: 10,
                                    }}
                                    onClick={() => {
                                        // toggleStartup()
                                    }}
                                >
                                    Full Scan
                                </button>
                                <button
                                    style={{
                                        fontSize: 10,
                                    }}
                                    onClick={() => {
                                        // toggleStartup()
                                    }}
                                >
                                    View History ({foundReports?.length || 0})
                                </button>
                            </div>

                        </div>

                        {/* Basic S.M.A.R.T. Info */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                width: '50%',
                                flexShrink: 0,
                            }}
                        >

                            {!latestReport && (
                                <div style={{ fontSize: 12, color: '#666' }}>
                                    No SMART report loaded yet.
                                </div>
                            )}

                            {latestReport && (
                                <>
                                    <div style={{ fontSize: 12 }}>
                                        SMART Health: {smartPassed === true ? 'PASS' : smartPassed === false ? 'FAIL' : 'Unknown'}
                                    </div>

                                    <div style={{ fontSize: 12 }}>
                                        Temperature: {temperature !== undefined ? `${temperature} C` : 'N/A'}
                                    </div>

                                    <div style={{ fontSize: 12 }}>
                                        Power-On Hours: {powerOnHours ?? 'N/A'}
                                    </div>

                                    <div style={{ fontSize: 12 }}>
                                        Reallocated Sectors: {reallocatedSectors ?? 'N/A'}
                                    </div>

                                    <div style={{ fontSize: 12 }}>
                                        Pending Sectors: {pendingSectors ?? 'N/A'}
                                    </div>

                                    <div style={{ fontSize: 12 }}>
                                        Offline Uncorrectable: {offlineUncorrectable ?? 'N/A'}
                                    </div>
                                </>
                            )}

                        </div>

                    </li>
                )

            })}
        </ul>
    )

}