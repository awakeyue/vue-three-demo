<script setup>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js'
import gsap from 'gsap'
import { onMounted, ref } from 'vue'
import { Vector3 } from 'three'
const container = ref()
let scene, camera, renderer
let controls, keyboardState

const isVR = false
// 声明游戏场景常量
const UNIT_SIZE = 2
const X_SIZE = 10 // x轴上固定石块数量
const Z_SIZE = 10 // z轴上固定石块数量
const WALL_SIZE = 20 // 墙体的数量
const HERO_SPEED = 5

// 声明游戏变量
const availableCoords = [] // 可使用的坐标
let hero, boundary, fixedBlock
const monsterGroup = new THREE.Group()
const wallGroup = new THREE.Group()
const clock = new THREE.Clock()

onMounted(() => {
  init()
  animate()
})
function init () {
  // 场景
  scene = new THREE.Scene()

  // 相机
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000)
  camera.position.set(5, 20, 0)
  camera.lookAt(0, 0, 0)

  // - 光
  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  // const plight = new THREE.PointLight(0xffffff, 0.8)
  // plight.position.set(100, 100, 100)
  // scene.add(plight)

  // - add object
  addObject()

  // 渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  container.value.appendChild(renderer.domElement)

  // - control
  controls = new OrbitControls(camera, renderer.domElement)
  // controls.enableDamping = true
  // - resize
  window.addEventListener('resize', handleResize)

  // pointerdown
  // window.addEventListener('pointerdown', onClick)

  // - help
  scene.add(new THREE.AxesHelper(X_SIZE * UNIT_SIZE))
}

function addObject () {
  // 创建游戏场景
  generateGameScene(X_SIZE, Z_SIZE)
  // 创建主角
  generateHero()
  // 生成随机墙体
  generateRandomWall()
  // // 生成怪物
  // generateMonster()
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

  const boundaryMat = new THREE.MeshBasicMaterial({ color: 0x666666 })
  const fixedBlockMat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa })
  const floorMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide })

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
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    new THREE.MeshBasicMaterial({ color: 0x000000 }),
    new THREE.MeshBasicMaterial({ color: 0xff0000 }),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
    new THREE.MeshBasicMaterial({ color: 0x0000ff }),
    new THREE.MeshBasicMaterial({ color: 0x9af399 })
  ]
  hero = new THREE.Mesh(
    new THREE.BoxGeometry(UNIT_SIZE * 0.8, UNIT_SIZE * 0.8, UNIT_SIZE * 0.8, 2, 2, 2),
    mats
  )
  hero.position.set(...position)
  hero.name = 'hero'
  scene.add(hero)

  // 添加控制
  initControls()
}

/**
 * 创建随机墙体
 */
function generateRandomWall () {
  const wallGemotry = new THREE.BoxGeometry(UNIT_SIZE, UNIT_SIZE, UNIT_SIZE)
  const wallMat = new THREE.MeshBasicMaterial({ color: 0xd3312c })
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
function generateMonster () {

}

function initControls () {
  if (isVR) {
    //
  } else {
    keyboardState = createKeyboardControl()
  }
}

/**
 * 返回w,s,a,d键盘状态，Map类型
 */
function createKeyboardControl () {
  const state = new Map([
    ['w', false],
    ['s', false],
    ['a', false],
    ['d', false]
  ])
  window.addEventListener('keydown', e => {
    if (state.has(e.key)) {
      state.set(e.key, true)
    }
  })
  window.addEventListener('keyup', e => {
    if (state.has(e.key)) {
      state.set(e.key, false)
    }
  })
  return state
}

// 控制角色移动
function controlHeroMove (delta) {
  let keydownBtn
  for (const data of keyboardState) {
    if (data[1] === true) {
      keydownBtn = data[0]
      break
    }
  }
  const v = delta * HERO_SPEED
  const handleChange = (callback) => {
    // 移动之前先保存旧位置
    hero.userData.oldPosition = hero.position.clone()
    callback()
    // 更新矩阵，以便处理碰撞时可以获取到最新的顶点坐标
    hero.updateMatrix()
    hero.updateMatrixWorld()
    handleRaycaster()
  }
  // 修改之前保存老的位置
  switch (keydownBtn) {
    case 'w':
      handleChange(() => { hero.translateX(-v) })
      break
    case 's':
      handleChange(() => { hero.translateX(v) })
      break
    case 'a':
      handleChange(() => { hero.translateZ(v) })
      break
    case 'd':
      handleChange(() => { hero.translateZ(-v) })
      break
  }
}

function handleResize () {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}
function handleRaycaster () {
  const center = hero.position.clone()
  const geometryVertices = hero.geometry.attributes.position
  for (let i = 0; i < geometryVertices.count; i++) {
    // 将顶点转成世界坐标
    const vertex = new Vector3(geometryVertices.getX(i), geometryVertices.getY(i), geometryVertices.getZ(i))
    const vertextWorldCoord = vertex.clone().applyMatrix4(hero.matrixWorld)
    const dir = vertextWorldCoord.clone().sub(center)
    const raycaster = new THREE.Raycaster(center, dir.normalize())
    const intersection = raycaster.intersectObjects([...wallGroup.children, boundary, fixedBlock])
    if (intersection.length) {
      if (intersection[0].distance < dir.length()) {
        hero.position.set(...hero.userData.oldPosition)
      }
    }
  }
}
function animate () {
  requestAnimationFrame(animate)
  render()
}
function render () {
  const delta = clock.getDelta()
  renderer.render(scene, camera)
  controlHeroMove(delta)
  // const matrix = new THREE.Matrix4()
  // matrix.makeRotationX(-Math.PI / 20)
  // hero.children[2].position.applyMatrix4(matrix)
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
