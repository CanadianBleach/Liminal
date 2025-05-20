import * as THREE from 'three';

export const mysteryBoxSpawns = [
    {
        name: 'Courtyard',
        position: new THREE.Vector3(4, .5, 12.5),
        spawnChance: 0.3
    },
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
