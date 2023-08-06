<script setup>
// 散落的五彩玻璃
import { onMounted, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
const threeContainer = ref()
onMounted(() => {
  const width = threeContainer.value.offsetWidth
  const height = threeContainer.value.offsetHeight
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(75, width / height, 1, 1000)

  // 环境光
  scene.add(new THREE.AmbientLight(0xffffff, 0.5))
  // 光
  const light = new THREE.SpotLight(0xffffff, 1)
  light.castShadow = true
  light.position.set(10, 10, 10)
  light.castShadow = true
  scene.add(light)
  console.log(light.shadow)
  camera.position.set(10, 10, 0)
  camera.lookAt(0, 0, 0)
  const renderer = new THREE.WebGLRenderer()
  renderer.setSize(width, height)
  renderer.shadowMap.enabled = true
  // renderer.shadowMap.type = THREE.PCFSoftShadowMap
  threeContainer.value.appendChild(renderer.domElement)

  // 添加辅助坐标
  scene.add(new THREE.AxesHelper(1000))
  scene.add(new THREE.CameraHelper(light.shadow.camera))
  // 添加球体
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(2, 50),
    new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.1,
      metalness: 0.7
    })
  )
  sphere.castShadow = true
  sphere.receiveShadow = false
  scene.add(sphere)

  // 添加平面
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0xffffff
    })
  )
  plane.rotation.set(-Math.PI / 2, 0, 0)
  plane.position.set(0, -4, 0)
  plane.receiveShadow = true
  scene.add(plane)
  // 使用gui
  const gui = new GUI()
  const gui1 = gui.addFolder('sphere')
  gui1.add(sphere.position, 'x').min(0).max(100)
  gui1.add(sphere.position, 'y').min(0).max(100)
  gui1.add(sphere.position, 'z').min(0).max(100)
  const gui2 = gui.addFolder('camera')
  gui2.add(camera, 'fov').min(30).max(100).onChange(() => camera.updateProjectionMatrix())
  const gui3 = gui.addFolder('光照')
  gui3.add(light.position, 'x').min(0).max(100)
  gui3.add(light.position, 'y').min(0).max(100)
  gui3.add(light.shadow, 'radius').min(0).max(10)
  gui3.add(light, 'intensity').min(0).max(1).step(0.01)
  gui3.add(light, 'angle').min(0).max(Math.PI / 2).step(0.01)

  const controls = new OrbitControls(camera, renderer.domElement)
  // controls.autoRotate = true
  // controls.autoRotateSpeed = 5
  controls.enableDamping = true
  function render () {
    requestAnimationFrame(render)
    controls.update()
    renderer.render(scene, camera)
  }
  render()
  window.addEventListener('resize', () => {
    const width = threeContainer.value?.offsetWidth || 0
    const height = threeContainer.value?.offsetHeight || 0
    // 修改相机参数，宽高比
    camera.aspect = width / height
    // 更新投影的变换矩阵
    camera.updateProjectionMatrix()
    // 重新设置渲染器尺寸
    renderer.setSize(width, height)
    // 设置渲染器的像素比
    renderer.setPixelRatio(window.devicePixelRatio)
  })
})
</script>

<template>
  <div class="container" ref="threeContainer">

  </div>
</template>

<style lang="scss" scoped>
  .container {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }
</style>
