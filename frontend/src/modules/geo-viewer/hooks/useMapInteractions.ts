import { useState, useCallback, useRef, useEffect } from 'react'
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
  onSave?: (towers: Tower[], isAuto?: boolean) => Promise<void>
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
  onSave,
}: UseMapInteractionsProps) {
  const { toast: showToast } = useToast()
  const [isConnectMode, setIsConnectMode] = useState(false)
  const [selectedStartTower, setSelectedStartTower] = useState<number | null>(
    null
  )
  const [isSwapMode, setIsSwapMode] = useState(false)
  const [selectedSwapTower, setSelectedSwapTower] = useState<number | null>(
    null
  )
  const [isDebugMode] = useState(false)
  const [debugPoints, setDebugPoints] = useState<any[]>([])
  const [isAutoConnecting, setIsAutoConnecting] = useState(false)

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

      if (isSwapMode) {
        if (selectedSwapTower === null) {
          setSelectedSwapTower(index)
          showToast({
            title: 'Torre 1 Selecionada 📍',
            description: `Selecione a próxima torre para trocar a posição com ${towers[index].name}.`,
          })
        } else {
          if (selectedSwapTower === index) {
            setSelectedSwapTower(null)
            return
          }

          const newTowers = [...towers]
          const tower1 = { ...newTowers[selectedSwapTower] }
          const tower2 = { ...newTowers[index] }

          // Trocar coordenadas (Lat/Lng) e altitude original
          const tempCoords = { ...tower1.coordinates }
          tower1.coordinates = { ...tower2.coordinates }
          tower2.coordinates = tempCoords

          // E também trocar as elevações individuais no terreno
          const newAlts = { ...individualAltitudes }
          const alt1 = newAlts[tower1.name]
          const alt2 = newAlts[tower2.name]
          if (alt1 !== undefined && alt2 !== undefined) {
            newAlts[tower1.name] = alt2
            newAlts[tower2.name] = alt1
            setIndividualAltitudes(newAlts)
          }

          newTowers[selectedSwapTower] = tower1
          newTowers[index] = tower2

          setTowers(newTowers)
          
          showToast({
            title: 'Posições Trocadas! 🔄',
            description: `${tower1.name} e ${tower2.name} trocaram de lugar.`,
          })
          setSelectedSwapTower(null)
        }
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

        const updatedConnections = [
          ...connections.filter(c => c.from !== startTower.name),
          newConn,
        ]
        
        setConnections(updatedConnections)

        showToast({
          title: 'Conexão Atualizada! 🔗',
          description: `${startTower.name} ➡️ ${endTower.name}`,
        })
        setSelectedStartTower(null)
      }
    },
    [
      isDebugMode,
      isSwapMode,
      selectedSwapTower,
      isConnectMode,
      selectedStartTower,
      towers,
      setTowers,
      setConnections,
      connections,
      showToast,
      individualAltitudes,
      setIndividualAltitudes,
    ]
  )

  // Sequential Auto-Connect Logic
  useEffect(() => {
    if (isAutoConnecting && towers.length >= 2) {
      const newConnections = []
      for (let i = 0; i < towers.length - 1; i++) {
        newConnections.push({
          from: towers[i].name,
          to: towers[i + 1].name,
        })
      }

      // Only update if connections changed to avoid infinite loop
      const currentConnStr = JSON.stringify(connections)
      const newConnStr = JSON.stringify(newConnections)

      if (currentConnStr !== newConnStr) {
        setConnections(newConnections)
      }
    }
  }, [isAutoConnecting, towers, connections, setConnections])

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
    isAutoConnecting,
    setIsAutoConnecting,
    isSwapMode,
    setIsSwapMode,
    selectedSwapTower,
    setSelectedSwapTower,
  }
}
