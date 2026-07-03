import { useEffect, useMemo, useRef, useState } from "react"
import useSmartctlReactStore from "../hooks/useSmartctlReactStore"

export default function SmartctlPanel({

}) {

    function toggleStartup() {
        fetch('/api/toggle-startup', { method: 'POST' })
            .then((r) => r.json())
            .then((data) => {

                console.log(data)

                checkStartup()

            })
            .catch((e) => {
                alert('Uninstallation failed: ' + e.message)
            })
    }

    function checkStartup(startup) {

        if (startup && enabledCheck.current) {
            return
        }

        enabledCheck.current = true

        fetch('/api/detect-startup', { method: 'GET' })
            .then((r) => r.json())
            .then((data) => {
                console.log(data)

                if (data.enabled) {
                    setEnabled(true)
                } else {
                    setEnabled(false)
                }

            })
            .catch((e) => {
                alert('Failed to detect startup: ' + e.message)
            })

    }

    function openStartup(startup) {
        fetch('/api/open-folder', { method: 'POST' })
            .then((r) => r.json())
            .then((data) => {
                console.log(data)
            })
            .catch((e) => {
                alert('Failed to open folder: ' + e.message)
            })
    }

    const enabledCheck = useRef()
    const [enabled, setEnabled] = useState(false)

    useEffect(() => {
        // checkStartup(true)
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
                📂
                {enabled ?
                    <strong>Detected Installation!</strong>
                    :
                    <strong>Missing Installation!</strong>
                }

            </p>

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
                        Quick Scan
                    </button>
                    <button
                        onClick={() => {
                            // toggleStartup()
                        }}
                    >
                        Full Scan
                    </button>
                </div>

                <button
                    onClick={() => {
                        checkStartup()
                    }}
                >
                    Check
                </button>

            </div>

        </div>
    )
}