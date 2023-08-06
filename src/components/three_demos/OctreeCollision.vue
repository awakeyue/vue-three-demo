<script setup>
import * as THREE from 'three'
import { Vector3 } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Octree } from 'three/examples/jsm/math/Octree'
import { OctreeHelper } from 'three/examples/jsm/helpers/OctreeHelper'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { ref, onMounted } from 'vue'

const container = ref()
let scene, camera, renderer, control
let box, boxBounding, boxBoundingHelper, wallBounding, wallBoundingHelper
let stats
const ballsBoundings = []
const ballsBoundingHelpers = []
const keyboardState = {}
const clock = new THREE.Clock()
function initThree () {
  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.set(0, 20, 20)
  camera.lookAt(new Vector3())

  const fillLight1 = new THREE.HemisphereLight(0xffffbb, 0x080820, 1)
  fillLight1.position.set(40, 30, 30)
  scene.add(fillLight1)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(-5, 25, -1)
  scene.add(directionalLight)
  scene.add(new THREE.AmbientLight(0xffffff, 0.6))

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  container.value.appendChild(renderer.domElement)

  control = new OrbitControls(camera, renderer.domElement)
  control.enableDamping = true

  stats = new Stats()
  container.value.appendChild(stats.domElement)
}

function addObject () {
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshBasicMaterial({ color: 0xf1f1f1, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
  )
  plane.rotateX(-Math.PI / 2)
  scene.add(plane)

  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(2, 5, 10),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  )
  wall.translateY(1)
  wall.translateX(4)
  wallBounding = new THREE.Box3()
  wallBounding.setFromObject(wall)
  wallBoundingHelper = new THREE.Box3Helper(wallBounding, 0xff99ff)
  scene.add(wall, wallBoundingHelper)

  box = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.MeshBasicMaterial({ color: 0xff00ff })
  )
  box.translateY(1)
  boxBounding = new THREE.Box3()
  boxBounding.setFromObject(box)
  boxBoundingHelper = new THREE.Box3Helper(boxBounding, 0xffffff)
  scene.add(box, boxBoundingHelper)

  const count = 1000

  const balls = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load('/public/game/textures/brick.png') }),
    count
  )
  for (let i = 0; i < count; i++) {
    ballsBoundings[i] = new THREE.Box3()
    ballsBoundingHelpers[i] = new THREE.Box3Helper(ballsBoundings[i], 0xffff000)
    const tempObj = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    )
    tempObj.position.set(
      Math.random() * 40 - 20,
      Math.random() * 10 - 5,
      Math.random() * 40 - 20
    )
    scene.add(tempObj)
    // tempObj.updateMatrix()
    // balls.setMatrixAt(i, tempObj.matrix.clone())
    // ballsBoundings[i].setFromObject(tempObj)
  }
  console.log(balls)
  scene.add(balls)
  // scene.add(...ballsBoundingHelpers)

  // const octreeWorld = new Octree()
  // octreeWorld.capsuleIntersect()
}

function initEventListener () {
  window.addEventListener('keydown', (e) => {
    keyboardState[e.key] = true
  })
  window.addEventListener('keyup', (e) => {
    keyboardState[e.key] = false
  })
}

function handleMove (delta) {
  const speed = 5
  if (keyboardState['w']) {
    box.translateZ(-delta * speed)
  }
  if (keyboardState['s']) {
    box.translateZ(delta * speed)
  }
  if (keyboardState['a']) {
    box.translateX(-delta * speed)
  }
  if (keyboardState['d']) {
    box.translateX(delta * speed)
  }
  if (keyboardState['ArrowRight']) {
    box.rotateY(delta * Math.PI)
  }
  if (keyboardState['ArrowLeft']) {
    box.rotateY(-delta * Math.PI)
  }
  if (boxBounding.intersectsBox(wallBounding)) {
    console.log('wallBounding相交')
  }
  ballsBoundings.forEach(ballsBounding => {
    if (boxBounding.intersectsBox(ballsBounding)) {
      console.log('ballsBounding相交')
    }
  })
}

function render () {
  const delta = clock.getDelta()
  renderer.render(scene, camera)
  control.update()
  stats.update()
  handleMove(delta)
  boxBounding.setFromObject(box)
}

function animate () {
  requestAnimationFrame(animate)
  render()
}

onMounted(() => {
  initThree()
  initEventListener()
  addObject()
  animate()
})
</script>

<template>
  <div ref="container" id="container"></div>
</template>

<style>
#container {
  width: 100vw;
  height: 100vh;
}
</style>
