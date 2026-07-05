import { useEffect, useMemo, useRef, useState } from "react"
import useSmartctlReactStore from "../hooks/useSmartctlReactStore"

export default function SchedulePanel({

}) {

    return (
        <div
            className="card"
            style={{
                marginBottom: 12,
            }}
        >
            <h2>Schedule Manager</h2>
            <p>
                Setup scheduled scans for your drives. You can configure the frequency and time of the scans, as well as the type of scan to perform. This allows you to automate the process of checking your drives for health and performance issues.
            </p>

        </div>
    )
}