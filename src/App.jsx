import React, { useEffect, useState } from 'react'

import ConfigEditor from './components/ConfigEditor'
import useSmartctlReactStore from './hooks/useSmartctlReactStore'

import AutoStart from './components/AutoStart'
import SmartctlPanel from './components/SmartctlPanel'
import SchedulePanel from './components/SchedulePanel'

export default function App() {

    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [configObj, setConfigObj] = useState(null)

    useEffect(() => {

        fetch('/api/config')
            .then((r) => r.json())
            .then((data) => {
                setContent(data.content || '')
                setConfigObj(data.obj || null)
                setLoading(false)
            })
            .catch((e) => {
                setMessage('Failed to load: ' + e.message)
                setLoading(false)
            })

        // fetchExtensions()

    }, [])

    async function save() {
        setSaving(true)
        setMessage('')
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            })
            const data = await res.json()
            if (res.ok) setMessage('Saved.')
            else setMessage('Error: ' + (data.error || res.statusText))
        } catch (e) {
            setMessage('Save failed: ' + e.message)
        }
        setSaving(false)
    }

    return (
        <div className="app">
            <h1>Articles Media Smartctl React UI</h1>
            {loading ? (
                <div>Loading...</div>
            ) : (
                <>

                    <AutoStart />

                    <SmartctlPanel />

                    {/* <SchedulePanel /> */}

                    <ConfigEditor
                        content={content}
                        setContent={setContent}
                        save={save}
                        saving={saving}
                        message={message}
                    />

                </>
            )}
        </div>
    )
}

