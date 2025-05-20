export const enemyTypes = {
    scary: {
        health: 100,
        speed: 1.5,
        damage: 10,
        pointValue: 50,
        size: 1,
        texture: '/textures/scary.png',
        tier: 1,
        onDeathEffect: 'blood_splatter'
    },
    nugget: {
        health: 100,
        speed: 1.5,
        damage: 10,
        pointValue: 50,
        size: 1,
        texture: '/textures/shadow.png', // ✅ your new image
        tier: 1,
        onDeathEffect: 'blood_splatter'
    },
    custom: {
        health: 100,
        speed: 1.5,
        damage: 10,
        pointValue: 75,
        size: 1,
        texture: null, // placeholder, we’ll override it dynamically
        tier: 1,
        onDeathEffect: 'blood_splatter'
    },
    semi: {
        health: 10,
        speed: 8,
        damage: 10,
        pointValue: 50,
        size: 3,
        texture: '/textures/semi.png', // ✅ your new image
        tier: 1,
        onDeathEffect: 'blood_splatter'
    }
}