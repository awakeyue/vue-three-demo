<script setup>
import * as THREE from 'three'
import { Vector2, Vector3 } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js'
import gsap from 'gsap'
import { onMounted, ref } from 'vue'
import vrHouseData from '../mock/vrHouse.json'
const container = ref()
let scene, camera, renderer, labelRenderer
let controls, aniMixer
const pointer = new Vector2()
const raycaster = new THREE.Raycaster()

onMounted(() => {
  init()
  animate()
})
function init () {
  // 场景
  scene = new THREE.Scene()

  // 相机
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000)
  camera.position.set(0.1, 0.1, 0.1)

  // - 光
  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  // const plight = new THREE.PointLight(0xffffff, 0.8)
  // plight.position.set(100, 100, 100)
  // scene.add(plight)

  // - animate
  aniMixer = new THREE.AnimationMixer(scene)

  // - add object
  addObject()

  // 渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  container.value.appendChild(renderer.domElement)

  // label渲染器
  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(window.innerWidth, window.innerHeight)
  labelRenderer.domElement.style.position = 'absolute'
  labelRenderer.domElement.style.top = '0px'
  container.value.appendChild(labelRenderer.domElement)

  // - control
  controls = new OrbitControls(camera, labelRenderer.domElement)
  controls.enableDamping = true
  // - resize
  window.addEventListener('resize', handleResize)

  // pointmove
  window.addEventListener('pointerdown', onClick)

  // - help
  // scene.add(new THREE.AxesHelper(100))

  // 动画
  const clip = new THREE.AnimationClip('default', 2, [
    new THREE.KeyframeTrack('dot.scale', [0, 1], [0.5, 0.5, 0.5, 1.5, 1.5, 1.5]),
    new THREE.KeyframeTrack('dot.scale', [1, 2], [1.5, 1.5, 1.5, 0.5, 0.5, 0.5])
  ])
  const aniAction = aniMixer.clipAction(clip)
  aniAction.setLoop(true)
  aniAction.play()
}
const y = 0
const spritesConfig = {
  客厅: [
    {
      position: [-1.5, y, -4],
      target: '卧室二'
    },
    {
      position: [1.8, y, -4],
      target: '卧室一'
    },
    {
      position: [3.8, y, -4],
      target: '洗手台'
    },
    {
      position: [2, y, 2],
      target: '阳台'
    },
    {
      position: [4, y, -0.4],
      target: '厨房'
    },
    {
      position: [4, y, -2.3],
      target: '玄关'
    }
  ],
  卧室二: [
    {
      position: [-2, y, 0],
      target: '客厅'
    }
  ],
  卧室一: [
    {
      position: [-2, y, 0],
      target: '客厅'
    }
  ],
  洗手台: [
    {
      position: [-2, y, 0],
      target: '客厅'
    },
    {
      position: [2, y, 0.5],
      target: '卫生间'
    },
    {
      position: [0, y, 2],
      target: '书房'
    }
  ],
  卫生间: [
    {
      position: [-2, y, 0],
      target: '洗手台'
    }
  ],
  书房: [
    {
      position: [-1, y, 0],
      target: '洗手台'
    }
  ],
  阳台: [
    {
      position: [-1, y, 0],
      target: '客厅'
    }
  ],
  厨房: [
    {
      position: [-1, y, 0],
      target: '客厅'
    }
  ],
  玄关: [
    {
      position: [1, y, 0],
      target: '客厅'
    }
  ]
}
// 给房间中创建传送点
function crateSprites (roomName, room) {
  const configs = spritesConfig[roomName]
  // const map = new THREE.TextureLoader().load('/public/test2.jpg')
  configs.forEach(({ position, target }) => {
    const canvasMap = new THREE.CanvasTexture(createTextTexture(target))
    const spriteMaterial = new THREE.SpriteMaterial({
      map: canvasMap
    })
    console.log(spriteMaterial)
    const spt = new THREE.Sprite(spriteMaterial)
    spt.name = target
    spt.position.set(...position)
    spt.userData.target = target
    room.add(spt)
  })
}

function createRoom (roomItem) {
  // 将之前创建的room隐藏
  // 如果当前要渲染的room已经存在，只是未被渲染，则渲染
  let roomExist = false
  scene.children.forEach(model => {
    if (roomItem.Name === model.name) {
      model.visible = true
      roomExist = true
      // canvas纹理有问题，父盒子transparent设为true，透明背景会变黑色 ---------------------------------------
      model.material.forEach(item => { item.transparent = true })
      gsap.from(model.material, {
        opacity: 0,
        duration: 1,
        onComplete () {
          model.material.forEach(item => { item.transparent = false })
        }
      })
    } else {
      if (['Mesh'].includes(model.type)) {
        model.visible = false
      }
    }
  })

  // room已存在，不需要继续创建
  if (roomExist) { return }

  const loader = new THREE.TextureLoader()
  const urls = roomItem.PanoImagesUrl
  const materials = []
  urls.forEach(url => {
    materials.push(new THREE.MeshBasicMaterial({
      map: loader.load(url),
      side: THREE.BackSide
      // transparent: true
    }))
  })
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(10, 10, 10),
    materials
  )

  room.name = roomItem.Name
  crateSprites(roomItem.Name, room)
  scene.add(room)
  room.material.transparent = true
  room.material.forEach(item => { item.transparent = true })
  gsap.from(room.material, {
    opacity: 0,
    duration: 1,
    onComplete () {
      room.material.forEach(item => { item.transparent = false })
    }
  })
}

function addObject () {
  const roomItem = vrHouseData.find(item => item.Name === '客厅')
  createRoom(roomItem)
}

function createTextTexture (text) {
  const canvas = document.createElement('canvas')
  canvas.width = 100
  canvas.height = 100
  const ctx = canvas.getContext('2d')
  ctx.font = '30px sans-serif'
  ctx.arc(50, 50, 50, 0, Math.PI * 2)
  ctx.fillStyle = '#1580ff'
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 50, 50)
  return canvas
}

function onClick (event) {
  // 将鼠标位置归一化为设备坐标。x 和 y 方向的取值范围是 (-1 to +1)
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1

  raycaster.setFromCamera(pointer, camera)
  // 和射线相交的物体一定要过滤，否则visible===false的物体也会触发
  const intersects = raycaster.intersectObjects(scene.children.filter(item => item.type !== 'AxesHelper' && item.visible === true))
  if (intersects.length > 0) {
    const intersect = intersects[0]
    if (intersect.object.type === 'Sprite' && intersect) {
      // console.log(intersect.object.userData.target)
      const targetName = intersect.object.name
      const roomItem = vrHouseData.find(item => item.Name === targetName)
      createRoom(roomItem)
    }
  }
}

function handleResize () {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  labelRenderer.setSize(window.innerWidth, window.innerHeight)
}

const clock = new THREE.Clock()
function animate () {
  requestAnimationFrame(animate)
  render()
}
function render () {
  renderer.render(scene, camera)
  labelRenderer.render(scene, camera)
  controls.update()
  // aniMixer.update(clock.getDelta())
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
