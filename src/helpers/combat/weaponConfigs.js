// weaponConfigs.js
export const weaponConfigs = {
    rifle: {
        name: 'rifle',
        model: '/models/ak.glb',
        texture: '/textures/muzzle1.png',
        fireRate: 0.15,
        damage: 10,
        recoil: 0.07,
        automatic: true,
        modelScale: [0.05, 0.05, 0.05],
        modelOffset: [.5, -.3, -1],
        muzzleFlashSize: [5, 5],
    },
    awp: {
        name: 'Awp',
        model: '/models/awp.glb',
        texture: '/textures/muzzle1.png',
        fireRate: .10,
        damage: 5,
        recoil: 0.07,
        automatic: false,
        modelScale: [.05, .05, .05],
        modelOffset: [.5, -.3, -1],
        muzzleFlashSize: [5, 5],
    },
    /*     knife: {
            name: 'Knife',
            model: '/models/knife.glb',
            fireRate: 0.8,
            damage: 50,
            melee: true,
            range: 2.0,
            modelScale: [0.01, 0.01, 0.01]
        } */
};
