import { useState, useRef, useEffect } from "react";
import { Tower, Cable, Spacer, AnchorPlate } from "../types";

export function useSceneData() {
  const [towers, setTowers] = useState<Tower[]>([]);
  const towersRef = useRef(towers);
  const [cables, setCables] = useState<Cable[]>([]);
  const [spacers, setSpacers] = useState<Spacer[]>([]);
  const [signalSpheres, setSignalSpheres] = useState<
    {
      position: [number, number, number];
      color: [number, number, number];
      radius: number;
    }[]
  >([]);
  const [anchorPlates, setAnchorPlates] = useState<AnchorPlate[]>([]);
  const [connections, setConnections] = useState<{ from: string; to: string }[]>([]);
  const connectionsRef = useRef(connections);

  useEffect(() => {
    towersRef.current = towers;
  }, [towers]);

  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  return {
    towers,
    setTowers,
    towersRef,
    cables,
    setCables,
    spacers,
    setSpacers,
    signalSpheres,
    setSignalSpheres,
    anchorPlates,
    setAnchorPlates,
    connections,
    setConnections,
    connectionsRef,
  };
}
