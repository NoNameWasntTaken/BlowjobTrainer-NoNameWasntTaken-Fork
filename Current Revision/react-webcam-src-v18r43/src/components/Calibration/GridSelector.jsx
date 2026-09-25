import React, { useState, useEffect } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { gridsAtom, selectedGridIdAtom, selectedGridAtom, isAllGridsModeAtom, gridMigrationDoneAtom } from '../../atoms/gridAtoms'
import { createDefaultGrid, generateUniqueGridName } from '../../utils/gridUtils'

function GridSelector({ disabled = false }) {
    const migrationDone = useAtomValue(gridMigrationDoneAtom)
    const grids = useAtomValue(gridsAtom)
    const selectedGridId = useAtomValue(selectedGridIdAtom)
    const selectedGrid = useAtomValue(selectedGridAtom)
    const isAllGridsMode = useAtomValue(isAllGridsModeAtom)
    const setSelectedGridId = useSetAtom(selectedGridIdAtom)
    const setGrids = useSetAtom(gridsAtom)
    
    const [gridName, setGridName] = useState('')
    const [nameError, setNameError] = useState('')
    const [showSuccessMessage, setShowSuccessMessage] = useState(false)

    // Update grid name input when selected grid changes
    useEffect(() => {
        if (selectedGrid) {
            setGridName(selectedGrid.name)
            setNameError('')
        } else {
            setGridName('')
        }
    }, [selectedGrid])

    // Early return if migration not done
    if (!migrationDone) {
        return null
    }

    const handleGridSelect = (e) => {
        const value = e.target.value
        if (value === 'all') {
            setSelectedGridId(null)
        } else {
            setSelectedGridId(value)
        }
    }

    const handleAddGrid = () => {
        setGrids(prev => {
            const currentGrids = Array.isArray(prev) ? prev : []
            const newGrid = createDefaultGrid(generateUniqueGridName(currentGrids))
            return [...currentGrids, newGrid]
        })
        setShowSuccessMessage(true)
        setTimeout(() => setShowSuccessMessage(false), 2000)
    }

    const handleRemoveGrid = () => {
        if (safeGrids.length <= 1) return
        if (!window.confirm('Are you sure you want to remove this grid? This cannot be undone.')) return
        setGrids(prev => {
            const currentGrids = Array.isArray(prev) ? prev : []
            if (currentGrids.length <= 1) {
                return currentGrids // Can't remove the last grid
            }
            const currentIndex = currentGrids.findIndex(g => g.id === selectedGridId)
            const remainingGrids = currentGrids.filter(g => g.id !== selectedGridId)
            const nextIndex = currentIndex < remainingGrids.length ? currentIndex : currentIndex - 1
            if (nextIndex >= 0 && nextIndex < remainingGrids.length) {
                setSelectedGridId(remainingGrids[nextIndex].id)
            } else if (remainingGrids.length > 0) {
                setSelectedGridId(remainingGrids[remainingGrids.length - 1].id)
            }
            return remainingGrids
        })
    }

    const handleNameChange = (e) => {
        const newName = e.target.value
        setGridName(newName)
        if (!selectedGrid) { return }
        setGrids(prev => {
            const currentGrids = Array.isArray(prev) ? prev : []
            const isDuplicate = currentGrids.some(g => g.id !== selectedGrid.id && g.name === newName)
            if (isDuplicate) {
                setNameError('Grid name must be unique')
                setGridName(selectedGrid.name)
                return currentGrids
            } else {
                setNameError('')
                return currentGrids.map(g => 
                    g.id === selectedGrid.id ? { ...g, name: newName } : g
                )
            }
        })
    }

    const safeGrids = Array.isArray(grids) ? grids : []

    return (
        <div className="row-centered margin-y-sm">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap', justifyContent: 'center' }}>
                    <select
                        id="grid-selector"
                        value={selectedGridId || 'all'}
                        onChange={handleGridSelect}
                        className="button padding-x-sm"
                        style={{ display: 'inline-block', minWidth: '140px' }}
                        disabled={disabled}
                    >
                        <option value="all">All Grids</option>
                        {safeGrids.map(grid => (
                            <option key={grid.id} value={grid.id}>
                                {grid.name}
                            </option>
                        ))}
                    </select>
                    <button
                        className="button padding-x-sm"
                        onClick={handleAddGrid}
                        disabled={disabled}
                    >
                        Add Grid
                    </button>
                    <button
                        className="button padding-x-sm"
                        onClick={handleRemoveGrid}
                        disabled={disabled || isAllGridsMode || safeGrids.length <= 1}
                    >
                        Remove Grid
                    </button>
                </div>
                
                {showSuccessMessage && (
                    <div style={{ color: 'var(--success)', fontSize: '12px', marginTop: '4px' }}>
                        Grid added successfully!
                    </div>
                )}
                
                {!isAllGridsMode && selectedGrid && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label htmlFor="grid-name" style={{ marginRight: '0px' }}>Grid Name:</label>
                            <input
                                id="grid-name"
                                type="text"
                                value={gridName}
                                onChange={handleNameChange}
                                className="button padding-x-sm"
                                style={{ width: '150px' }}
                                disabled={disabled}
                            />
                            {nameError && (
                                <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{nameError}</span>
                            )}
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                            <input
                                type="checkbox"
                                checked={selectedGrid?.balls ?? false}
                                onChange={() => setGrids(prev => prev.map(g => g.id === selectedGrid.id ? { ...g, balls: !g.balls } : g))}
                                disabled={disabled}
                            />
                            Balls region
                        </label>
                    </div>
                )}
            </div>
        </div>
    )
}

export default GridSelector
