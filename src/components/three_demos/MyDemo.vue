<script setup>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import gsap from 'gsap'
import { onMounted, ref } from 'vue'
import { Vector3 } from 'three'
const container = ref()
let scene, renderer, camera
let controls, keyboardState
let stats
const textureLoader = new THREE.TextureLoader()

const isVR = false
// 声明游戏场景常量
const UNIT_SIZE = 2
const X_SIZE = 8 // x轴上固定石块数量
const Z_SIZE = 5 // z轴上固定石块数量
const WALL_SIZE = 20 // 墙体的数量
const HERO_SPEED = 4
let MONSTER_SPEED = 2
const relativeCameraOffset = new Vector3(0, 5, 5)

// 声明游戏变量
const availableCoords = [] // 可使用的坐标
let hero, boundary, fixedBlock
const monsterGroup = new THREE.Group()
const wallGroup = new THREE.Group()
const bombGroup = new THREE.Group()
const clock = new THREE.Clock()
// 方向 false：方向键未按下 true：方向键按下
const directionState = new Map([
  ['forward', false],
  ['back', false],
  ['left', false],
  ['right', false]
])

// 怪物配置
const monsterConfig = {
  level_1: {
    speed: 1,
    visionDistance: 4 // 直线视野距离

  }
}

onMounted(() => {
  init()
  animate()
})
function init () {
  // 场景
  scene = new THREE.Scene()

  // 相机
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000)
  camera.position.set(0, 30, 20)
  camera.lookAt(0, 0, 0)

  // - 光
  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  const plight = new THREE.PointLight(0xffffff, 0.8)
  plight.position.set(100, 100, 100)
  scene.add(plight)

  // - add object
  addObject()

  // 渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  container.value.appendChild(renderer.domElement)

  // - control
  controls = new OrbitControls(camera, renderer.domElement)
  // controls.enableDamping = true
  // - eventListener
  handleEventListener()

  // pointerdown
  // window.addEventListener('pointerdown', onClick)

  // - help
  scene.add(new THREE.AxesHelper(X_SIZE * UNIT_SIZE))
  // states
  stats = new Stats()
  container.value.appendChild(stats.dom)
}

function addObject () {
  // 创建游戏场景
  generateGameScene(X_SIZE, Z_SIZE)
  // 创建主角
  generateHero()
  // 生成随机墙体
  generateRandomWall()
  // 生成怪物
  generateMonster(5)
  // 增加炸弹容器
  scene.add(bombGroup)
}

/**
 * 创建游戏场景
 * @param {Number} xSize
 * @param {Number} zSize
 */
function generateGameScene (xSize, zSize) {
  const width = xSize * 2 + 2
  const height = zSize * 2 + 2
  const geometry = new THREE.BoxGeometry(UNIT_SIZE, UNIT_SIZE, UNIT_SIZE)
  const planeGeometry = new THREE.PlaneGeometry(width * UNIT_SIZE, height * UNIT_SIZE)

  const boundaryMat = new THREE.MeshStandardMaterial({
    map: textureLoader.load('/public/game/textures/StoneMarbleCalacatta004/StoneMarbleCalacatta004_COL_1K.jpg'),
    normalMap: textureLoader.load('/public/game/textures/StoneMarbleCalacatta004/StoneMarbleCalacatta004_NRM_1K.jpg'),
    roughness: 0.2
  })
  const fixedBlockMat = new THREE.MeshStandardMaterial({
    map: textureLoader.load('/public/game/textures/StoneMarbleCalacatta004/StoneMarbleCalacatta004_COL_1K.jpg'),
    normalMap: textureLoader.load('/public/game/textures/StoneMarbleCalacatta004/StoneMarbleCalacatta004_NRM_1K.jpg'),
    roughness: 0.2
  })
  const floorMat = new THREE.MeshStandardMaterial({
    side: THREE.DoubleSide,
    map: textureLoader.load('/public/game/textures/Tiles05/Tiles05_COL_VAR1_1K.jpg', t => {
      t.repeat = new THREE.Vector2(10, 10)
      t.wrapS = THREE.RepeatWrapping
      t.wrapT = THREE.RepeatWrapping
    })
  })

  boundary = new THREE.InstancedMesh(geometry, boundaryMat, (width + height) * 2)
  fixedBlock = new THREE.InstancedMesh(geometry, fixedBlockMat, (width - 2) * (height - 1) / 4)
  const floor = new THREE.Mesh(planeGeometry, floorMat)

  // 添加地板
  floor.rotateX(-Math.PI / 2)
  floor.position.y = -UNIT_SIZE / 2 - 0.1 // -0.1 防止场景溢出地板
  scene.add(floor)

  // 添加场景布局
  const matrix = new THREE.Matrix4()
  let boundaryId = 0
  let fixedBlockId = 0
  for (let i = 0; i <= width; i++) {
    for (let j = 0; j <= height; j++) {
      // 向左、向上平移一半，使整个场景位于坐标中心
      const x = (i - width / 2) * UNIT_SIZE
      const z = (j - height / 2) * UNIT_SIZE
      if (i === 0 || i === width || j === 0 || j === height) {
        matrix.setPosition(x, 0, z)
        boundary.setMatrixAt(boundaryId, matrix)
        boundaryId++
      } else if (i % 2 === 0 && j % 2 === 0) {
        matrix.setPosition(x, 0, z)
        fixedBlock.setMatrixAt(fixedBlockId, matrix)
        fixedBlockId++
      } else {
        // 保存可使用的坐标，可以放置主角、怪物和可炸毁的墙
        availableCoords.push(new THREE.Vector3(x, 0, z))
      }
    }
  }
  scene.add(boundary, fixedBlock)
}

/**
 * 创建角色
 */
function generateHero () {
  const position = availableCoords.pop()
  const mats = [
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6 }),
    new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.6 }),
    new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.6 }),
    new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.6 }),
    new THREE.MeshBasicMaterial({ color: 0x9af399, transparent: true, opacity: 0.6 })
  ]

  hero = new THREE.Mesh(
    new THREE.BoxGeometry(UNIT_SIZE * 0.6, UNIT_SIZE * 0.6, UNIT_SIZE * 0.6, 3, 3, 3),
    mats
  )

  hero.name = 'hero'
  hero.position.set(...position)
  console.log(hero)
  scene.add(hero)
  // 添加gui
  addGui()
}

/**
 * 创建随机墙体
 */
function generateRandomWall () {
  const wallGemotry = new THREE.BoxGeometry(UNIT_SIZE, UNIT_SIZE, UNIT_SIZE)
  const wallMat = new THREE.MeshStandardMaterial({
    map: textureLoader.load('/public/game/textures/BricksFlemishRed001/BricksFlemishRed001_COL_VAR1_1K.jpg'),
    bumpMap: textureLoader.load('/public/game/textures/BricksFlemishRed001/BricksFlemishRed001_BUMP_1K.jpg'),
    normalMap: textureLoader.load('/public/game/textures/BricksFlemishRed001/BricksFlemishRed001_NRM_1K.png')
  })
  for (let i = 0; i < WALL_SIZE; i++) {
    const randomIndex = Math.floor(Math.random() * availableCoords.length)
    const position = availableCoords.splice(randomIndex, 1)[0]
    const wall = new THREE.Mesh(wallGemotry, wallMat)
    wall.name = 'wall'
    wall.position.set(...position)
    wallGroup.add(wall)
    wallGroup.name = 'wall_group'
  }
  scene.add(wallGroup)
}
/**
 * 生成怪物
 */
function generateMonster (count) {
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * availableCoords.length)
    const position = availableCoords.splice(randomIndex, 1)[0]
    if (position) {
      const monster = new THREE.Mesh(
        new THREE.BoxGeometry(UNIT_SIZE * 0.9, UNIT_SIZE * 0.9, UNIT_SIZE * 0.9, 2, 2, 2), // 分段数为1的话，平面上没有顶点，不好做碰撞检测
        new THREE.MeshBasicMaterial({ color: 0x0000ff })
      )
      monster.position.set(...position)
      monster.name = 'monster'
      monsterGroup.add(monster)
    } else {
      console.log('无可用位置')
    }
  }
  scene.add(monsterGroup)
}
/**
 *
 * @param {Vector3} vector 方向向量
 * @param {Boolean} formatToWord 是否将方向转成单词比如，Vector3(0, 0, -1) 转成 forward
 */
function formatDirection (vector, formatToWord) {
  let direction
  if (!formatToWord) {
    if (Math.abs(vector.x) > Math.abs(vector.z)) {
      direction = new Vector3(vector.x > 0 ? 1 : -1, 0, 0)
    } else {
      direction = new Vector3(0, 0, vector.z > 0 ? 1 : -1)
    }
  } else {
    if (Math.abs(vector.x) > Math.abs(vector.z)) {
      direction = vector.x > 0 ? 'right' : 'left'
    } else {
      direction = vector.z > 0 ? 'back' : 'forward'
    }
  }
  return direction
}

/**
 * 判断在这个坐标是否可以转向
 * @param {Object3D} object
 * @param {Number} offset 偏差范围，偏差太大会撞墙
 */
function turnTest (object, offset = UNIT_SIZE * 0.05) {
  const { x, z } = object.position.clone()
  return (Math.abs(x) % UNIT_SIZE < offset || (UNIT_SIZE - Math.abs(x) % UNIT_SIZE) < offset) &&
         (Math.abs(z) % UNIT_SIZE < offset || (UNIT_SIZE - Math.abs(z) % UNIT_SIZE) < offset)
}

/**
 * 获取对象当前行进方向
 * @param {Object3D} object
 */
function getCurrentDirection (object) {
  // z轴负方向是脸的方向
  return new Vector3(0, 0, -1).applyQuaternion(object.quaternion)
}

/**
 * 改变对象方向
 * @param {Object3D} object
 * @param {Vector3} targetDir 目标方向，没有的话，设置随机方向
 * @param {String} excludeDir 设置随机方向时，需要排除的方向
 */
function changeDirection (object, targetDir, excludeDir) {
  if (targetDir) {
    const dir = formatDirection(targetDir, true)
    object.userData.direction = dir
  } else {
    // 随机改变方向
    const dirArr = ['forward', 'back', 'left', 'right'].filter(v => v !== excludeDir)
    const dir = dirArr[Math.floor(Math.random() * dirArr.length)]
    object.userData.direction = dir
  }
}

// 处理怪物碰撞逻辑
function handleMonsterMove (speed) {
  monsterGroup.children.forEach(monster => {
    addObjectAutoMove(monster, speed)
  })
}
/**
 *
 * @param {Object3D} object 要创建碰撞检测的目标对象
 * @param {Array} intersectObjects 碰撞检测的物体，
 * @param {Function} callback 碰撞条件成立后的回调
 * @param {Function} intersectObjectsCallback 检测到物体回调
 * @param {Boolean} onlyXZRaycaster 只发射平行x轴和z轴方向的射线
 */
function createCollisionDetection (object, intersectObjects, callback, intersectObjectsCallback, onlyXZRaycaster) {
  // 更新矩阵，否则下边拿到的是不对，因为矩阵在渲染时才更新
  object.updateMatrix()
  object.updateMatrixWorld()

  const objCenter = object.position.clone()
  const vertices = object.geometry.attributes.position
  // 后续优化射线数量
  for (let i = 0; i < vertices.count; i++) {
    const vertex = new Vector3(vertices.getX(i), vertices.getY(i), vertices.getZ(i))
    const vertexWorldCoord = vertex.applyMatrix4(object.matrixWorld.clone())
    const dir = vertexWorldCoord.sub(objCenter)
    if (onlyXZRaycaster && (Math.abs(dir.y) !== 0 || Math.abs(dir.x) === Math.abs(dir.z))) {
      continue
    }
    // 声明射线
    const direction = dir.clone().normalize()
    const raycaster = new THREE.Raycaster(objCenter, direction)
    const intersects = raycaster.intersectObjects(intersectObjects)
    if (intersects.length) {
      intersectObjectsCallback && intersectObjectsCallback(direction.clone(), intersects)
      if (intersects[0].distance <= dir.length()) {
        callback(direction.clone(), intersects[0]) // 传递参数，碰撞方向和碰撞物体
      }
    }
  }
}

/**
 * 相机跟随物体角色
 */
function cameraFollow () {
  const offset = relativeCameraOffset.clone()
  const cameraOffset = offset.applyMatrix4(hero.matrixWorld.clone())

  camera.position.set(...cameraOffset)
  // 让相机始终看向角色，控制器控制了相机，所以修改控制器的target属性，否则调用相机的lookAt方法
  controls.target = hero.position.clone()
}

function handleEventListener () {
  const keyDirectionMap = new Map([
    ['w', 'forward'],
    ['s', 'back'],
    ['a', 'left'],
    ['d', 'right']
  ])
  window.addEventListener('keydown', e => {
    if (keyDirectionMap.has(e.key)) {
      directionState.set(keyDirectionMap.get(e.key), true)
    }
    if (e.key === 'j') {
      placeBombs()
    }
  })
  window.addEventListener('keyup', e => {
    if (keyDirectionMap.has(e.key)) {
      directionState.set(keyDirectionMap.get(e.key), false)
    }
  })
  window.addEventListener('resize', handleResize)
}
// 放置炸弹
function placeBombs () {
  const place = getNearestCenterPosition()
  if (bombGroup.children.find(obj => obj.position.x === place.x && obj.position.z === place.z)) {
    console.log('炸弹已存在')
    return
  }
  const bomb = new THREE.Mesh(
    new THREE.BoxGeometry(UNIT_SIZE, UNIT_SIZE, UNIT_SIZE, 2, 2, 2),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  )
  bomb.position.set(...place)
  bomb.name = 'bomb'
  bomb.userData.countdown = 5 // 10秒后爆炸
  bombGroup.add(bomb)
}

function handleBombExplodes (delta) {
  bombGroup.children.forEach(bomb => {
    if (bomb.userData.countdown < 0) {
      bomb.scale.set(1.2, 1.2, 1.2)
      setTimeout(() => {
        bombGroup.remove(bomb)
      }, 1000)
      createCollisionDetection(
        bomb,
        [hero, monsterGroup, wallGroup, fixedBlock],
        () => {},
        (dir, intersects) => {
          if (intersects[0].distance < 5) {
            const obj = intersects[0].object
            if (obj.name === 'monster') {
              monsterGroup.remove(obj)
            } else if (obj.name === 'wall') {
              wallGroup.remove(obj)
            } else if (obj.name === 'hero') {
              console.log('game over')
            }
          }
        },
        true
      )
    } else {
      bomb.userData.countdown -= delta
    }
  })
}

function getNearestCenterPosition () {
  const { x, z } = hero.position.clone()
  // console.log(x % UNIT_SIZE, z % UNIT_SIZE)
  let _x, _z
  if (x >= 0) {
    _x = x % UNIT_SIZE < (UNIT_SIZE - x % UNIT_SIZE) ? x - x % UNIT_SIZE : x + (UNIT_SIZE - x % UNIT_SIZE)
  } else {
    _x = Math.abs(x % UNIT_SIZE) < (UNIT_SIZE - Math.abs(x % UNIT_SIZE)) ? x + Math.abs(x % UNIT_SIZE) : x - (UNIT_SIZE - Math.abs(x % UNIT_SIZE))
  }

  if (z >= 0) {
    _z = z % UNIT_SIZE < (UNIT_SIZE - z % UNIT_SIZE) ? z - z % UNIT_SIZE : z + (UNIT_SIZE - z % UNIT_SIZE)
  } else {
    _z = Math.abs(z % UNIT_SIZE) < (UNIT_SIZE - Math.abs(z % UNIT_SIZE)) ? z + Math.abs(z % UNIT_SIZE) : z - (UNIT_SIZE - Math.abs(z % UNIT_SIZE))
  }
  return new Vector3(_x, 0, _z)
}

// 控制物体移动
function addObjectControl (object, speed = 1) {
  // 给object创建一个管理方向锁的自定义状态
  const lockState = object.userData.lockState
  if (!lockState) {
    object.userData.lockState = new Map([
      ['forward', false],
      ['back', false],
      ['left', false],
      ['right', false]
    ])
    return
  }
  const rotateAngle = speed * Math.PI / 4
  const handleObjChange = (callback) => {
    object.userData.oldPosition = object.position.clone()
    callback()
    // 碰撞检测之前把lockState重置
    for (const [dir] of lockState) {
      object.userData.lockState.set(dir, false)
    }
    createCollisionDetection(object, [wallGroup, boundary, fixedBlock, bombGroup], (dir) => {
      const _dir = formatDirection(dir, true)
      if (directionState.get(_dir)) {
        object.userData.lockState.set(_dir, true)
        object.position.set(...object.userData.oldPosition)
      }
    })
  }

  if (directionState.get('forward') && !lockState.get('forward')) {
    handleObjChange(() => {
      object.translateZ(-speed)
    })
  }
  if (directionState.get('back') && !lockState.get('back')) {
    handleObjChange(() => {
      object.translateZ(speed)
    })
  }
  if (directionState.get('left') && !lockState.get('left')) {
    handleObjChange(() => {
      object.translateX(-speed)
    })
  }
  if (directionState.get('right') && !lockState.get('right')) {
    handleObjChange(() => {
      object.translateX(speed)
    })
  }
}

// 控制物体自由移动
function addObjectAutoMove (object, speed = 1) {
  // 给object创建一个管理方向锁的自定义状态
  const lockState = object.userData.lockState
  if (!lockState) {
    object.userData.lockState = new Map([
      ['forward', false],
      ['back', false],
      ['left', false],
      ['right', false]
    ])
    object.userData.direction = 'forward' // 自由移动物体一次只能移动一个方向
    return
  }
  const handleObjChange = (callback) => {
    object.userData.oldPosition = object.position.clone()
    callback()
    // 碰撞检测之前把lockState重置
    for (const [dir] of lockState) {
      object.userData.lockState.set(dir, false)
    }
    createCollisionDetection(
      object,
      [wallGroup, boundary, fixedBlock, bombGroup, hero],
      (dir, intersect) => {
        const _dir = formatDirection(dir, true)
        if (object.userData.direction === _dir && intersect.object.name !== 'hero') {
          object.userData.lockState.set(_dir, true)
          object.position.set(...object.userData.oldPosition)
          changeDirection(object, null, object.userData.direction)
        }
      },
      (dir, intersects) => { // 检测到物体时的回调
        if (intersects[0].object.name === 'hero') {
          // 只有在格子的中心附近才可以转向
          if (turnTest(object)) {
            changeDirection(object, dir)
          }
        } else { // 游荡的状态（在这个场景内一直会检测到物体）

        }
      },
      true
    )
  }

  if (object.userData.direction === 'forward' && !lockState.get('forward')) {
    handleObjChange(() => {
      object.translateZ(-speed)
    })
  }
  if (object.userData.direction === 'back' && !lockState.get('back')) {
    handleObjChange(() => {
      object.translateZ(speed)
    })
  }
  if (object.userData.direction === 'left' && !lockState.get('left')) {
    handleObjChange(() => {
      object.translateX(-speed)
    })
  }
  if (object.userData.direction === 'right' && !lockState.get('right')) {
    handleObjChange(() => {
      object.translateX(speed)
    })
  }
}

function handleResize () {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

function addGui () {
  const gui = new GUI()
  const control = {
    stopMove () {
      MONSTER_SPEED = 0
    },
    startMove () {
      MONSTER_SPEED = 3
    },
    resetHero () {
      hero.position.set(0, 0, 0)
    },
    getPosition () {
      console.log(hero.position)
      console.log(getNearestCenterPosition())
    },
    setFirstPerson () {
      relativeCameraOffset.set(0, 0, 0)
      camera.updateProjectionMatrix()
    },
    setThirdPerson () {
      relativeCameraOffset.set(0, 6, 6)
      camera.updateProjectionMatrix()
    },
    setTopView () {
      relativeCameraOffset.set(0, 20, 0)
      camera.updateProjectionMatrix()
    }
  }
  gui.add(control, 'stopMove').name('怪物暂停移动')
  gui.add(control, 'startMove').name('怪物开始移动')
  gui.add(control, 'resetHero').name('hero归零')
  gui.add(control, 'getPosition').name('getPosition')
  gui.add(control, 'setFirstPerson').name('第一人称')
  gui.add(control, 'setThirdPerson').name('第三人称')
  gui.add(control, 'setTopView').name('上帝视角')
  const cameraPos = gui.addFolder('相对相机偏移坐标')
  cameraPos.add(relativeCameraOffset, 'x', 0, 10, 1)
  cameraPos.add(relativeCameraOffset, 'y', 0, 50, 1)
  cameraPos.add(relativeCameraOffset, 'z', 0, 10, 1)
}

function animate () {
  requestAnimationFrame(animate)
  render()
}
function render () {
  const delta = clock.getDelta()
  renderer.render(scene, camera)
  addObjectControl(hero, delta * HERO_SPEED)
  handleMonsterMove(delta * MONSTER_SPEED)
  handleBombExplodes(delta)
  // cameraFollow()
  controls.update()
  stats.update()
}

</script>

<template>
  <div ref="container" class="container"></div>
</template>

<style>
  .container {
    overflow: hidden;
  }
  .label-text {
    color: #fff;
    background-color: #000;
    opacity: 0.8;
    padding: 2px 5px;
    border-radius: 4px;
  }
</style>
