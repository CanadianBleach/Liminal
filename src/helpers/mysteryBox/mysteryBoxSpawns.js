import * as THREE from 'three';

export const mysteryBoxSpawns = [
    {
        name: 'Courtyard',
        position: new THREE.Vector3(2, 1, 0),
        spawnChance: 0.3
    },
    {
        name: 'Warehouse',
        position: new THREE.Vector3(-5, 1, 3),
        spawnChance: 0.25
    },
    {
        name: 'Rooftop',
        position: new THREE.Vector3(10, 1, -7),
        spawnChance: 0.2
    },
    {
        name: 'Basement',
        position: new THREE.Vector3(-12, 1, 4),
        spawnChance: 0.25
    }
];

export function selectBoxSpawnByChance() {
    const total = mysteryBoxSpawns.reduce((sum, s) => sum + s.spawnChance, 0);
    const rand = Math.random() * total;
    let acc = 0;

    for (const spawn of mysteryBoxSpawns) {
        acc += spawn.spawnChance;
        if (rand <= acc) return spawn;
    }

    return mysteryBoxSpawns[0]; // fallback
}
