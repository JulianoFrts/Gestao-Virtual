import sys

path = r'c:\Users\Juliano Freitas\Documents\GitHub\teamtrack-pro\src\components\map\mapbox-3d-layer.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import for CableConfigModal
old_imports = """import { CatenaryCalculator, Point3D } from '@/services/catenary-calculator';"""
new_imports = """import { CatenaryCalculator, Point3D } from '@/services/catenary-calculator';
import { CableConfigModal, CableSettings, DEFAULT_CABLE_SETTINGS, CableAnchorConfig } from './cable-config-modal';
import { Cable } from 'lucide-react';"""

if old_imports in content:
    content = content.replace(old_imports, new_imports)

# 2. Add state for cable config modal
old_state = """    const [editingElevationElement, setEditingElevationElement] = useState<{ docId: string; elementId: string } | null>(null);"""
new_state = """    const [editingElevationElement, setEditingElevationElement] = useState<{ docId: string; elementId: string } | null>(null);

    // Cable Configuration State
    const [isCableConfigOpen, setIsCableConfigOpen] = useState(false);
    const [cableSettings, setCableSettings] = useState<CableSettings>(DEFAULT_CABLE_SETTINGS);"""

if old_state in content:
    content = content.replace(old_state, new_state)

# 3. Update cableDeckLayers to use cableSettings instead of hardcoded configs
old_configs_block = """        // Engineering attachment points for the \"industrial-tower\" model
        const cableConfigs = [
            { h: -6.5, vRatio: 0.53 }, { h: 6.5, vRatio: 0.53 }, // Lower arms (~16/30)
            { h: -8.0, vRatio: 0.76 }, { h: 8.0, vRatio: 0.76 }, // Middle arms (~23/30)
            { h: -6.5, vRatio: 0.96 }, { h: 6.5, vRatio: 0.96 }  // Upper arms (~29/30)
        ];"""

new_configs_block = """        // Use dynamic cable settings from modal configuration
        const enabledAnchors = cableSettings.anchors.filter(a => a.enabled);"""

if old_configs_block in content:
    content = content.replace(old_configs_block, new_configs_block)

# 4. Update getAnchor function to accept CableAnchorConfig
old_anchor_fn = """        const getAnchor = (t: any, config: {h: number, vRatio: number}) => {"""
new_anchor_fn = """        const getAnchor = (t: any, config: CableAnchorConfig) => {"""

if old_anchor_fn in content:
    content = content.replace(old_anchor_fn, new_anchor_fn)

# 5. Update the forEach loops to use enabledAnchors and config properties
old_foreach_db = """                    cableConfigs.forEach((config, cIdx) => {
                        const startAnchor = getAnchor(t1, config);
                        const endAnchor = getAnchor(t2, config);

                        const points = CatenaryCalculator.generateCatenaryPoints(startAnchor, endAnchor, tension, 100);
                        paths.push({
                            path: points.map(p => [p.x, p.y, p.z]),
                            color: span.cable_color || '#1e88e5',
                            id: `${span.id}-${cIdx}`
                        });
                    });"""

new_foreach_db = """                    enabledAnchors.forEach((config, cIdx) => {
                        const startAnchor = getAnchor(t1, config);
                        const endAnchor = getAnchor(t2, config);

                        const points = CatenaryCalculator.generateCatenaryPoints(startAnchor, endAnchor, cableSettings.tension, 100);
                        paths.push({
                            path: points.map(p => [p.x, p.y, p.z]),
                            color: span.cable_color || config.color,
                            width: config.width,
                            id: `${span.id}-${config.id}`
                        });
                    });"""

if old_foreach_db in content:
    content = content.replace(old_foreach_db, new_foreach_db)

# 6. Update fallback auto-connect loop
old_foreach_auto = """                cableConfigs.forEach((config, cIdx) => {
                    const startAnchor = getAnchor(t1, config);
                    const endAnchor = getAnchor(t2, config);
                    
                    const points = CatenaryCalculator.generateCatenaryPoints(startAnchor, endAnchor, 1200, 60);
                    paths.push({
                        path: points.map(p => [p.x, p.y, p.z]),
                        color: '#00ffff',
                        id: `auto-${pairKey}-${cIdx}`
                    });
                });"""

new_foreach_auto = """                enabledAnchors.forEach((config) => {
                    const startAnchor = getAnchor(t1, config);
                    const endAnchor = getAnchor(t2, config);
                    
                    const points = CatenaryCalculator.generateCatenaryPoints(startAnchor, endAnchor, cableSettings.tension, 60);
                    paths.push({
                        path: points.map(p => [p.x, p.y, p.z]),
                        color: config.color,
                        width: config.width,
                        id: `auto-${pairKey}-${config.id}`
                    });
                });"""

if old_foreach_auto in content:
    content = content.replace(old_foreach_auto, new_foreach_auto)

# 7. Update PathLayer to use per-cable width and global opacity
old_pathlayer = """        return [
            new PathLayer({
                id: 'deck-cables-layer',
                data: paths,
                getPath: (d: any) => d.path,
                getColor: (d: any) => {
                    const hexValue = (typeof d.color === 'string' ? d.color : '#1e88e5').replace('#', '');
                    const r = parseInt(hexValue.substring(0, 2), 16) || 30;
                    const g = parseInt(hexValue.substring(2, 4), 16) || 136;
                    const b = parseInt(hexValue.substring(4, 6), 16) || 229;
                    return [r, g, b, 255];
                },
                getWidth: 3,
                widthUnits: 'pixels',
                capRounded: true,
                jointRounded: true,
                opacity: 0.8,
                parameters: { depthTest: true }
            })
        ];"""

new_pathlayer = """        return [
            new PathLayer({
                id: 'deck-cables-layer',
                data: paths,
                getPath: (d: any) => d.path,
                getColor: (d: any) => {
                    const hexValue = (typeof d.color === 'string' ? d.color : '#1e88e5').replace('#', '');
                    const r = parseInt(hexValue.substring(0, 2), 16) || 30;
                    const g = parseInt(hexValue.substring(2, 4), 16) || 136;
                    const b = parseInt(hexValue.substring(4, 6), 16) || 229;
                    return [r, g, b, 255];
                },
                getWidth: (d: any) => d.width || 3,
                widthUnits: 'pixels',
                capRounded: true,
                jointRounded: true,
                opacity: cableSettings.globalOpacity,
                parameters: { depthTest: true }
            })
        ];"""

if old_pathlayer in content:
    content = content.replace(old_pathlayer, new_pathlayer)

# 8. Update useMemo dependencies to include cableSettings
old_deps = """    }, [towersWithTerrain, projectSpans, show3D]);"""
new_deps = """    }, [towersWithTerrain, projectSpans, show3D, cableSettings]);"""

if old_deps in content:
    content = content.replace(old_deps, new_deps, 1) # Only first occurrence

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully integrated CableConfigModal into Mapbox3DLayer")
