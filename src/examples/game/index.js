import { TextureLoader, MeshStandardMaterial, PlaneGeometry, BoxGeometry, Group, PerspectiveCamera, Scene, Vector3, WebGLRenderer, DoubleSide, Vector2, RepeatWrapping, Mesh, AxesHelper, AmbientLight, DirectionalLight, Clock, SphereGeometry, Sphere, Raycaster, Ray, AnimationMixer, Quaternion, LoopOnce } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Octree } from 'three/examples/jsm/math/Octree'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import gsap from 'gsap'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js'
import Stats from 'three/examples/jsm/libs/stats.module.js'

// 全局变量
let scene, camera, renderer, controls
let playgroundOctree, brickWallsOctree
let stats, gui
const player = {}
const gamePlayground = new Group()
const brickWalls = new Group()
const bombs = new Group()
const npcs = new Group()
const gameProps = new Group()

const textures = []
let animationId = null

const UNIT_SIZE = 2
const unusedCoords = []
const keyStatus = {}
const POSITIVE_DIRECTIONS = [
  new Vector3(0, 0, -1),
  new Vector3(0, 0, 1),
  new Vector3(1, 0, 0),
  new Vector3(-1, 0, 0)
]

let relativeCameraOffset = new Vector3(0, 5, 7) // 相机跟随角色时的相对偏移位置
let cameraFollowDisabled = false
let explosionRange = 4 // 爆炸范围
let bombsCount = 2 // 炸弹数量
let animateDisabled = false

const clock = new Clock()
const textureLoader = new TextureLoader()
const gltfLoader = new GLTFLoader()

function initThree (container) {
  const width = window.innerWidth
  const height = window.innerHeight
  // 场景
  scene = new Scene()

  // 相机
  camera = new PerspectiveCamera(75, width / height, 0.1, 1000)
  camera.position.set(0, 30, 30)
  camera.lookAt(new Vector3())
  // camera.rotation.order = 'YXZ'

  // 光照
  scene.add(new AmbientLight(0xffffff, 0.6))
  const dLight = new DirectionalLight(0xffffff)
  dLight.position.set(10, 10, 10)
  scene.add(dLight)

  // 渲染器
  renderer = new WebGLRenderer({
    canvas: container,
    antialias: true
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)

  console.log('场景初始化完成')

  // 控制器
  // controls = new OrbitControls(camera, renderer.domElement)
  // controls.enableDamping = true
}

// 初始化游戏场地
function generateGamePlayground (xAxisSize, zAxisSize) {
  const width = xAxisSize * 2 + 2
  const height = zAxisSize * 2 + 2
  const geometry = new BoxGeometry(UNIT_SIZE, UNIT_SIZE, UNIT_SIZE)
  const planeGeometry = new PlaneGeometry(width * UNIT_SIZE, height * UNIT_SIZE)
  const stoneMat = new MeshStandardMaterial({
    map: (textures[0] = textureLoader.load('/game/textures/StoneMarbleCalacatta004/StoneMarbleCalacatta004_COL_1K.jpg')),
    normalMap: (textures[1] = textureLoader.load('/game/textures/StoneMarbleCalacatta004/StoneMarbleCalacatta004_NRM_1K.jpg')),
    roughness: 0.2
  })
  const floorMat = new MeshStandardMaterial({
    side: DoubleSide,
    map: (textures[2] = textureLoader.load('/game/textures/Tiles05/Tiles05_COL_VAR1_1K.jpg', t => {
      t.repeat = new Vector2(10, 10)
      t.wrapS = RepeatWrapping
      t.wrapT = RepeatWrapping
    }))
  })

  const stone = new Mesh(geometry, stoneMat)
  // brick = new THREE.InstancedMesh(geometry, fixedBlockMat, (width - 2) * (height - 1) / 4)
  const floor = new Mesh(planeGeometry, floorMat)

  // 添加地板
  floor.rotateX(-Math.PI / 2)
  floor.position.y = -UNIT_SIZE / 2 - 0.1 // -0.1 防止场景溢出地板
  gamePlayground.add(floor)

  // 添加场景布局
  // const matrix = new Matrix4()
  for (let i = 0; i <= width; i++) {
    for (let j = 0; j <= height; j++) {
      // 向左、向上平移一半，使整个场景位于坐标中心
      const x = (i - width / 2) * UNIT_SIZE
      const z = (j - height / 2) * UNIT_SIZE
      if (i === 0 || i === width || j === 0 || j === height) {
        const mesh = stone.clone()
        mesh.name = 'stone'
        mesh.position.set(x, 0, z)
        gamePlayground.add(mesh)
      } else if (i % 2 === 0 && j % 2 === 0) {
        const mesh = stone.clone()
        mesh.name = 'stone'
        mesh.position.set(x, 0, z)
        gamePlayground.add(mesh)
      } else if ((i === 0 && j === 0) || (i === 0 && j === 1) || (i === 1 && j === 0)) {
        // 角色出生位置, 及角色周边空闲格
        // 放在数组前三位，方便取
        unusedCoords.unshift(new Vector3(x, 0, z))
      } else {
        // 保存可使用的坐标，可以放置怪物和可炸毁的墙
        unusedCoords.push(new Vector3(x, 0, z))
      }
    }
  }
  scene.add(gamePlayground)
}

// 初始化砖块
function generateBricks (count) {
  const brickGemotry = new BoxGeometry(UNIT_SIZE, UNIT_SIZE, UNIT_SIZE)
  const brickMat = new MeshStandardMaterial({
    map: (textures[3] = textureLoader.load('/game/textures/BricksFlemishRed001/BricksFlemishRed001_COL_VAR1_1K.jpg')),
    bumpMap: (textures[4] = textureLoader.load('/game/textures/BricksFlemishRed001/BricksFlemishRed001_BUMP_1K.jpg')),
    normalMap: (textures[5] = textureLoader.load('/game/textures/BricksFlemishRed001/BricksFlemishRed001_NRM_1K.png'))
  })
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * unusedCoords.length)
    const position = unusedCoords.splice(randomIndex, 1)[0]
    const brick = new Mesh(brickGemotry, brickMat)
    brick.name = 'brick'
    brick.position.set(...position)
    brick.updateMatrixWorld()
    brickWalls.add(brick)
    brickWalls.name = 'wall_group'
  }
  scene.add(brickWalls)
}

function generateNPC (NPCConfig) {
  Object.entries(NPCConfig).forEach(([npcLevel, config]) => {
    for (let i = 0; i < config.count; i++) {
      const randomIndex = Math.floor(Math.random() * unusedCoords.length)
      const position = unusedCoords.splice(randomIndex, 1)[0]
      if (position) {
        const colorMap = {
          level_1: 0x0000ff,
          level_2: 0x000088,
          level_3: 0x000055
        }
        const mesh = new Mesh(
          new BoxGeometry(UNIT_SIZE, UNIT_SIZE, UNIT_SIZE),
          new MeshStandardMaterial({ color: colorMap[npcLevel] })
        )
        mesh.position.copy(position)
        mesh.name = npcLevel

        // 每个npc的属性信息用userData保存
        const userData = mesh.userData
        userData.velocity = config.velocity
        userData.detectionDistance = config.detectionDistance
        userData.direction = new Vector3(0, 0, 1)

        npcs.add(mesh)
      } else {
        console.log('无可用位置')
      }
    }
  })
  scene.add(npcs)
}

function generatePlayer (playerConfig) {
  const position = unusedCoords.splice(0, 3)[0]

  player.speed = playerConfig.speed
  player.velocity = new Vector3()
  player.direction = new Vector3()
  // 动画属性
  player.animateMixer = null
  player.animateActions = []
  player.animateIsWait = false

  player.mesh = new Mesh(
    new BoxGeometry(UNIT_SIZE * 0.8, UNIT_SIZE * 0.8, UNIT_SIZE * 0.8),
    new MeshStandardMaterial({ transparent: true, opacity: 0 })
  )

  player.mesh.name = 'player'
  player.mesh.position.copy(position)
  scene.add(player.mesh)
  gltfLoader.loadAsync('/game/models/player.glb').then(model => {
    model.scene.scale.set(1.5, 1.5, 1.5)
    model.scene.position.y = -UNIT_SIZE / 2
    player.mesh.add(model.scene)
    player.animateMixer = new AnimationMixer(model.scene)
    player.animateActions = (model.animations || []).map(animateClip => player.animateMixer.clipAction(animateClip))
  })
}

function generateGameProps (propsConfig) {
  scene.add(bombs)
  Object.entries(propsConfig).forEach(([propName, count]) => {
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * brickWalls.children.length)
      const position = brickWalls.children?.[randomIndex]?.position
      if (position) {
        // 配置道具颜色
        const colorMap = {
          explosionRange: 0xffff00,
          bombsCount: 0xff0000,
          speed_2: 0x000000
        }
        const mesh = new Mesh(
          new SphereGeometry(UNIT_SIZE / 4, 10),
          new MeshStandardMaterial({ color: colorMap[propName] })
        )
        mesh.position.copy(position)
        mesh.name = propName
        gameProps.add(mesh)
      } else {
        console.log('无可用位置')
      }
    }
  })
  scene.add(gameProps)
}

function initEventListener (container) {
  window.addEventListener('resize', handleResize)
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('keyup', handleKeyup)
}

function handleKeydown (e) {
  keyStatus[e.code] = true
}

function handleKeyup (e) {
  keyStatus[e.code] = false
}

function handleKeyControls () {
  const runAction = player.animateActions[0]
  if (!runAction) return
  if (runAction && player.animateIsWait) {
    runAction.stop()
    return
  }
  if (['KeyW', 'KeyS', 'KeyA', 'KeyD'].some(key => keyStatus[key])) {
    if (!runAction.isRunning()) {
      runAction.play()
    }
  } else {
    runAction.stop()
  }

  const speed = player.speed
  const obj = player.mesh.children[0]
  const q = new Quaternion()

  if (keyStatus['KeyW']) {
    player.velocity.copy(getForwardVector().multiplyScalar(speed))
    // 调整模型方向, lookAt不能用好烦，所以使用四元数，这种方式要知道模型的初始方向，这里是new Vector3(0, 0, 1)
    q.setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(0, 0, -1))
    obj.quaternion.copy(q)
  }
  if (keyStatus['KeyS']) {
    player.velocity.copy(getForwardVector().multiplyScalar(-speed))
    q.setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(0, 0, 1))
    obj.quaternion.copy(q)
  }
  if (keyStatus['KeyA']) {
    player.velocity.copy(getSideVector().multiplyScalar(-speed))
    q.setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(-1, 0, 0))
    obj.quaternion.copy(q)
  }
  if (keyStatus['KeyD']) {
    player.velocity.copy(getSideVector().multiplyScalar(speed))
    q.setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(1, 0, 0))
    obj.quaternion.copy(q)
  }
  if (keyStatus['KeyJ']) {
    // 放置炸弹
    placeBombs()
  }
}

let placeBombLoading = 0 // 防抖
function placeBombs () {
  if (placeBombLoading !== 0 || bombs.children.length >= bombsCount) return
  const position = getNearestCenterPosition()
  if (bombs.children.find(mesh => mesh.position.x === position.x && mesh.position.z === position.z)) {
    console.log('炸弹已存在')
    return
  }
  const bomb = new Mesh(
    new SphereGeometry(UNIT_SIZE / 2, 12),
    new MeshStandardMaterial({ color: 0x000000 })
  )
  bomb.position.copy(position)
  bomb.name = 'bomb'
  bomb.userData.countdown = 5 // 10秒后爆炸
  bomb.userData.crossBomb = true // 是否允许角色穿过
  bombs.add(bomb)
  placeBombLoading = 0.5

  // 添加动画
  // const placeBombAction = player.animateActions[2]
  // placeBombAction.reset()
  // placeBombAction.setLoop(LoopOnce)
  // placeBombAction.play()
  // player.animateIsWait = true
  // setTimeout(() => {
  //   player.animateIsWait = false
  // }, 600)
}

// 获取最近的格子中心位置
function getNearestCenterPosition () {
  const position = player.mesh.position.clone()
  Object.keys(position).forEach(key => {
    const val = position[key]
    const num = Math.floor(Math.abs(val / UNIT_SIZE)) * UNIT_SIZE
    const rest = Math.abs(val % UNIT_SIZE)
    const sign = val >= 0 ? 1 : -1
    position[key] = rest < (UNIT_SIZE - rest) ? num * sign : (num + UNIT_SIZE) * sign
  })
  return position
}

function getForwardVector () {
  // 把相机的方向设为角色的方向
  camera.getWorldDirection(player.direction)
  player.direction.y = 0
  player.direction.normalize()
  return player.direction.clone()
}

function getSideVector () {
  camera.getWorldDirection(player.direction)
  player.direction.y = 0
  player.direction.normalize()
  player.direction.cross(camera.up)

  return player.direction.clone()
}

function initOctree () {
  playgroundOctree = new Octree()
  playgroundOctree.fromGraphNode(gamePlayground)

  brickWallsOctree = new Octree()
  brickWallsOctree.fromGraphNode(brickWalls)
  console.log(gamePlayground, brickWalls)
}

function updatePlayer (deltaTime) {
  // 加缓冲，当不按方向键时，速度会递减到无限趋近于0
  const damping = Math.exp(-14 * deltaTime) - 1
  player.velocity.addScaledVector(player.velocity, damping)

  const deltaPosition = player.velocity.clone().multiplyScalar(deltaTime)
  player.mesh.position.add(deltaPosition)
  playerCollisions()
  cameraFollowPlayer()

  // 动画
  player.animateMixer && player.animateMixer.update(deltaTime)
}

// 处理角色碰撞，角色是玩家用键盘控制移动，对于碰撞检测，准确性性要求较高，所以用八叉树做碰撞检测
function playerCollisions () {
  // 创建一个包裹球，传递给八叉树进行碰撞检测
  const sphere = new Sphere(player.mesh.position.clone(), UNIT_SIZE / 2 * 0.8)
  // 八叉树碰撞检测，如果有交集，返回碰撞点法向量和交集深度
  // playground
  let result = playgroundOctree.sphereIntersect(sphere.clone())
  if (result && result.depth > 0) {
    player.mesh.position.add(result.normal.multiplyScalar(result.depth).multiply(new Vector3(1, 0, 1)))
  }
  // brickWalls
  result = brickWallsOctree.sphereIntersect(sphere.clone())
  if (result && result.depth > 0) {
    player.mesh.position.add(result.normal.multiplyScalar(result.depth).multiply(new Vector3(1, 0, 1)))
  }
}

function updateNPC (deltaTime) {
  npcs.children.forEach(npc => {
    const deltaPosition = npc.userData.direction.clone().multiplyScalar(npc.userData.velocity * deltaTime)
    npc.position.add(deltaPosition)
    npc.position.y = 0
    npcCollisions(npc)
  })
}

// 因为NPC是自动巡航，且需要探测四周，所以用射线做碰撞检测
function npcCollisions (npc) {
  POSITIVE_DIRECTIONS.forEach(dir => {
    const raycaster = new Raycaster(npc.position.clone(), dir.clone(), 0.1, UNIT_SIZE / 2 + npc.userData.detectionDistance)
    const intersects = raycaster.intersectObjects([player.mesh, bombs, brickWalls, gamePlayground])
    if (intersects.length) {
      if (intersects[0].object.name === 'player' && turnTest(npc)) {
        npc.userData.direction = intersects[0].face.normal.negate()
      }
      if (['player'].includes(intersects[0].object.name) && intersects[0].distance < UNIT_SIZE / 2) {
        handleGameOver()
      }
      if (['brick', 'stone'].includes(intersects[0].object.name) && intersects[0].distance < UNIT_SIZE / 2) {
        // 调整位置
        npc.position.add(intersects[0].face.normal.multiplyScalar(UNIT_SIZE / 2 - intersects[0].distance))
        // 改变方向
        const arr = POSITIVE_DIRECTIONS.filter(vector => !vector.equals(dir))
        const randomIdx = Math.floor(Math.random() * 3)
        const newDir = arr.find((_, idx) => idx === randomIdx)
        npc.userData.direction = newDir.clone()
        // 更新矩阵
        npc.updateMatrixWorld() // 注意更新矩阵，否则render时才会更新
      }
    }
  })
}

// 检测是否可以转向
function turnTest (object, offset = UNIT_SIZE * 0.05) {
  const { x, z } = object.position
  return (Math.abs(x) % UNIT_SIZE < offset || (UNIT_SIZE - Math.abs(x) % UNIT_SIZE) < offset) &&
         (Math.abs(z) % UNIT_SIZE < offset || (UNIT_SIZE - Math.abs(z) % UNIT_SIZE) < offset)
}

function handleGameOver () {
  const deadAction = player.animateActions[1]
  deadAction.setLoop(LoopOnce)
  deadAction.clampWhenFinished = true
  deadAction.play()
  player.animateIsWait = true
  setTimeout(() => {
    animateDisabled = true
  }, 2000)
}

function bombsCollision (deltaTime) {
  for (let i = bombs.children.length - 1; i >= 0; i--) {
    const mesh = bombs.children[i]
    // 倒计时完成时，移除炸弹
    mesh.userData.countdown -= deltaTime
    let timeIsUp = false
    if (mesh.userData.countdown <= 0) {
      timeIsUp = true
    }
    // 四个方向射线检测
    POSITIVE_DIRECTIONS.forEach(dir => {
      const raycaster = new Raycaster(mesh.position.clone(), dir.clone())
      const intersects = raycaster.intersectObjects([player.mesh, npcs, brickWalls, gamePlayground])
      if (intersects.length) {
        const intersect = intersects[0]
        // 爆炸时刻
        if (timeIsUp) {
          if (intersect.distance < UNIT_SIZE / 2 + explosionRange) {
            if (intersect.object.name === 'player') {
              handleGameOver()
            }
            if (intersect.object.name.includes('level')) {
              npcs.remove(intersect.object)
            }
            // 墙是不能炸穿滴
            if (intersect.object.name === 'brick') {
              brickWalls.remove(intersect.object)
              // 更新八叉树，否则不能通过
              if (brickWalls.children.length) {
                brickWallsOctree = new Octree()
                brickWallsOctree.fromGraphNode(brickWalls)
              }
            }
          }
          bombs.remove(mesh)
          return
        }
        // 碰撞
        if (intersect.distance < UNIT_SIZE / 2) {
          if (intersect.object.name.includes('level')) {
            intersect.object.userData.direction = dir.clone()
            // 抵消位移
            intersect.object.position.add(dir.clone().multiplyScalar(UNIT_SIZE / 2 - intersects[0].distance))
            intersect.object.updateMatrixWorld() // 注意更新矩阵，否则render时才会更新
          }
          if (intersect.object.name === 'player' && !mesh.userData.crossBomb) {
            intersect.object.position.add(dir.clone().multiplyScalar(UNIT_SIZE / 2 - intersects[0].distance))
            intersect.object.updateMatrixWorld() // 注意更新矩阵，否则render时才会更新
          }
        } else {
          // 检测到角色，说明角色已经离开炸弹区域，不允许再穿过炸弹
          if (intersect.object.name === 'player') {
            mesh.userData.crossBomb = false
          }
        }
      }
    })
  }
}

// 处理游戏道具的碰撞
function gamePropsCollision () {
  for (let i = gameProps.children.length - 1; i >= 0; i--) {
    const mesh = gameProps.children[i]
    // 四个方向射线检测
    POSITIVE_DIRECTIONS.forEach(dir => {
      const raycaster = new Raycaster(mesh.position.clone(), dir.clone())
      const intersects = raycaster.intersectObjects([player.mesh])
      if (intersects.length) {
        const intersect = intersects[0]
        // 碰撞
        if (intersect.distance < UNIT_SIZE / 4) {
          // 爆炸范围提升道具
          if (mesh.name.includes('explosionRange')) {
            const range = mesh.name.split('_')[1]
            explosionRange += Number(range)
          }
          // 增加炸弹数量
          if (mesh.name.includes('bombsCount')) {
            bombsCount++
          }
          // 提升角色移动速度
          if (mesh.name.includes('speed')) {
            const speed = mesh.name.split('_')[1]
            player.speed += Number(speed)
          }
          gameProps.remove(mesh)
        }
      }
    })
  }
}

// 相机跟随角色
function cameraFollowPlayer () {
  if (cameraFollowDisabled) return
  // 异步修改相机位置，否则按方向键过快，相机会抖动
  setTimeout(() => {
    const cameraOffset = relativeCameraOffset.clone().applyMatrix4(player.mesh.matrixWorld.clone())
    camera.position.copy(cameraOffset)
    camera.lookAt(player.mesh.position.clone())
    // controls.target.copy(player.mesh.position.clone())
  }, 0)
}

function handleResize () {
  const width = window.innerWidth
  const height = window.innerHeight
  renderer.setSize(width, height)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

/**
 * 平滑移动相机，主要借助四元数的球面差值方法
 * @param {Vector3} targetPostion 目标点相机位置
 * @param {Vector3} targetLookAt 目标点相机朝向
 * @param {Function} onComplete 运动结束回调
 */
function transitionMoveCamera (targetPostion, targetLookAt, onComplete) {
  // 构造到终点的旋转quaternion
  const copyCamera = camera.clone()
  copyCamera.position.copy(targetPostion)
  copyCamera.lookAt(targetLookAt)
  const targetQuaternion = copyCamera.quaternion
  gsap.to(camera.position, {
    ...targetPostion,
    duration: 2,
    ease: 'power2.out',
    onUpdate () {
      // 球面插值，必须要有结束旋转
      camera.quaternion.slerp(targetQuaternion, this.progress())
    },
    onComplete: typeof onComplete === 'function' ? onComplete : () => {}
  })
}

function initGUI (canvas) {
  gui = new GUI()
  const parameter = {
    animateIsRunning: false,
    GodView () {
      if (this.animateIsRunning) return
      this.animateIsRunning = true
      cameraFollowDisabled = true
      setTimeout(() => {
        transitionMoveCamera(new Vector3(0, 24, 0), new Vector3(), () => {
          this.animateIsRunning = false
        })
      }, 200)
    },
    GodView2 () {
      if (this.animateIsRunning) return
      this.animateIsRunning = true
      cameraFollowDisabled = true
      setTimeout(() => {
        const targetVector = player.mesh.position.clone()
        targetVector.y = 24
        transitionMoveCamera(targetVector, player.mesh.position.clone(), () => {
          relativeCameraOffset = new Vector3(0, 24, 0)
          cameraFollowDisabled = false
          this.animateIsRunning = false
        })
      }, 200)
    },
    thirdPersonView () {
      if (this.animateIsRunning) return
      this.animateIsRunning = true
      cameraFollowDisabled = true
      setTimeout(() => {
        relativeCameraOffset = new Vector3(0, 5, 7)
        const cameraOffset = relativeCameraOffset.clone().applyMatrix4(player.mesh.matrixWorld.clone())
        transitionMoveCamera(cameraOffset, player.mesh.position.clone(), () => {
          cameraFollowDisabled = false
          this.animateIsRunning = false
        })
      }, 200)
    },
    reStartGame () {

    }
  }
  const g = gui.addFolder('视角切换')
  g.add(parameter, 'GodView').name('上帝视角')
  g.add(parameter, 'GodView2').name('上帝视角(相机跟随)')
  g.add(parameter, 'thirdPersonView').name('第三人称视角')
  // const g2 = gui.addFolder('性能指标')
  // const control = {
  //   consoleTriangle () {
  //     console.log('Number of Triangles :', renderer.info.render)
  //   }
  // }
  // g2.add(control, 'consoleTriangle')
  const g3 = gui.addFolder('操作方式（只展示，点击无效）')
  const g3Parameter = {
    action1 () {},
    action2 () {},
    action3 () {},
    action4 () {},
    action5 () {}
  }
  g3.add(g3Parameter, 'action1').name('按键 W S A D 控制方向')
  g3.add(g3Parameter, 'action2').name('按键 J 放置炸弹')
  g3.add(g3Parameter, 'action3').name('道具 黄球：增加炸弹威力')
  g3.add(g3Parameter, 'action4').name('道具 红球：增加炸弹数量')
  g3.add(g3Parameter, 'action5').name('道具 黑球：增加角色移速')
}

function initHelperFn () {
  stats = new Stats()
  document.body.appendChild(stats.domElement)

  scene.add(new AxesHelper(100))
}

function render () {
  if (animateDisabled) return
  const deltaTime = Math.min(0.05, clock.getDelta())
  handleKeyControls()
  updatePlayer(deltaTime)
  updateNPC(deltaTime)
  bombsCollision(deltaTime)
  placeBombLoading = placeBombLoading > 0 ? placeBombLoading - deltaTime : 0
  gamePropsCollision()
  renderer.render(scene, camera)
  controls && controls.update()
  stats && stats.update()
}

function animate () {
  animationId = requestAnimationFrame(animate)
  render()
}

export function initGame (options = {}) {
  const {
    canvas,
    debug = false,
    xAxisSize = 20,
    zAxisSize = 6,
    bricksCount = 50,
    playerConfig = {
      speed: 6
    },
    NPCConfig = {
      level_1: {
        count: 4,
        velocity: 4,
        detectionDistance: 2 // 探测距离
      },
      level_2: {
        count: 2,
        velocity: 6,
        detectionDistance: 6 // 探测距离
      },
      level_3: {
        count: 1,
        velocity: 8,
        detectionDistance: 10 // 探测距离
      }
    },
    propsConfig = {
      explosionRange_2: 5,
      bombsCount: 5,
      speed_2: 2
    }
  } = options
  if (!canvas || canvas.tagName !== 'CANVAS') {
    return
  }
  initThree(canvas)
  initEventListener(canvas)
  generateGamePlayground(xAxisSize, zAxisSize)

  // 按顺序生成，角色，砖墙，NPC
  generatePlayer(playerConfig)
  generateBricks(bricksCount)
  generateNPC(NPCConfig)
  generateGameProps(propsConfig)

  // 处理碰撞
  initOctree()

  if (debug) {
    initHelperFn()
    initGUI(canvas)
  }
  animate()
}

export function dispose () {
  cancelAnimationFrame(animationId)
  // 释放图形资源
  ;[scene, gamePlayground, brickWalls, bombs, npcs, gameProps].forEach(group => {
    group.traverse(child => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) child.material.dispose()
    })
    group.children.length = 0
  })

  // 释放材质
  textures.forEach(t => {
    t && t.dispose()
  })
  textures.length = 0

  gui && gui.destroy()

  if (stats) {
    document.body.removeChild(stats.domElement)
  }
  animateDisabled = false

  // 释放渲染器资源
  renderer.dispose()

  // 删除引用
  scene = null
  camera = null
  renderer = null

  // 移除事件
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('keyup', handleKeyup)
}
