import { useState, useCallback, useRef } from 'react'
import { MapRef } from 'react-map-gl/mapbox'
import { Tower } from '../types/geo-viewer'
import { useToast } from '@/hooks/use-toast'

interface UseMapInteractionsProps {
  towers: Tower[]
  setTowers: (towers: Tower[]) => void
  towersRef: React.MutableRefObject<Tower[]>
  connections: { from: string; to: string }[]
  setConnections: (connections: { from: string; to: string }[]) => void
  connectionsRef: React.MutableRefObject<{ from: string; to: string }[]>
  mapRef: React.RefObject<MapRef>
  towerElevation: number
  individualAltitudes: Record<string, number>
  setIndividualAltitudes: (alts: Record<string, number>) => void
}

export function useMapInteractions({
  towers,
  setTowers,
  towersRef,
  connections,
  setConnections,
  connectionsRef,
  mapRef,
  towerElevation,
  individualAltitudes,
  setIndividualAltitudes,
}: UseMapInteractionsProps) {
  const { toast: showToast } = useToast()
  const [isConnectMode, setIsConnectMode] = useState(false)
  const [selectedStartTower, setSelectedStartTower] = useState<number | null>(
    null
  )
  const [isDebugMode] = useState(false)
  const [debugPoints, setDebugPoints] = useState<any[]>([])

  const lastSnapTime = useRef<number>(0)

  const handleSnapToTerrain = useCallback(
    (silent = false, forceAll = false) => {
      const mapInstance = mapRef.current?.getMap()
      if (!mapInstance) return

      const now = Date.now()
      if (!forceAll && now - lastSnapTime.current < 3000) return
      lastSnapTime.current = now

      const newAlts: Record<string, number> = { ...individualAltitudes }
      const bounds = mapInstance.getBounds()
      let successCount = 0
      let changed = false

      towersRef.current.forEach(tower => {
        if (
          !forceAll &&
          !bounds.contains([tower.coordinates.lng, tower.coordinates.lat])
        ) {
          return
        }

        const elevation = mapInstance.queryTerrainElevation([
          tower.coordinates.lng,
          tower.coordinates.lat,
        ])
        if (elevation !== null && elevation !== undefined) {
          if (newAlts[tower.name] !== elevation) {
            newAlts[tower.name] = elevation
            successCount++
            changed = true
          }
        }
      })

      if (changed) {
        setIndividualAltitudes(newAlts)
        if (!silent) {
          showToast({
            title: 'Auto-Alinhamento Concluído 🛰️',
            description: `${successCount} torres ajustadas ao relevo do terreno.`,
          })
        }
      }
    },
    [individualAltitudes, mapRef, setIndividualAltitudes, showToast, towersRef]
  )

  const handleAutoRotateTowers = useCallback(
    (silent = false) => {
      const activeTowers = towersRef.current
      const activeConnections = connectionsRef.current

      if (activeTowers.length === 0) return

      const newTowers = [...activeTowers]
      let changed = false

      newTowers.forEach((tower, index) => {
        const connectedNeighbors = activeConnections
          .filter(
            c =>
              c.from.trim().toUpperCase() === tower.name.trim().toUpperCase() ||
              c.to.trim().toUpperCase() === tower.name.trim().toUpperCase()
          )
          .map(c => {
            const otherName =
              c.from.trim().toUpperCase() === tower.name.trim().toUpperCase()
                ? c.to
                : c.from
            return activeTowers.find(
              t =>
                t.name.trim().toUpperCase() === otherName.trim().toUpperCase()
            )
          })
          .filter(Boolean)

        if (connectedNeighbors.length > 0) {
          let finalRotation = 0
          if (connectedNeighbors.length === 1) {
            const n = connectedNeighbors[0] as Tower
            const dLon = n.coordinates.lng - tower.coordinates.lng
            const y =
              Math.sin((dLon * Math.PI) / 180) *
              Math.cos((n.coordinates.lat * Math.PI) / 180)
            const x =
              Math.cos((tower.coordinates.lat * Math.PI) / 180) *
                Math.sin((n.coordinates.lat * Math.PI) / 180) -
              Math.sin((tower.coordinates.lat * Math.PI) / 180) *
                Math.cos((n.coordinates.lat * Math.PI) / 180) *
                Math.cos((dLon * Math.PI) / 180)
            finalRotation = Math.atan2(y, x) * (180 / Math.PI)
          } else {
            const bearings = connectedNeighbors.slice(0, 2).map(n => {
              const towerN = n as Tower
              const dLon = towerN.coordinates.lng - tower.coordinates.lng
              const y =
                Math.sin((dLon * Math.PI) / 180) *
                Math.cos((towerN.coordinates.lat * Math.PI) / 180)
              const x =
                Math.cos((tower.coordinates.lat * Math.PI) / 180) *
                  Math.sin((towerN.coordinates.lat * Math.PI) / 180) -
                Math.sin((tower.coordinates.lat * Math.PI) / 180) *
                  Math.cos((towerN.coordinates.lat * Math.PI) / 180) *
                  Math.cos((dLon * Math.PI) / 180)
              return Math.atan2(y, x) * (180 / Math.PI)
            })
            let diff = bearings[1] - bearings[0]
            while (diff < -180) diff += 360
            while (diff > 180) diff -= 360
            finalRotation = bearings[0] + diff / 2
          }

          if (Math.abs((tower.rotation || 0) - finalRotation) > 0.1) {
            newTowers[index] = { ...tower, rotation: finalRotation }
            changed = true
          }
        }
      })

      if (changed) {
        setTowers(newTowers)
        if (!silent) {
          showToast({
            title: 'Ângulos Ajustados! 📐',
            description:
              'Torres rotacionadas para alinhar as mísulas com os cabos.',
          })
        }
      }
    },
    [connectionsRef, setTowers, showToast, towersRef]
  )

  const handleTowerClick = useCallback(
    (info: any, index: number) => {
      if (isDebugMode) {
        // Debug mode logic
        return
      }

      if (!isConnectMode) {
        // Selection mode logic (usually handled by showing a modal)
        return
      }

      if (selectedStartTower === null) {
        setSelectedStartTower(index)
      } else {
        if (selectedStartTower === index) {
          setSelectedStartTower(null)
          return
        }

        const startTower = towers[selectedStartTower]
        const endTower = towers[index]
        const newConn = { from: startTower.name, to: endTower.name }

        setConnections([
          ...connections.filter(c => c.from !== startTower.name),
          newConn,
        ])
        showToast({
          title: 'Conexão Atualizada! 🔗',
          description: `${startTower.name} ➡️ ${endTower.name}`,
        })
        setSelectedStartTower(null)
      }
    },
    [
      isDebugMode,
      isConnectMode,
      selectedStartTower,
      towers,
      setConnections,
      connections,
      showToast,
    ]
  )

  return {
    isConnectMode,
    setIsConnectMode,
    selectedStartTower,
    setSelectedStartTower,
    debugPoints,
    setDebugPoints,
    handleSnapToTerrain,
    handleAutoRotateTowers,
    handleTowerClick,
  }
}
