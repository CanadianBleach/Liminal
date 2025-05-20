// weaponConfigs.js
export const weaponConfigs = {
    rifle: {
        name: 'Galil',
        model: '/models/ak.glb',
        texture: '/textures/muzzle1.png',
        fireRate: 0.09,
        damage: 22,
        recoil: 0.04,
        modelScale: [0.05, 0.05, 0.05],
        modelOffset: [0.5, -0.2, -.7],
        flashSize: [5, 5],
        fireMode: 'auto',
        ammoCapacity: 1000,
        clipSize: 100,
        reloadTime: 2.4
    },
    awp: {
        name: 'AWP',
        model: '/models/awp.glb',
        texture: '/textures/muzzle1.png',
        mysteryBoxEligible: true,
        fireRate: 1.5,
        damage: 95,
        recoil: 0.15,
        fireMode: 'semi',
        modelScale: [0.05, 0.05, 0.05],
        modelOffset: [0.5, -0.3, -1],
        flashSize: [5, 5],
        ammoCapacity: 30,
        clipSize: 5,
        reloadTime: 3.2,
        canADS: true,
        adsOffset: [0, -0.15, -0.3],
        adsFOV: 45
    },
    m1911: {
        name: 'M1911',
        model: '/models/awp.glb',
        texture: '/textures/muzzle1.png',
        mysteryBoxEligible: true,
        fireRate: 1.5,
        damage: 95,
        recoil: 0.15,
        fireMode: 'semi',
        modelScale: [0.05, 0.05, 0.05],
        modelOffset: [0.5, -0.3, -1],
        flashSize: [5, 5],
        ammoCapacity: 30,
        clipSize: 5,
        reloadTime: 3.2,
        canADS: true,
        adsOffset: [0, -0.15, -0.3],
        adsFOV: 45
    },
    knife: {
    }
};
