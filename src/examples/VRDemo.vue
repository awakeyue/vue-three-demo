<script setup>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'
import { Water } from 'three/examples/jsm/objects/Water'
import { VRButton } from 'three/addons/webxr/VRButton.js'
import { onMounted, onBeforeUnmount, ref } from 'vue'

const container = ref()
let scene, camera, renderer
let controls, water

onMounted(() => {
  init()
  animate()
})
function init () {
  // create scene
  scene = new THREE.Scene()
  // create camera
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000)
  camera.position.set(200, 200, 200)
  camera.lookAt(new THREE.Vector3(0, 0, 0))
  camera.updateProjectionMatrix()
  addObject()

  // + light
  scene.add(new THREE.AmbientLight(0xffffff, 0.6))

  const pointLight = new THREE.PointLight(0xffffff, 0.8)
  pointLight.position.set(0, 38, -100)
  scene.add(pointLight)
  // create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  container.value.appendChild(renderer.domElement)

  renderer.xr.enabled = true

  // controller
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.maxDistance = 500

  // resize change
  window.addEventListener('resize', handleResizeChange)

  // gui
  const gui = new GUI()
  gui.add(pointLight.position, 'x', -100, 100)
  gui.add(pointLight.position, 'y', -100, 100)
  gui.add(pointLight.position, 'z', -100, 100)

  const btn = VRButton.createButton(renderer)
  document.body.appendChild(btn)

  onBeforeUnmount(() => {
    document.body.removeChild(btn)
    gui && gui.destroy()
  })
}

function animate () {
  renderer.setAnimationLoop(render)
}

function render () {
  renderer.render(scene, camera)
  /* eslint-disable */
  water.material.uniforms['time'].value += 0.02
    /* eslint-enable */
}

function handleResizeChange () {
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)

  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
}

function addObject () {
  new RGBELoader().load('/public/hdr/belfast_sunset_puresky_4k.hdr', texture => {
    texture.mapping = THREE.EquirectangularReflectionMapping

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(500, 64, 64),
      new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide
      })
    )
    // sky.geometry.scale(-1, 1, 1)
    scene.add(sky)
  })
  // water
  water = new Water(
    new THREE.CircleGeometry(600, 64),
    {
      textureWidth: 512,
      textureHeight: 512,
      color: 0x00c0ff,
      waterNormals: new THREE.TextureLoader().load('/textures/waternormals.jpg', texture => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      }),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      distortionScale: 3.7
    }
  )
  water.rotateX(-Math.PI / 2)
  scene.add(water)

  new FBXLoader().load('/public/model/uploads_files_928163_nature+island.fbx', group => {
    group.scale.set(0.05, 0.05, 0.05)
    scene.add(group)
  })
}

</script>

<template>
  <div ref="container" class="container"></div>
</template>

<style>
  .container {
    overflow: hidden;
  }
</style>
