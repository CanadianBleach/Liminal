export const enemyTypes = {
    scary: {
        health: 100,
        speed: 1.5,
        damage: 10,
        pointValue: 20,
        size: 1,
        texture: '/textures/scary.png',
        tier: 1,
        onDeathEffect: 'blood_splatter',
        soundFile: '/sounds/growl.ogg',
        loopSound: false,
        soundInterval: 3
    },
    nugget: {
        health: 100,
        speed: 1.5,
        damage: 10,
        pointValue: 20,
        size: 1,
        texture: '/textures/shadow.png', // ✅ your new image
        tier: 1,
        onDeathEffect: 'blood_splatter',
        soundFile: '/sounds/growl.ogg',
        loopSound: false,
        soundInterval: 3
    },
    custom: {
        health: 100,
        speed: 1.5,
        damage: 10,
        pointValue: 25,
        size: 1,
        texture: null, // placeholder, we’ll override it dynamically
        tier: 1,
        onDeathEffect: 'blood_splatter',
        soundFile: '/sounds/growl.ogg',
        loopSound: false,
        soundInterval: 3
    },
    semi: {
        health: 10,
        speed: 8,
        damage: 10,
        pointValue: 20,
        size: 3,
        texture: '/textures/semi.png', // ✅ your new image
        tier: 1,
        onDeathEffect: 'blood_splatter',
        soundFile: '/sounds/Goofy ahh car honk sound effect 4.mp3',
        loopSound: false,
        soundInterval: 1
    },
    skibidi: {
        health: 10,
        speed: 1,
        damage: 10,
        pointValue: 20,
        size: 1,
        texture: '/textures/skibidi.png', // ✅ your new image
        tier: 1,
        onDeathEffect: 'blood_splatter',
        soundFile: '/sounds/growl.ogg',
        loopSound: false,
        soundInterval: 3
    }
}